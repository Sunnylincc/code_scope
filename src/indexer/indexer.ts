import fs from "node:fs";
import path from "node:path";
import type { Db } from "../db/database.js";
import { initializeDatabase, resetIndex, setMeta } from "../db/database.js";
import type { CodeScopeConfig } from "../config/config.js";
import { getParserForFile } from "../parsers/registry.js";
import { sha256 } from "../utils/hash.js";
import { isLikelyBinary, walkSourceFiles } from "../utils/files.js";

export interface IndexSummary { files: number; symbols: number; imports: number; relationships: number; warnings: string[]; }

export function indexProject(root: string, db: Db, config: CodeScopeConfig): IndexSummary {
  initializeDatabase(db);
  resetIndex(db);
  const files = walkSourceFiles(root, config.includeExtensions, config.maxFileSizeBytes);
  const warnings: string[] = [];
  let symbolCount = 0;
  let importCount = 0;
  const unresolved: Array<{ from: string; to: string; type: string; confidence: number }> = [];

  const insertFile = db.prepare("INSERT INTO files(path, language, hash, indexed_at) VALUES(?, ?, ?, ?)");
  const insertSymbol = db.prepare("INSERT INTO symbols(file_id, name, kind, language, start_line, end_line, signature, snippet) VALUES(?, ?, ?, ?, ?, ?, ?, ?)");
  const insertImport = db.prepare("INSERT INTO imports(file_id, source, imported_name, raw_text) VALUES(?, ?, ?, ?)");
  const insertSearch = db.prepare("INSERT INTO search_index(kind, name, path, content) VALUES(?, ?, ?, ?)");

  const tx = db.transaction(() => {
    for (const file of files) {
      const parser = getParserForFile(file);
      if (!parser) continue;
      const buffer = fs.readFileSync(file);
      if (isLikelyBinary(buffer)) continue;
      const content = buffer.toString("utf8");
      const rel = path.relative(root, file).split(path.sep).join("/");
      const indexedAt = new Date().toISOString();
      const fileInfo = insertFile.run(rel, parser.language, sha256(content), indexedAt);
      const fileId = Number(fileInfo.lastInsertRowid);
      const result = parser.parseFile({ path: rel, content, language: parser.language });
      warnings.push(...result.warnings.map((warning) => `${rel}: ${warning}`));
      for (const symbol of result.symbols) {
        insertSymbol.run(fileId, symbol.name, symbol.kind, parser.language, symbol.startLine, symbol.endLine, symbol.signature, symbol.snippet);
        insertSearch.run("symbol", symbol.name, rel, `${symbol.signature}\n${symbol.snippet}`);
        symbolCount++;
      }
      for (const imported of result.imports) {
        insertImport.run(fileId, imported.source, imported.importedName, imported.rawText);
        importCount++;
      }
      result.relationships.forEach((relationship) => unresolved.push({ from: relationship.fromSymbolName, to: relationship.toSymbolName, type: relationship.relationshipType, confidence: relationship.confidence }));
      insertSearch.run("file", rel, rel, content.slice(0, 4000));
    }
  });
  tx();

  let relationshipCount = 0;
  const findSymbol = db.prepare("SELECT id FROM symbols WHERE name = ? ORDER BY id LIMIT 1");
  const insertRelationship = db.prepare("INSERT INTO relationships(from_symbol_id, to_symbol_id, relationship_type, confidence) VALUES(?, ?, ?, ?)");
  const relationTx = db.transaction(() => {
    for (const item of unresolved) {
      const from = findSymbol.get(item.from) as { id: number } | undefined;
      const to = findSymbol.get(item.to) as { id: number } | undefined;
      if (from && to) { insertRelationship.run(from.id, to.id, item.type, item.confidence); relationshipCount++; }
    }
  });
  relationTx();
  setMeta(db, "last_indexed_at", new Date().toISOString());
  setMeta(db, "relationship_note", "静态关系提取可能不完整，修改代码前请读取源文件确认。");
  return { files: files.length, symbols: symbolCount, imports: importCount, relationships: relationshipCount, warnings };
}
