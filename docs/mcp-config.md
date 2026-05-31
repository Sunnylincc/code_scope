# MCP 配置示例

代码视界可以通过标准输入输出提供 MCP 工具。先在项目中建立索引：

```bash
codescope init
codescope index
```

然后在 MCP 客户端中配置服务：

```json
{
  "mcpServers": {
    "codescope": {
      "command": "codescope",
      "args": ["serve", "--mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

如果使用本地开发版本，可以把命令改为 Node.js 执行构建产物：

```json
{
  "mcpServers": {
    "codescope-dev": {
      "command": "node",
      "args": ["/path/to/代码视界/dist/src/cli.js", "serve", "--mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

可用工具：

- `codescope_status`：返回索引状态。
- `codescope_search`：按关键词搜索紧凑结果。
- `codescope_symbol`：查询符号定义。
- `codescope_context`：生成适合 AI 编程助手阅读的上下文包。
- `codescope_callers`：返回已知调用方。
- `codescope_callees`：返回已知被调用符号。
- `codescope_related`：返回相关文件、符号、导入和关系。

工具输出会尽量使用中文标签，并避免返回大段完整文件。
