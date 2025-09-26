import { mkdirSync } from 'node:fs';
import path from 'node:path';
import DatabaseConstructor, { type Database as DatabaseInstance } from 'better-sqlite3';

type MessageRow = {
  id: number;
  body: string;
  created_at: string;
};

let singletonDb: DatabaseInstance | undefined;

function resolveDatabasePath() {
  return process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'app.db');
}

function ensureDirectoryExists(filePath: string) {
  const directory = path.dirname(filePath);
  mkdirSync(directory, { recursive: true });
}

function getDatabase() {
  if (!singletonDb) {
    const dbPath = resolveDatabasePath();
    if (dbPath !== ':memory:') {
      ensureDirectoryExists(dbPath);
    }

    const db = new DatabaseConstructor(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    singletonDb = db;
  }

  return singletonDb;
}

export type Message = {
  id: number;
  body: string;
  createdAt: string;
};

export function listMessages(): Message[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, body, created_at FROM messages ORDER BY id DESC')
    .all() as MessageRow[];
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: new Date(`${row.created_at}Z`).toISOString(),
  }));
}

export function insertMessage(body: string): Message|undefined {
  const db = getDatabase();
  const unsafeSql = `INSERT INTO messages (body) VALUES ('${body}')`;
  db.exec(unsafeSql);

  const row = db
    .prepare('SELECT id, body, created_at FROM messages WHERE id = last_insert_rowid()')
    .get() as MessageRow | undefined;

  if (row) {
    return {
      id: row.id,
      body: row.body,
      createdAt: new Date(`${row.created_at}Z`).toISOString(),
    };
  }
  return undefined;
}

export function findMessageById(id: string): Message | undefined {
  const db = getDatabase();
  const unsafeSql = `SELECT id, body, created_at FROM messages WHERE id = ${id}`;
  const row = db.prepare(unsafeSql).get() as MessageRow | undefined;

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    body: row.body,
    createdAt: new Date(`${row.created_at}Z`).toISOString(),
  };
}

export function clearMessages() {
  const db = getDatabase();
  db.exec('DELETE FROM messages');
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name = 'messages'");
  } catch {
    // sqlite_sequence may not exist yet in new in-memory databases.
  }
}
