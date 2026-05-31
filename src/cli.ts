#!/usr/bin/env node
import { ensureConfig, findProjectRoot, loadConfig } from "./config/config.js";
import { initializeDatabase, openDatabase, status as dbStatus, type Db } from "./db/database.js";
import { indexProject } from "./indexer/indexer.js";
import { supportedLanguages } from "./parsers/registry.js";
import { search, findSymbols, type SearchResult } from "./search/search.js";
import { callers, callees, type RelationshipResult } from "./graph/relationships.js";
import { buildContext } from "./context/context.js";
import { startMcpServer } from "./mcp/server.js";

function withDb<T>(fn: (root: string, db: Db) => T): T {
  const root = findProjectRoot();
  const db = openDatabase(root);
  try { initializeDatabase(db); return fn(root, db); } finally { db.close(); }
}

function printHelp(): void {
  console.log(`代码视界 codescope\n\n用法：codescope <命令> [参数]\n\n命令：\n  init                 初始化本地索引目录\n  index                索引当前代码库\n  status               查看索引状态\n  search <query>       搜索符号、路径与片段\n  symbol <name>        查询符号定义\n  callers <symbol>     查询已知调用方\n  callees <symbol>     查询已知被调用符号\n  context <query>      构建紧凑上下文\n  serve --mcp          启动 MCP 服务`);
}

function printResults(results: SearchResult[]): void {
  if (results.length === 0) { console.log("未找到匹配结果。"); return; }
  results.forEach((item, index) => {
    console.log(`\n结果 ${index + 1}`);
    console.log(`符号：${item.name}`);
    console.log(`类型：${item.kind}`);
    console.log(`语言：${item.language}`);
    console.log(`位置：${item.path}:${item.startLine}-${item.endLine}`);
    console.log(`片段：\n${item.snippet}`);
  });
}

function printRelations(results: RelationshipResult[], emptyText: string): void {
  if (results.length === 0) console.log(emptyText);
  else printResults(results);
  console.log("提示：调用关系来自轻量静态分析，可能不完整；修改前请读取源文件确认。");
}

async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h") { printHelp(); return; }
  if (command === "--version" || command === "-v") { console.log("0.1.0"); return; }
  switch (command) {
    case "init": {
      const root = findProjectRoot();
      const config = ensureConfig(root);
      const db = openDatabase(root);
      try { initializeDatabase(db); } finally { db.close(); }
      console.log(`初始化完成：已创建 .codescope 目录与本地数据库。最大文件大小：${config.maxFileSizeBytes} 字节。`);
      return;
    }
    case "index": {
      const root = findProjectRoot();
      const config = ensureConfig(root);
      const db = openDatabase(root);
      try {
        const summary = indexProject(root, db, config);
        console.log("索引完成。");
        console.log(`文件数：${summary.files}`);
        console.log(`符号数：${summary.symbols}`);
        console.log(`导入数：${summary.imports}`);
        console.log(`关系数：${summary.relationships}`);
        if (summary.warnings.length > 0) console.log(`警告：${summary.warnings.slice(0, 5).join("；")}`);
      } finally { db.close(); }
      return;
    }
    case "status": withDb((_root, db) => {
      const s = dbStatus(db);
      console.log("代码视界状态");
      console.log(`已索引文件数：${s.fileCount}`);
      console.log(`符号数：${s.symbolCount}`);
      console.log(`关系数：${s.relationshipCount}`);
      console.log(`最后索引时间：${s.lastIndexedAt ?? "尚未索引"}`);
      console.log(`支持语言：${supportedLanguages().join("、")}`);
    }); return;
    case "search": if (!args[0]) throw new Error("请提供搜索关键词。"); withDb((_root, db) => printResults(search(db, args[0]))); return;
    case "symbol": if (!args[0]) throw new Error("请提供符号名。"); withDb((_root, db) => printResults(findSymbols(db, args[0]))); return;
    case "callers": if (!args[0]) throw new Error("请提供符号名。"); withDb((_root, db) => printRelations(callers(db, args[0]), "未找到已知调用方。")); return;
    case "callees": if (!args[0]) throw new Error("请提供符号名。"); withDb((_root, db) => printRelations(callees(db, args[0]), "未找到已知被调用符号。")); return;
    case "context": if (!args[0]) throw new Error("请提供符号名或查询词。"); withDb((_root, db) => { console.log("上下文包"); console.log(JSON.stringify(buildContext(db, args[0]), null, 2)); }); return;
    case "serve": if (!args.includes("--mcp")) throw new Error("请使用 --mcp 启动 MCP 服务。"); loadConfig(findProjectRoot()); await startMcpServer(findProjectRoot()); return;
    default: throw new Error(`未知命令：${command}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => { console.error(`执行失败：${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
