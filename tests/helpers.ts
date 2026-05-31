import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureConfig } from "../src/config/config.js";
import { openDatabase, initializeDatabase, type Db } from "../src/db/database.js";
import { indexProject } from "../src/indexer/indexer.js";

export function copyFixture(name: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `codescope-${name}-`));
  fs.cpSync(path.join(process.cwd(), "tests", "fixtures", name), root, { recursive: true });
  return root;
}

export function indexedFixture(name: string): { root: string; db: Db } {
  const root = copyFixture(name);
  const config = ensureConfig(root);
  const db = openDatabase(root);
  initializeDatabase(db);
  indexProject(root, db, config);
  return { root, db };
}
