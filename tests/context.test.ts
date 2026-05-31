import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedFixture } from "./helpers.js";
import { buildContext } from "../src/context/context.js";

test("构建紧凑上下文", () => {
  const { db } = indexedFixture("ts-project");
  const ctx = buildContext(db, "total") as any;
  assert.equal(ctx.target.name, "total");
  assert.ok(ctx.note.includes("静态分析"));
  assert.ok(JSON.stringify(ctx).length < 8000);
  db.close();
});
