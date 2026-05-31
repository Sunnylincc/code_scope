import type { Db } from "../db/database.js";
import type { SearchResult } from "../search/search.js";

export interface RelationshipResult extends SearchResult { relationshipType: string; confidence: number; sourceName: string; }

export function callers(db: Db, symbol: string): RelationshipResult[] {
  return db.prepare(`
    SELECT froms.name, froms.kind, f.path, froms.start_line AS startLine, froms.end_line AS endLine, froms.snippet, froms.language,
           r.relationship_type AS relationshipType, r.confidence, tos.name AS sourceName
    FROM relationships r
    JOIN symbols tos ON tos.id = r.to_symbol_id
    JOIN symbols froms ON froms.id = r.from_symbol_id
    JOIN files f ON f.id = froms.file_id
    WHERE tos.name = ?
    ORDER BY r.confidence DESC
  `).all(symbol) as RelationshipResult[];
}

export function callees(db: Db, symbol: string): RelationshipResult[] {
  return db.prepare(`
    SELECT tos.name, tos.kind, f.path, tos.start_line AS startLine, tos.end_line AS endLine, tos.snippet, tos.language,
           r.relationship_type AS relationshipType, r.confidence, froms.name AS sourceName
    FROM relationships r
    JOIN symbols froms ON froms.id = r.from_symbol_id
    JOIN symbols tos ON tos.id = r.to_symbol_id
    JOIN files f ON f.id = tos.file_id
    WHERE froms.name = ?
    ORDER BY r.confidence DESC
  `).all(symbol) as RelationshipResult[];
}

export function importsForFile(db: Db, path: string): Array<{ source: string; importedName: string | null; rawText: string }> {
  return db.prepare("SELECT i.source, i.imported_name AS importedName, i.raw_text AS rawText FROM imports i JOIN files f ON f.id = i.file_id WHERE f.path = ? LIMIT 20").all(path) as Array<{ source: string; importedName: string | null; rawText: string }>;
}
