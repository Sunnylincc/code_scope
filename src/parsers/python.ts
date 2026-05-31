import type { LanguageParser, ParsedImport, ParsedSymbol } from "./types.js";
import { buildSnippet, dedupeSymbols, extractCallRelationships } from "./helpers.js";

function pythonBlockEnd(lines: string[], startLine: number): number {
  const base = (lines[startLine - 1]?.match(/^\s*/) ?? [""])[0].length;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() && (line.match(/^\s*/) ?? [""])[0].length <= base) return i;
  }
  return lines.length;
}

export class PythonParser implements LanguageParser {
  language = "python";
  extensions = [".py"];

  parseFile(input: { path: string; content: string; language: string }) {
    const lines = input.content.split(/\r?\n/);
    const symbols: ParsedSymbol[] = [];
    const imports: ParsedImport[] = [];
    lines.forEach((line, idx) => {
      const importMatch = line.match(/^\s*(?:from\s+([\w.]+)\s+import\s+(.+)|import\s+(.+))\s*$/);
      if (importMatch) imports.push({ source: importMatch[1] ?? importMatch[3] ?? "", importedName: importMatch[2] ?? null, rawText: line.trim() });
      const def = line.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/);
      const cls = line.match(/^\s*class\s+([A-Za-z_]\w*)\b/);
      const match = def ?? cls;
      if (match?.[1]) {
        const startLine = idx + 1;
        const endLine = pythonBlockEnd(lines, startLine);
        symbols.push({ name: match[1], kind: def ? "function" : "class", startLine, endLine, signature: line.trim(), snippet: buildSnippet(lines, startLine, endLine) });
      }
    });
    const uniqueSymbols = dedupeSymbols(symbols);
    return { symbols: uniqueSymbols, imports, relationships: extractCallRelationships(input.content, uniqueSymbols), warnings: [] };
  }
}
