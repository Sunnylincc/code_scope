import type { Db } from "../db/database.js";
import { callers, callees, importsForFile } from "../graph/relationships.js";
import { findSymbols, search } from "../search/search.js";

export function buildContext(db: Db, query: string) {
  const definitions = findSymbols(db, query, 5);
  const target = definitions[0] ?? search(db, query, 1)[0];
  if (!target) return { query, target: null, message: "未找到相关符号。" };
  const relatedCallers = callers(db, target.name).slice(0, 5);
  const relatedCallees = callees(db, target.name).slice(0, 5);
  const relatedSymbols = search(db, target.name, 6).filter((item) => !(item.path === target.path && item.startLine === target.startLine)).slice(0, 5);
  return {
    query,
    target,
    imports: importsForFile(db, target.path),
    callers: relatedCallers,
    callees: relatedCallees,
    relatedSymbols,
    note: "静态分析结果可能不完整；修改代码前请读取源文件确认。"
  };
}
