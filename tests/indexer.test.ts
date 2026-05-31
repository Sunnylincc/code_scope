import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedFixture } from "./helpers.js";
import { status } from "../src/db/database.js";

test("索引 TypeScript fixture", () => {
  const { db } = indexedFixture("ts-project");
  const s = status(db);
  assert.equal(s.fileCount, 1);
  assert.ok(s.symbolCount >= 3);
  db.close();
});

test("索引 Python fixture", () => {
  const { db } = indexedFixture("py-project");
  const s = status(db);
  assert.equal(s.fileCount, 1);
  assert.ok(s.symbolCount >= 3);
  db.close();
});
