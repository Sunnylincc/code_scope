import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedFixture, copyFixture } from "./helpers.js";
import { search, findSymbols } from "../src/search/search.js";
import { openDatabase, initializeDatabase, status } from "../src/db/database.js";

test("搜索符号", () => {
  const { db } = indexedFixture("ts-project");
  assert.equal(findSymbols(db, "total")[0].name, "total");
  assert.ok(search(db, "Calculator").length > 0);
  db.close();
});

test("未初始化状态可优雅处理", () => {
  const root = copyFixture("ts-project");
  const db = openDatabase(root);
  initializeDatabase(db);
  assert.deepEqual(status(db).fileCount, 0);
  assert.deepEqual(search(db, "none"), []);
  db.close();
});
