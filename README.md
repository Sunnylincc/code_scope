# 代码视界

一个本地优先的代码库理解工具，为 AI 编程助手提供代码结构检索、符号查询与 MCP 上下文服务。

## 1. 代码视界是什么

代码视界是一个面向本地代码库的轻量代码智能层。它会在项目目录中创建 `.codescope/`，扫描源码文件，提取文件、符号、导入和基础调用关系，并把索引保存在本地 SQLite 数据库中。

它提供两类入口：

- `codescope` 命令行工具，用于初始化、索引、搜索和构建上下文。
- MCP 服务，用于让 AI 编程助手通过结构化工具查询代码库。

## 2. 它解决什么问题

AI 编程助手在进入陌生代码库时，常常需要先理解结构。如果一开始就读取大量文件，容易浪费上下文窗口，也可能忽略关键入口。代码视界提供紧凑的结构化结果，让助手先定位符号、文件和关系，再有针对性地读取源文件。

## 3. 适合哪些场景

- 快速了解本地项目的主要函数、类和模块。
- 在修改前定位候选符号和相关调用点。
- 为 AI 编程助手提供较短的上下文包。
- 在没有云服务、没有 API Key、不能上传代码的环境中做本地检索。

## 4. 不适合哪些场景

- 需要完整编译器级语义分析的场景。
- 需要精确解析所有动态调用、运行时注入或框架隐式关系的场景。
- 希望替代测试、类型检查或人工代码审查的场景。

## 5. 安装

```bash
npm install -g code-scope-cn
```

也可以在仓库内开发使用：

```bash
npm run build
node dist/src/cli.js --help
```

## 6. 快速开始

```bash
codescope init
codescope index
codescope status
codescope search createUser
codescope context createUser
```

## 7. CLI 用法

```bash
codescope init
```

初始化 `.codescope/`、默认配置和 SQLite 数据库。

```bash
codescope index
```

遍历当前代码库并写入本地索引。默认跳过 `.git`、`node_modules`、`dist`、`build`、`coverage`、`vendor` 和 `.codescope`。

```bash
codescope status
```

显示已索引文件数、符号数、关系数、最后索引时间和支持语言。

```bash
codescope search <query>
codescope symbol <name>
codescope callers <symbol>
codescope callees <symbol>
codescope context <symbol-or-query>
```

查询结果使用中文标签，并尽量返回紧凑片段而不是整文件内容。

```bash
codescope serve --mcp
```

通过标准输入输出启动 MCP 服务。

## 8. MCP 配置示例

通用 MCP 客户端可以使用如下配置：

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

可用工具包括：`codescope_status`、`codescope_search`、`codescope_symbol`、`codescope_context`、`codescope_callers`、`codescope_callees` 和 `codescope_related`。

## 9. 给 AI 编程助手的使用建议

- 先运行 `codescope status` 判断索引是否存在。
- 理解代码库时优先使用 `codescope context` 或 `codescope search`。
- 不要一开始读取大量文件；先用符号和路径缩小范围。
- 真正修改代码前，必须读取源文件确认当前实现。
- 静态分析结果可能不完整，应把输出视为导航信息和上下文压缩结果。

## 10. 支持语言

当前支持：

- TypeScript / JavaScript
- Python

解析器采用模块化接口，后续可以继续添加语言。

## 11. 本地数据与隐私

代码视界只在本地运行。索引数据保存在项目的 `.codescope/index.sqlite` 中，不需要云服务，不需要 API Key，也不会上传代码。

## 12. 当前限制

- 静态分析可能不完整。
- 动态调用、反射、运行时注入等模式难以完全识别。
- 跨语言关系暂时有限。
- 复杂框架的隐式依赖可能无法准确解析。
- 修改代码前仍然需要读取源文件确认。

## 13. Roadmap

- 增强增量索引。
- 增加更多语言解析器。
- 改进调用关系置信度。
- 提供更丰富的上下文裁剪策略。
- 增加项目级依赖和模块关系视图。

## 14. License

MIT
