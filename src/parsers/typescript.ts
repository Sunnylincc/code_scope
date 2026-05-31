import type { LanguageParser, ParsedImport, ParsedSymbol } from "./types.js";
import { dedupeSymbols, extractCallRelationships, lineOf, makeSymbol } from "./helpers.js";

// TODO: 引入更精细的语法分析以提升复杂泛型、装饰器和重载场景的识别质量。
export class TypeScriptParser implements LanguageParser {
  language = "typescript";
  extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  parseFile(input: { path: string; content: string; language: string }) {
    const lines = input.content.split(/\r?\n/);
    const symbols: ParsedSymbol[] = [];
    const imports: ParsedImport[] = [];

    for (const match of input.content.matchAll(/^\s*import\s+([^;\n]+?)\s+from\s+["']([^"']+)["'];?/gm)) {
      imports.push({ source: match[2] ?? "", importedName: (match[1] ?? "").trim(), rawText: match[0].trim() });
    }
    for (const match of input.content.matchAll(/^\s*(?:const|let|var)\s+([^=]+?)\s*=\s*require\(["']([^"']+)["']\)/gm)) {
      imports.push({ source: match[2] ?? "", importedName: (match[1] ?? "").trim(), rawText: match[0].trim() });
    }

    const patterns: Array<[RegExp, "function" | "class" | "method" | "variable"]> = [
      [/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm, "function"],
      [/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/gm, "class"],
      [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/gm, "function"],
      [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm, "variable"],
      [/^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*[{;]/gm, "method"]
    ];

    for (const [pattern, kind] of patterns) {
      for (const match of input.content.matchAll(pattern)) {
        const name = match[1];
        if (!name || ["if", "for", "while", "switch", "catch"].includes(name)) continue;
        symbols.push(makeSymbol(name, kind, lineOf(input.content, match.index ?? 0), lines));
      }
    }

    const uniqueSymbols = dedupeSymbols(symbols);
    return { symbols: uniqueSymbols, imports, relationships: extractCallRelationships(input.content, uniqueSymbols), warnings: [] };
  }
}
