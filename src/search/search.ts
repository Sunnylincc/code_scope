import type { Db } from "../db/database.js";

export interface SearchResult { name: string; kind: string; path: string; startLine: number; endLine: number; snippet: string; language: string; }

export function search(db: Db, query: string, limit = 10): SearchResult[] {
  const like = `%${query}%`;
  const rows = db.prepare(`
    SELECT s.name, s.kind, f.path, s.start_line AS startLine, s.end_line AS endLine, s.snippet, s.language
    FROM symbols s JOIN files f ON f.id = s.file_id
    WHERE s.name LIKE ? OR s.signature LIKE ? OR s.snippet LIKE ? OR f.path LIKE ?
    ORDER BY CASE WHEN s.name = ? THEN 0 WHEN s.name LIKE ? THEN 1 ELSE 2 END, f.path
    LIMIT ?
  `).all(like, like, like, like, query, `${query}%`, limit) as SearchResult[];
  return rows;
}

export function findSymbols(db: Db, name: string, limit = 10): SearchResult[] {
  return db.prepare(`
    SELECT s.name, s.kind, f.path, s.start_line AS startLine, s.end_line AS endLine, s.snippet, s.language
    FROM symbols s JOIN files f ON f.id = s.file_id
    WHERE s.name = ? OR s.name LIKE ?
    ORDER BY CASE WHEN s.name = ? THEN 0 ELSE 1 END, f.path
    LIMIT ?
  `).all(name, `%${name}%`, name, limit) as SearchResult[];
}
