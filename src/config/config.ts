import fs from "node:fs";
import path from "node:path";

export interface CodeScopeConfig {
  version: number;
  maxFileSizeBytes: number;
  includeExtensions: string[];
}

export const defaultConfig: CodeScopeConfig = {
  version: 1,
  maxFileSizeBytes: 512 * 1024,
  includeExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]
};

export function findProjectRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".codescope")) || fs.existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startDir);
    current = parent;
  }
}

export function codeScopeDir(root: string): string {
  return path.join(root, ".codescope");
}

export function configPath(root: string): string {
  return path.join(codeScopeDir(root), "config.json");
}

export function databasePath(root: string): string {
  return path.join(codeScopeDir(root), "index.sqlite");
}

export function ensureConfig(root: string): CodeScopeConfig {
  fs.mkdirSync(codeScopeDir(root), { recursive: true });
  const file = configPath(root);
  if (!fs.existsSync(file)) fs.writeFileSync(file, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
  return loadConfig(root);
}

export function loadConfig(root: string): CodeScopeConfig {
  const file = configPath(root);
  if (!fs.existsSync(file)) return defaultConfig;
  try {
    return { ...defaultConfig, ...JSON.parse(fs.readFileSync(file, "utf8")) } as CodeScopeConfig;
  } catch {
    return defaultConfig;
  }
}
