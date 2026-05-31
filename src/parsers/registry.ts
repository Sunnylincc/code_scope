import path from "node:path";
import type { LanguageParser } from "./types.js";
import { TypeScriptParser } from "./typescript.js";
import { PythonParser } from "./python.js";

export const parsers: LanguageParser[] = [new TypeScriptParser(), new PythonParser()];

export function getParserForFile(filePath: string): LanguageParser | null {
  const ext = path.extname(filePath).toLowerCase();
  return parsers.find((parser) => parser.extensions.includes(ext)) ?? null;
}

export function supportedLanguages(): string[] {
  return [...new Set(parsers.map((parser) => parser.language))];
}
