import assert from 'node:assert/strict';
import test from 'node:test';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../lib/app.js';
import { VulnerableMessageRepository, SecureMessageRepository } from '../lib/message-repository.js';

process.env.SQLITE_DB_PATH = ':memory:';

test('API avec VulnerableMessageRepository', async (t) => {
  let app: Express;
  const repository = new VulnerableMessageRepository();

  t.beforeEach(() => {
    repository.clearMessages();
    app = createApp(repository);
  });

  await t.test('POST /messages persiste le corps nettoyé et retourne le payload', async () => {
    // Test de fonctionnement normal : vérifie que les espaces sont correctement supprimés
    // et que le message est persisté dans la base de données
    const response = await request(app)
      .post('/messages')
      .send({ body: '   Message de test   ' })
      .expect(201);

    assert.equal(response.body.body, 'Message de test');
    assert.equal(typeof response.body.id, 'number');
  });

  await t.test('POST /messages rejette les payloads manquants ou vides', async () => {
    // Test de validation : vérifie que l'API rejette correctement les corps de message vides
    // Cette validation basique ne protège PAS contre les injections SQL
    await request(app)
      .post('/messages')
      .send({ body: '' })
      .expect(400)
      .expect({ error: 'Le corps du message est requis.' });

    await request(app)
      .post('/messages')
      .send({})
      .expect(400)
      .expect({ error: 'Le corps du message est requis.' });
  });

  await t.test('POST /messages le payload d\'injection efface les messages existants', async () => {
    // DÉMONSTRATION D'INJECTION SQL #1 : Suppression de données (DELETE)
    //
    // Ce test illustre comment un attaquant peut exploiter insertMessage() dans VulnerableMessageRepository
    // qui construit la requête avec : INSERT INTO messages (body) VALUES ('${body}')
    //
    // Payload malveillant : '); DELETE FROM messages; --
    //
    // Requête SQL résultante après concaténation :
    //   INSERT INTO messages (body) VALUES (''); DELETE FROM messages; --')
    //
    // Décomposition :
    //   1. VALUES ('') - Ferme prématurément la chaîne avec ')
    //   2. ; - Termine l'instruction INSERT
    //   3. DELETE FROM messages - Exécute une seconde requête destructrice
    //   4. ; -- - Termine le DELETE et commente le reste avec --
    //
    // Impact : Tous les messages de la table sont supprimés
    // Contre-mesure : Utiliser des requêtes paramétrées au lieu de la concaténation de chaînes
    await request(app)
      .post('/messages')
      .send({ body: 'Premier message sûr' })
      .expect(201);

    const maliciousBody = `'); DELETE FROM messages; --`;
    await request(app)
      .post('/messages')
      .send({ body: maliciousBody })
      .expect(500);

    const listResponse = await request(app)
      .get('/messages')
      .expect(200);

    assert(Array.isArray(listResponse.body));
    assert.equal(listResponse.body.length, 0);
  });

  await t.test('GET /messages retourne les messages stockés', async () => {
    // Test de fonctionnement normal : vérifie que listMessages() retourne correctement
    // les messages existants. Cette fonction utilise des requêtes paramétrées et est SÉCURISÉE
    await request(app)
      .post('/messages')
      .send({ body: 'Stocké' })
      .expect(201);

    const response = await request(app)
      .get('/messages')
      .expect(200);

    assert(Array.isArray(response.body));
    assert.equal(response.body.length, 1);
    const message = response.body[0];
    assert.equal(message.body, 'Stocké');
    assert.equal(typeof message.id, 'number');
    assert.equal(typeof message.createdAt, 'string');
  });

  await t.test('GET /messages/:id retourne la ressource par id', async () => {
    // Test de fonctionnement normal : vérifie la récupération d'un message par son ID
    // Lorsque l'ID est un nombre valide, la fonction fonctionne correctement
    const createResponse = await request(app)
      .post('/messages')
      .send({ body: 'Message cible' })
      .expect(201);

    const response = await request(app)
      .get(`/messages/${createResponse.body.id}`)
      .expect(200);

    assert.equal(response.body.id, createResponse.body.id);
    assert.equal(response.body.body, 'Message cible');
  });

  await t.test('GET /messages/:id exécute du SQL brut lorsque l\'id est injecté', async () => {
    // DÉMONSTRATION D'INJECTION SQL #2 : Contournement de la condition WHERE (Boolean-based)
    //
    // Ce test exploite findMessageById() dans VulnerableMessageRepository
    // qui construit la requête avec : WHERE id = ${id}
    //
    // Payload malveillant : 0 OR 1=1
    //
    // Requête SQL résultante après concaténation :
    //   SELECT id, body, created_at FROM messages WHERE id = 0 OR 1=1
    //
    // Décomposition :
    //   1. WHERE id = 0 - Condition toujours fausse (aucun message avec id=0)
    //   2. OR 1=1 - Condition toujours vraie, court-circuite la vérification d'ID
    //
    // Impact : Retourne le premier message disponible au lieu de rejeter la requête invalide
    // Risque : Accès non autorisé à des données, contournement de la logique métier
    // Contre-mesure : Valider strictement que l'ID est numérique ET utiliser des requêtes paramétrées
    await request(app)
      .post('/messages')
      .send({ body: 'sûr' })
      .expect(201);

    const response = await request(app)
      .get('/messages/0 OR 1=1')
      .expect(200);

    assert.equal(response.body.body, 'sûr');
  });

  await t.test('GET /messages/:id peut divulguer la définition du schéma via un payload UNION', async () => {
    // DÉMONSTRATION D'INJECTION SQL #3 : Extraction de métadonnées (UNION-based)
    //
    // Ce test exploite findMessageById() dans VulnerableMessageRepository avec une attaque UNION SELECT
    //
    // Payload malveillant :
    //   0 UNION SELECT 1, sql, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--
    //
    // Requête SQL résultante :
    //   SELECT id, body, created_at FROM messages WHERE id = 0
    //   UNION SELECT 1, sql, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--
    //
    // Décomposition :
    //   1. WHERE id = 0 - Aucun résultat de la première requête
    //   2. UNION SELECT - Combine avec une seconde requête
    //   3. 1, sql, '1970-01-01T00:00:00' - Aligne les colonnes (id, body, created_at)
    //   4. FROM sqlite_master - Table système SQLite contenant les schémas
    //   5. WHERE type='table' - Filtre pour obtenir les définitions de tables
    //   6. OFFSET 1 - Saute la première table (messages) pour obtenir messages2
    //   7. -- - Commente le reste de la requête
    //
    // Impact : Révèle la structure complète de la base de données (noms de tables, colonnes, types)
    // Risque : Reconnaissance pour des attaques plus ciblées, fuite d'informations sensibles
    // Contre-mesure : Requêtes paramétrées + validation stricte des types d'entrée
    const payload = "0 UNION SELECT 1, sql, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--";

    const response = await request(app)
      .get(`/messages/${encodeURIComponent(payload)}`)
      .expect(200);

    assert.equal(response.body.body, "CREATE TABLE messages2 (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        body TEXT NOT NULL,\n        created_at TEXT NOT NULL DEFAULT (datetime('now'))\n      )");
  });
});

