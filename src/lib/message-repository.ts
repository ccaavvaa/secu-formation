import { executeParameterizedQuery } from './database.js';

type MessageRow = {
  id: number;
  body: string;
  created_at: string;
};

export type Message = {
  id: number;
  body: string;
  createdAt: string;
};

/**
 * Interface définissant les opérations de persistance des messages.
 * Permet d'avoir différentes implémentations (vulnérable vs sécurisée).
 */
export interface MessageRepository {
  /**
   * Liste tous les messages par ordre décroissant d'id.
   */
  listMessages(): Message[];

  /**
   * Insère un nouveau message avec le contenu donné.
   * @param body - Le contenu du message
   * @returns Le message créé ou undefined en cas d'échec
   */
  insertMessage(body: string): Message | undefined;

  /**
   * Recherche un message par son identifiant.
   * @param id - L'identifiant du message
   * @returns Le message trouvé ou undefined
   */
  findMessageById(id: string): Message | undefined;

  /**
   * Supprime tous les messages (utilisé pour les tests).
   */
  clearMessages(): void;

  /**
   * Supprime tous les messages (route utilisateur).
   */
  deleteAllMessages(): void;
}

/**
 * Implémentation VULNÉRABLE utilisant la concaténation de chaînes.
 * ⚠️ ATTENTION : Cette implémentation contient des vulnérabilités d'injection SQL intentionnelles
 * à des fins pédagogiques. NE PAS UTILISER EN PRODUCTION.
 */
export class VulnerableMessageRepository implements MessageRepository {
  listMessages(): Message[] {
    const result = executeParameterizedQuery(
      'SELECT id, body, created_at FROM messages ORDER BY id DESC',
      [],
    );

    if (result.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu pour listMessages');
    }

    const rows = result.rows as MessageRow[];
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: new Date(`${row.created_at}Z`).toISOString(),
    }));
  }

  /**
   * ⚠️ VULNÉRABLE À L'INJECTION SQL
   * Ligne vulnérable : concatène directement le paramètre body dans la requête SQL.
   * Exemple d'attaque : body = "'); DELETE FROM messages; --"
   * Résultat : INSERT INTO messages (body) VALUES (''); DELETE FROM messages; --')
   */
  insertMessage(body: string): Message | undefined {
    const unsafeSql = `INSERT INTO messages (body) VALUES ('${body}')`;
    executeParameterizedQuery(unsafeSql, []);

    const rowResult = executeParameterizedQuery(
      'SELECT id, body, created_at FROM messages WHERE id = last_insert_rowid()',
      [],
    );

    if (rowResult.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu lors de la récupération du message inséré');
    }

    const row = (rowResult.rows as MessageRow[])[0];

    if (row) {
      return {
        id: row.id,
        body: row.body,
        createdAt: new Date(`${row.created_at}Z`).toISOString(),
      };
    }
    return undefined;
  }

  /**
   * ⚠️ VULNÉRABLE À L'INJECTION SQL
   * Ligne vulnérable : concatène directement le paramètre id dans la requête SQL.
   * Exemple d'attaque : id = "1 OR 1=1"
   * Résultat : SELECT ... WHERE id = 1 OR 1=1
   */
  findMessageById(id: string): Message | undefined {
    const unsafeSql = `SELECT id, body, created_at FROM messages WHERE id = ${id}`;
    const rowResult = executeParameterizedQuery(unsafeSql, []);

    if (rowResult.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu lors de la récupération du message par id');
    }

    const row = (rowResult.rows as MessageRow[])[0];

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      body: row.body,
      createdAt: new Date(`${row.created_at}Z`).toISOString(),
    };
  }

  clearMessages(): void {
    executeParameterizedQuery('DELETE FROM messages', []);
    try {
      executeParameterizedQuery("DELETE FROM sqlite_sequence WHERE name = 'messages'", []);
    } catch {
      // sqlite_sequence peut ne pas encore exister dans les nouvelles bases de données en mémoire.
    }
  }

  deleteAllMessages(): void {
    this.clearMessages();
  }
}

/**
 * Implémentation SÉCURISÉE utilisant les requêtes paramétrées.
 * ✅ Cette implémentation protège contre les injections SQL en utilisant
 * des paramètres liés (placeholders ?) au lieu de la concaténation.
 */
export class SecureMessageRepository implements MessageRepository {
  listMessages(): Message[] {
    const result = executeParameterizedQuery(
      'SELECT id, body, created_at FROM messages ORDER BY id DESC',
      [],
    );

    if (result.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu pour listMessages');
    }

    const rows = result.rows as MessageRow[];
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: new Date(`${row.created_at}Z`).toISOString(),
    }));
  }

  /**
   * ✅ SÉCURISÉ : Utilise un paramètre lié (?) pour le body.
   * Le paramètre est échappé automatiquement par better-sqlite3.
   * Même avec body = "'); DELETE FROM messages; --", la requête traite
   * cette valeur comme une simple chaîne de caractères.
   */
  insertMessage(body: string): Message | undefined {
    const safeSql = 'INSERT INTO messages (body) VALUES (?)';
    executeParameterizedQuery(safeSql, [body]);

    const rowResult = executeParameterizedQuery(
      'SELECT id, body, created_at FROM messages WHERE id = last_insert_rowid()',
      [],
    );

    if (rowResult.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu lors de la récupération du message inséré');
    }

    const row = (rowResult.rows as MessageRow[])[0];

    if (row) {
      return {
        id: row.id,
        body: row.body,
        createdAt: new Date(`${row.created_at}Z`).toISOString(),
      };
    }
    return undefined;
  }

  /**
   * ✅ SÉCURISÉ : Utilise un paramètre lié (?) pour l'id.
   * Le paramètre est échappé automatiquement par better-sqlite3.
   * Même avec id = "1 OR 1=1", la requête cherche littéralement
   * un id égal à "1 OR 1=1" (aucune ligne trouvée).
   */
  findMessageById(id: string): Message | undefined {
    const safeSql = 'SELECT id, body, created_at FROM messages WHERE id = ?';
    const rowResult = executeParameterizedQuery(safeSql, [id]);

    if (rowResult.kind !== 'rows') {
      throw new Error('Résultat de type rows attendu lors de la récupération du message par id');
    }

    const row = (rowResult.rows as MessageRow[])[0];

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      body: row.body,
      createdAt: new Date(`${row.created_at}Z`).toISOString(),
    };
  }

  clearMessages(): void {
    executeParameterizedQuery('DELETE FROM messages', []);
    try {
      executeParameterizedQuery("DELETE FROM sqlite_sequence WHERE name = 'messages'", []);
    } catch {
      // sqlite_sequence peut ne pas encore exister dans les nouvelles bases de données en mémoire.
    }
  }

  deleteAllMessages(): void {
    this.clearMessages();
  }
}
