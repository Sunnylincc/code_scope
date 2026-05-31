import type { ParsedSymbol, SymbolKind, UnresolvedRelationship } from "./types.js";

export function lineOf(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

export function buildSnippet(lines: string[], startLine: number, endLine: number, radius = 1): string {
  const start = Math.max(1, startLine - radius);
  const end = Math.min(lines.length, endLine + radius);
  return lines.slice(start - 1, end).join("\n").trim();
}

export function findBlockEnd(lines: string[], startLine: number): number {
  let braceBalance = 0;
  let sawBrace = false;
  for (let i = startLine - 1; i < lines.length; i++) {
    for (const ch of lines[i] ?? "") {
      if (ch === "{") { braceBalance++; sawBrace = true; }
      if (ch === "}") braceBalance--;
    }
    if (sawBrace && braceBalance <= 0) return i + 1;
    if (!sawBrace && i > startLine + 2) return startLine;
  }
  return startLine;
}

export function dedupeSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
  const seen = new Set<string>();
  return symbols.filter((symbol) => {
    const key = `${symbol.name}:${symbol.kind}:${symbol.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ignoredCalls = new Set(["if", "for", "while", "switch", "catch", "function", "return", "typeof", "console", "super"]);

export function extractCallRelationships(content: string, symbols: ParsedSymbol[]): UnresolvedRelationship[] {
  const lines = content.split(/\r?\n/);
  const relationships: UnresolvedRelationship[] = [];
  for (const symbol of symbols) {
    const body = lines.slice(symbol.startLine - 1, symbol.endLine).join("\n");
    const calls = body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g);
    for (const match of calls) {
      const callee = match[1];
      if (!callee || callee === symbol.name || ignoredCalls.has(callee)) continue;
      relationships.push({ fromSymbolName: symbol.name, toSymbolName: callee, relationshipType: "calls", confidence: 0.55 });
    }
  }
  return relationships;
}

export function makeSymbol(name: string, kind: SymbolKind, line: number, lines: string[]): ParsedSymbol {
  const endLine = findBlockEnd(lines, line);
  const signature = (lines[line - 1] ?? "").trim();
  return { name, kind, startLine: line, endLine, signature, snippet: buildSnippet(lines, line, endLine) };
}
