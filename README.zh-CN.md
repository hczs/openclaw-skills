# openclaw-skills

[English](./README.md)

## 1）仓库说明

这里沉淀我长期维护的 **OpenClaw Skills**（一个 skill = 一个文件夹）。目标是把日常高频工作流做成可复用、可组合、可自动化的技能库。

## 2）快速使用（从本仓库安装指定 skill）

### 方式 A：复制到你的 OpenClaw 工作目录（推荐）

1）克隆仓库：

```bash
git clone https://github.com/hczs/openclaw-skills.git
cd openclaw-skills
```

2）把你需要的 skill 文件夹复制到你的 OpenClaw workspace：

```bash
# 例：安装 ai-daily
cp -r ai-daily ~/.openclaw/workspace/skills/ai-daily

# 例：安装 iflow-apikey-refresh
cp -r iflow-apikey-refresh ~/.openclaw/workspace/skills/iflow-apikey-refresh
```

3）如有需要，重启/重新加载 OpenClaw。

### 方式 B：软链（适合参与开发/持续更新）

```bash
# 在你本地 clone 的仓库目录下执行
ln -s "$(pwd)/ai-daily" ~/.openclaw/workspace/skills/ai-daily
```

> 注意
> - skill 目录里只放 `SKILL.md` + `SKILL.md` 引用到的必要文件。
> - 不要把 secrets 提交到 git；敏感信息放在你本地的 OpenClaw `secrets/` 目录。

## 3）Skills

| Skill | 简介 | 触发/使用 |
|---|---|---|
| `ai-daily` | 从 **Karpathy 推荐的 90 个热门技术博客**抓取最新文章，由 OpenClaw 进行汇总、摘要与精选，输出带原文链接的 Markdown 日报。 | 触发：`/ai-daily` |
| `iflow-apikey-refresh` | iFlow（platform.iflow.cn）API Key 到期前自动刷新，并在成功/失败时主动通知（适合配合 cron）。 | 用 cron 运行包装脚本；需要设置 `TARGET` 环境变量。 |
| `pdf-read` | 本地抽取 PDF 文本（不依赖外部 API），按页输出到 `.txt`，便于检索/总结/引用条款。 | 运行抽取脚本（需要 Python venv + `pypdf`）。 |
| `iflow-coding` | `iflow` CLI 编码工具的使用指南（如何在项目目录内安全运行、如何验收、如何找会话 JSONL 记录）。 | 需要用 `iflow` 写/改代码时用；具体命令见 SKILL.md。 |
