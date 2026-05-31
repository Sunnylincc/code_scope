import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { databasePath } from "../config/config.js";

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bind(sql: string, params: unknown[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => sqlValue(params[i++]));
}

function normalizeSql(sql: string): string { return sql.trim().replace(/;?\s*$/, ";"); }

export class Db {
  constructor(public file: string) {}
  exec(sql: string): void { execFileSync("sqlite3", [this.file], { input: sql, stdio: ["pipe", "pipe", "pipe"] }); }
  prepare(sql: string) {
    return {
      run: (...params: unknown[]) => {
        const statement = bind(normalizeSql(sql), params);
        const out = execFileSync("sqlite3", ["-json", this.file], { input: `${statement}\nSELECT last_insert_rowid() AS lastInsertRowid;`, encoding: "utf8" });
        const rows = out.trim() ? JSON.parse(out) : [];
        return { lastInsertRowid: Number(rows.at(-1)?.lastInsertRowid ?? 0) };
      },
      get: (...params: unknown[]) => {
        const rows = this.query(sql, params);
        return rows[0];
      },
      all: (...params: unknown[]) => this.query(sql, params)
    };
  }
  query(sql: string, params: unknown[] = []): any[] {
    const statement = bind(normalizeSql(sql), params);
    const out = execFileSync("sqlite3", ["-json", this.file], { input: statement, encoding: "utf8" });
    return out.trim() ? JSON.parse(out) : [];
  }
  transaction<T extends (...args: any[]) => any>(fn: T): T { return ((...args: any[]) => fn(...args)) as T; }
  pragma(sql: string): void { this.exec(`PRAGMA ${sql};`); }
  close(): void {}
}

export function openDatabase(root: string): Db {
  const dbFile = databasePath(root);
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  return new Db(dbFile);
}

export function initializeDatabase(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL UNIQUE, language TEXT NOT NULL, hash TEXT NOT NULL, indexed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS symbols (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, language TEXT NOT NULL, start_line INTEGER NOT NULL, end_line INTEGER NOT NULL, signature TEXT NOT NULL, snippet TEXT NOT NULL, FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS imports (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER NOT NULL, source TEXT NOT NULL, imported_name TEXT, raw_text TEXT NOT NULL, FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS relationships (id INTEGER PRIMARY KEY AUTOINCREMENT, from_symbol_id INTEGER NOT NULL, to_symbol_id INTEGER NOT NULL, relationship_type TEXT NOT NULL, confidence REAL NOT NULL, FOREIGN KEY(from_symbol_id) REFERENCES symbols(id) ON DELETE CASCADE, FOREIGN KEY(to_symbol_id) REFERENCES symbols(id) ON DELETE CASCADE);
  `);
  ensureSearchIndex(db);
}

export function ensureSearchIndex(db: Db): void {
  try { db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(kind, name, path, content, tokenize='unicode61');"); setMeta(db, "fts5", "enabled"); }
  catch { db.exec("CREATE TABLE IF NOT EXISTS search_index (kind TEXT, name TEXT, path TEXT, content TEXT);"); setMeta(db, "fts5", "fallback"); }
}
export function setMeta(db: Db, key: string, value: string): void { db.prepare("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value); }
export function getMeta(db: Db, key: string): string | null { const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined; return row?.value ?? null; }
export function resetIndex(db: Db): void { db.exec("DELETE FROM relationships; DELETE FROM imports; DELETE FROM symbols; DELETE FROM files; DELETE FROM search_index;"); }
export function status(db: Db) {
  const fileCount = Number((db.prepare("SELECT COUNT(*) AS count FROM files").get() as { count: number }).count);
  const symbolCount = Number((db.prepare("SELECT COUNT(*) AS count FROM symbols").get() as { count: number }).count);
  const relationshipCount = Number((db.prepare("SELECT COUNT(*) AS count FROM relationships").get() as { count: number }).count);
  return { fileCount, symbolCount, relationshipCount, lastIndexedAt: getMeta(db, "last_indexed_at") };
}