test('API avec SecureMessageRepository', async (t) => {
  let app: Express;
  const repository = new SecureMessageRepository();

  t.beforeEach(() => {
    repository.clearMessages();
    app = createApp(repository);
  });

  await t.test('POST /messages persiste le corps nettoyé et retourne le payload', async () => {
    // Test de fonctionnement normal avec l'implémentation sécurisée
    const response = await request(app)
      .post('/messages')
      .send({ body: '   Message de test   ' })
      .expect(201);

    assert.equal(response.body.body, 'Message de test');
    assert.equal(typeof response.body.id, 'number');
  });

  await t.test('POST /messages rejette les payloads manquants ou vides', async () => {
    await request(app)
      .post('/messages')
      .send({ body: '' })
      .expect(400)
      .expect({ error: 'Le corps du message est requis.' });

    await request(app)
      .post('/messages')
      .send({})
      .expect(400)
      .expect({ error: 'Le corps du message est requis.' });
  });

  await t.test('POST /messages protège contre l\'injection DELETE', async () => {
    // ✅ DÉMONSTRATION DE PROTECTION : L'implémentation sécurisée résiste à l'injection DELETE
    //
    // SecureMessageRepository utilise des requêtes paramétrées : INSERT INTO messages (body) VALUES (?)
    // Le payload malveillant est traité comme une simple chaîne de caractères
    await request(app)
      .post('/messages')
      .send({ body: 'Premier message sûr' })
      .expect(201);

    const maliciousBody = `'); DELETE FROM messages; --`;
    const maliciousResponse = await request(app)
      .post('/messages')
      .send({ body: maliciousBody })
      .expect(201);

    // Le payload malveillant est stocké littéralement dans le champ body
    assert.equal(maliciousResponse.body.body, maliciousBody);

    // Tous les messages sont toujours présents
    const listResponse = await request(app)
      .get('/messages')
      .expect(200);

    assert(Array.isArray(listResponse.body));
    assert.equal(listResponse.body.length, 2);
  });

  await t.test('GET /messages retourne les messages stockés', async () => {
    await request(app)
      .post('/messages')
      .send({ body: 'Stocké' })
      .expect(201);

    const response = await request(app)
      .get('/messages')
      .expect(200);

    assert(Array.isArray(response.body));
    assert.equal(response.body.length, 1);
    const message = response.body[0];
    assert.equal(message.body, 'Stocké');
    assert.equal(typeof message.id, 'number');
    assert.equal(typeof message.createdAt, 'string');
  });

  await t.test('GET /messages/:id retourne la ressource par id', async () => {
    const createResponse = await request(app)
      .post('/messages')
      .send({ body: 'Message cible' })
      .expect(201);

    const response = await request(app)
      .get(`/messages/${createResponse.body.id}`)
      .expect(200);

    assert.equal(response.body.id, createResponse.body.id);
    assert.equal(response.body.body, 'Message cible');
  });

  await t.test('GET /messages/:id protège contre l\'injection Boolean-based', async () => {
    // ✅ DÉMONSTRATION DE PROTECTION : L'implémentation sécurisée résiste à l'injection OR 1=1
    //
    // SecureMessageRepository utilise des requêtes paramétrées : WHERE id = ?
    // Le payload "0 OR 1=1" est traité comme une chaîne littérale, pas comme du code SQL
    await request(app)
      .post('/messages')
      .send({ body: 'sûr' })
      .expect(201);

    // Avec l'implémentation sécurisée, l'injection échoue
    await request(app)
      .get('/messages/0 OR 1=1')
      .expect(404)
      .expect({ error: 'Message non trouvé' });
  });

  await t.test('GET /messages/:id protège contre l\'injection UNION-based', async () => {
    // ✅ DÉMONSTRATION DE PROTECTION : L'implémentation sécurisée résiste à l'injection UNION SELECT
    //
    // SecureMessageRepository utilise des requêtes paramétrées : WHERE id = ?
    // Le payload UNION SELECT complet est traité comme une valeur littérale
    const payload = "0 UNION SELECT 1, sql, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--";

    // Avec l'implémentation sécurisée, l'injection échoue
    await request(app)
      .get(`/messages/${encodeURIComponent(payload)}`)
      .expect(404)
      .expect({ error: 'Message non trouvé' });
  });
});
