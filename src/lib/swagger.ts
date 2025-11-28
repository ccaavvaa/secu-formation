import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Démonstration d\'Injection SQL',
      version: '1.0.0',
      description: `
        **Projet de formation à la sécurité** démontrant des vulnérabilités d'injection SQL intentionnelles.

        ⚠️ **ATTENTION** : Cette API contient des vulnérabilités intentionnelles à des fins pédagogiques.

        ## Vulnérabilités démontrées

        - **POST /messages** - Injection SQL dans le corps du message
        - **GET /messages/:id** - Injection SQL dans le paramètre ID

        ## Endpoints sécurisés

        - **GET /messages** - Liste des messages (requête paramétrée)
      `,
      contact: {
        name: 'Support API',
      },
    },
    servers: [
      {
        url: 'http://localhost:{port}',
        description: 'Serveur de développement',
        variables: {
          port: {
            default: '3000',
            description: 'Port du serveur (configurable via PORT env)',
          },
        },
      },
    ],
    tags: [
      {
        name: 'Messages',
        description: 'Opérations sur les messages',
      },
    ],
  },
  apis: ['./src/lib/app.ts'], // Chemin vers les fichiers contenant les annotations
};

export const swaggerSpec = swaggerJsdoc(options);