---
name: iflow-coding
description: Use when the user asks you to use the iflow CLI (iFlow) as a command-line coding tool to create/edit project files, run commands, or inspect iflow session logs/records.
---

# iFlow CLI（iflow）编码使用指南

## Overview
`iflow` 是一个**命令行编码工具**：启动后提供交互输入框，能在项目目录内生成/修改文件、执行命令，并把过程写入本地会话记录（JSONL）以便追溯。

> 说明：iflow 内部可能会调用不同模型（你截图里也能看到 model 状态栏），但在这份 skill 里，我们把它当成“CLI 编码工具”来用：关注目录、命令、文件改动、可验证结果与记录。

## When to Use
- 用户明确说“用 iflow 做/改代码”“像 Claude Code 那样操作”
- 需要可追溯的执行记录（会话文件、console log）
- 需要把工作限定在某个项目目录（而不是 home）

## Golden Rules（避免翻车）
1) **先切到项目目录再跑**：`cd <project>`；避免在 `~` 目录跑（iflow 也会提示）。
2) **默认手动确认**：优先 `--default`（或不加 `--yolo`）。除非用户明确授权，否则不要用 `--yolo` 自动接受所有动作。
3) **先写清目标与验收**：prompt 里必须包含：要改哪些文件/新增哪些文件、验收方式（build/test/运行方式）、不允许的东西（例如不引 CDN）。
4) **结束要给证据**：指出会话文件路径（`~/.iflow/projects/.../session-<id>.jsonl`）与关键改动（文件列表 + diff/摘要）。

## Quick Start（最常用）
### 交互模式
```bash
cd <project>
iflow
```

### 一句话执行（非交互）
```bash
cd <project>
iflow -p "<清晰指令 + 验收>"
```

### 先执行一句，再进入交互继续
```bash
cd <project>
iflow -i "<开场指令>"
```

### 继续/恢复会话
```bash
cd <project>
iflow -c          # 继续该目录最近一次会话
iflow -r          # 选择/指定恢复会话
```

### 常用参数（按需）
- 选模型：`iflow -m <model>`
- 只做方案不执行：`iflow --plan -p "..."`
- Debug：`iflow -d`
-（慎用）全文件入上下文：`iflow --all-files`

## 会话记录/日志在哪里（可追溯证明）
### 会话记录（JSONL，按项目目录分桶）
```bash
ls -la ~/.iflow/projects/
ls -la ~/.iflow/projects/<bucket>/
# 读取某个会话
sed -n '1,200p' ~/.iflow/projects/<bucket>/session-<id>.jsonl
```
> bucket 通常是把 cwd 路径做了转义，比如 `/opt/hello-world` → `-opt-hello-world`。

JSONL 中一般包含：user prompt、assistant 回复、tool_use/tool_result（写文件/改文件/跑命令）、cwd、model、时间戳。

### 控制台日志（排查 iflow 自己的问题）
```bash
ls -la ~/.iflow/log/
```

## 标准“编码任务”提示词模板（直接复制用）
把下面模板作为 `iflow -p` 的内容：

```text
你在当前仓库完成以下任务：
1) 目标：<一句话目标>
2) 约束：
- 不要引入外部依赖/CDN
- 只修改/新增这些文件：<列出或说明允许范围>
3) 交付物：
- 新增/修改的文件清单
- 关键 diff 摘要（每个文件 3~8 行要点）
4) 验收方式：
- 运行这些命令并确保通过：<例如 npm test / go test ./...>
- 如失败，给出定位与修复步骤
5) 结束时给出会话记录路径（~/.iflow/projects/.../session-*.jsonl）
```

## Common Mistakes
- 在 `~` 下跑，导致上下文混乱、会话散落（先 `cd`）。
- prompt 没有验收标准，输出“看起来好了”但不可验证（必须写 test/build/run）。
- 为了省事开 `--yolo`（除非用户明确授权）。
- 改完不说记录在哪里（必须给 session jsonl 路径）。
