import fs from "node:fs";
import path from "node:path";

const alwaysSkip = new Set([".git", "node_modules", "dist", "build", "coverage", "vendor", ".codescope"]);

export function readGitIgnorePatterns(root: string): string[] {
  const file = path.join(root, ".gitignore");
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line && !line.startsWith("#"));
}

function ignoredByPattern(rel: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const clean = pattern.replace(/^\//, "").replace(/\/$/, "");
    if (!clean) return false;
    if (clean.includes("*")) {
      const re = new RegExp(`^${clean.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
      return re.test(rel);
    }
    return rel === clean || rel.startsWith(`${clean}/`) || rel.endsWith(`/${clean}`);
  });
}

export function isLikelyBinary(buffer: any): boolean {
  return buffer.subarray(0, Math.min(buffer.length, 8000)).includes(0);
}

export function walkSourceFiles(root: string, extensions: string[], maxFileSizeBytes: number): string[] {
  const patterns = readGitIgnorePatterns(root);
  const results: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (alwaysSkip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (ignoredByPattern(rel, patterns)) continue;
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
        const stat = fs.statSync(full);
        if (stat.size <= maxFileSizeBytes) results.push(full);
      }
    }
  };
  visit(root);
  return results;
}
