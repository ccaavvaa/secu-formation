import { mkdirSync } from 'node:fs';
import path from 'node:path';
import DatabaseConstructor, { type Database as DatabaseInstance, type Statement as PreparedStatement } from 'better-sqlite3';

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
    singletonDb = db;

    db.pragma('journal_mode = WAL');
    executeParameterizedQuery(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      [],
    );
    executeParameterizedQuery(
      `CREATE TABLE IF NOT EXISTS messages2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      [],
    );
  }

  return singletonDb;
}

type QueryResult =
  | {
    kind: 'rows';
    rows: unknown[];
  }
  | {
    kind: 'run';
    changes: number;
    lastInsertRowid: number;
  };

export function executeParameterizedQuery(sql: string, params: unknown[]): QueryResult {
  const db = getDatabase();
  let statement: PreparedStatement<unknown[], unknown>;

  try {
    statement = db.prepare(sql) as PreparedStatement<unknown[], unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isMultiStatement = message.includes('contains more than one statement');

    if (isMultiStatement && params.length === 0) {
      db.exec(sql);
      const lastRow = db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number | bigint } | undefined;
      const changesRow = db.prepare('SELECT changes() AS changes').get() as { changes: number } | undefined;
      return {
        kind: 'run',
        changes: changesRow?.changes ?? 0,
        lastInsertRowid: Number(lastRow?.id ?? 0),
      };
    }

    throw error;
  }

  if (statement.reader) {
    const rows = statement.all(...params);
    return { kind: 'rows', rows };
  }

  const result = statement.run(...params);
  return {
    kind: 'run',
    changes: result.changes,
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}
