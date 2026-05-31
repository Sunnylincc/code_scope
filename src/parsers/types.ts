export type SymbolKind = "function" | "class" | "method" | "variable" | "export";

export interface ParseInput {
  path: string;
  content: string;
  language: string;
}

export interface ParsedSymbol {
  name: string;
  kind: SymbolKind;
  startLine: number;
  endLine: number;
  signature: string;
  snippet: string;
}

export interface ParsedImport {
  source: string;
  importedName: string | null;
  rawText: string;
}

export interface UnresolvedRelationship {
  fromSymbolName: string;
  toSymbolName: string;
  relationshipType: "calls" | "references";
  confidence: number;
}

export interface ParseResult {
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  relationships: UnresolvedRelationship[];
  warnings: string[];
}

export interface LanguageParser {
  language: string;
  extensions: string[];
  parseFile(input: ParseInput): ParseResult;
}
