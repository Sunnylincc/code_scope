import { openDatabase, initializeDatabase, status } from "../db/database.js";
import { search, findSymbols } from "../search/search.js";
import { buildContext } from "../context/context.js";
import { callers, callees, importsForFile } from "../graph/relationships.js";

interface JsonRpcRequest { jsonrpc?: string; id?: string | number | null; method?: string; params?: any; }

function text(content: unknown) { return { content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }] }; }

export async function startMcpServer(root: string): Promise<void> {
  const db = openDatabase(root);
  initializeDatabase(db);
  const tools = [
    { name: "codescope_status", description: "Return local CodeScope index status.", inputSchema: { type: "object", properties: {} } },
    { name: "codescope_search", description: "Search compact code symbols and snippets.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "codescope_symbol", description: "Find symbol definitions and locations.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    { name: "codescope_context", description: "Build compact context for an AI coding agent.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "codescope_callers", description: "Return known callers of a symbol.", inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } },
    { name: "codescope_callees", description: "Return known callees of a symbol.", inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } },
    { name: "codescope_related", description: "Return related files, symbols, imports, and relationships.", inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } }
  ];

  const respond = (id: JsonRpcRequest["id"], result: unknown) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  const fail = (id: JsonRpcRequest["id"], message: string) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } })}\n`);

  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const request = JSON.parse(line) as JsonRpcRequest;
        if (request.method === "initialize") respond(request.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "代码视界", version: "0.1.0" } });
        else if (request.method === "tools/list") respond(request.id, { tools });
        else if (request.method === "tools/call") {
          const name = request.params?.name;
          const args = request.params?.arguments ?? {};
          if (name === "codescope_status") respond(request.id, text({ 标签: "索引状态", ...status(db) }));
          else if (name === "codescope_search") respond(request.id, text({ 标签: "搜索结果", results: search(db, String(args.query ?? "")) }));
          else if (name === "codescope_symbol") respond(request.id, text({ 标签: "符号定义", results: findSymbols(db, String(args.name ?? "")) }));
          else if (name === "codescope_context") respond(request.id, text({ 标签: "上下文包", ...buildContext(db, String(args.query ?? "")) }));
          else if (name === "codescope_callers") respond(request.id, text({ 标签: "已知调用方", 提示: "静态关系可能不完整。", results: callers(db, String(args.symbol ?? "")) }));
          else if (name === "codescope_callees") respond(request.id, text({ 标签: "已知被调用符号", 提示: "静态关系可能不完整。", results: callees(db, String(args.symbol ?? "")) }));
          else if (name === "codescope_related") {
            const symbol = String(args.symbol ?? "");
            const defs = findSymbols(db, symbol);
            respond(request.id, text({ 标签: "相关上下文", definitions: defs, imports: defs[0] ? importsForFile(db, defs[0].path) : [], callers: callers(db, symbol), callees: callees(db, symbol) }));
          } else fail(request.id, `未知工具：${name}`);
        }
      } catch (error) { fail(null, error instanceof Error ? error.message : String(error)); }
    }
  });
  await new Promise<void>((resolve) => process.stdin.on("end", () => { db.close(); resolve(); }));
}
