# 给 AI 编程助手的使用建议

代码视界的查询结果适合作为导航和上下文压缩工具。使用时建议遵循以下流程：

1. 在理解代码库时，优先使用 `codescope context <query>` 或 `codescope search <query>`。
2. 不要一开始就读取大量文件；先通过符号、文件路径和短片段缩小范围。
3. 如果需要查看定义，使用 `codescope symbol <name>` 找到候选位置。
4. 如果需要分析影响范围，可以使用 `codescope callers <symbol>` 和 `codescope callees <symbol>`。
5. 在真正修改代码前，必须读取源文件确认当前实现。
6. 静态分析结果可能不完整，不能替代最终验证。
7. 查询输出不是绝对事实来源；它应该帮助你决定下一步该读哪些文件、运行哪些测试。
