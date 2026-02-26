---
name: ai-daily
description: "Fetches RSS feeds from 90 top Hacker News blogs (curated by Karpathy) and generates a daily digest report. OpenClaw-adapted: scripts ONLY fetch/normalize data; ALL LLM curation (scoring/filtering/summarizing/translating/categorizing) is done by the agent at runtime. Trigger command: /ai-daily."
---

# AI Daily（OpenClaw 适配版）

从 Karpathy 推荐的 90 个热门技术博客中抓取最新文章，**脚本只负责拿数据**；需要用到 LLM 的部分（筛选/摘要/翻译/分类/趋势提炼）全部由 Agent 在对话中完成。

> ✅ 你不需要在这个 skill 里配置任何 `OPENAI_API_BASE` / `GEMINI_API_KEY`。

## 命令

### `/ai-daily`

运行每日摘要生成。

**使用方式**：输入 `/ai-daily`，Agent 通过交互式引导收集参数后执行。

---

## 脚本目录

**重要**：所有脚本位于此 skill 的 `scripts/` 子目录。

**Agent 执行说明**：
1. 确定此 SKILL.md 文件的目录路径为 `SKILL_DIR`
2. 脚本路径 = `${SKILL_DIR}/scripts/<script-name>.ts`

| 脚本 | 用途 |
|------|------|
| `scripts/fetch.ts` | ✅ 仅抓取/解析 RSS/Atom，输出原始文章 JSON/MD（不调用任何 LLM） |

---

## 交互流程（Agent 版 /ai-daily）


### Step 1: 收集参数

使用 `question()` 一次性收集：

- 时间范围：24 小时 / 48 小时（推荐）/ 72 小时 / 7 天
- 精选数量：10 篇 / 15 篇（推荐）/ 20 篇
- 输出语言：中文（推荐）/ English

> 说明：脚本只拿数据，但“精选数量/语言”会影响 Agent 生成报告的方式。

### Step 2: 执行数据抓取脚本（不需要任何 Key）

```bash
mkdir -p ./output

npx -y bun ${SKILL_DIR}/scripts/fetch.ts \
  --hours <timeRange> \
  --output-json ./output/ai-daily-raw-$(date +%Y%m%d).json \
  --output-md   ./output/ai-daily-raw-$(date +%Y%m%d).md
```

### Step 3: Agent 在对话中生成最终报告（LLM 处理由 Agent 完成）

Agent 读取 `ai-daily-raw-*.json` 后：

- 去重（按 `link`）
- 过滤低信号内容（纯广告/无实质内容/重复转载等）
- 对候选文章做精选（输出数量 = topN）
- 生成：
  1. **📝 今日看点**（3-5 条趋势）
  2. **🏆 今日必读 Top 3**（中文标题 + 一句话摘要 + 推荐理由 + 关键词）
  3. **📊 数据概览**（可简化：源数/抓取数/精选数 + 关键词/分类统计）
  4. **分类文章列表**（AI/ML、安全、工程、工具/开源、观点/杂谈、其他）

**硬性要求**：报告里每篇文章都必须包含**原文链接**（来自 JSON 的 `link`）。

**文件命名约定**（建议）：
- 原始数据：`ai-daily-raw-YYYYMMDD.json`
- 原始列表：`ai-daily-raw-YYYYMMDD.md`
- 最终报告：`ai-daily-YYYYMMDD.md`

### Step 4: 结果展示

成功时输出：
- 📁 原始数据文件路径（JSON/MD）
- 📁 最终报告文件路径（Markdown）
- 🏆 Top 3 预览（带原文链接）

### Step 5: 发送 Markdown 文件给用户查看（必须）

在当前会话中，将**最终报告 Markdown 文件**作为附件发送给用户（便于直接下载/转存）。

- Feishu：使用 `message(action=send, filePath=...)` 发送文件
- 默认发送：`ai-daily-YYYYMMDD.md`

---

## 环境要求

- `bun` 运行时（通过 `npx -y bun` 自动安装）
- 网络访问（需要能访问 RSS 源）

---

## 信息源

90 个 RSS 源来自 [Hacker News Popularity Contest 2025](https://refactoringenglish.com/tools/hn-popularity/)，由 [Andrej Karpathy 推荐](https://x.com/karpathy)。

---

## 故障排除

### "Failed to fetch N feeds"
部分 RSS 源可能暂时不可用，脚本会跳过失败的源并继续处理。

### "No articles found in time range"
尝试扩大时间范围（如从 24 小时改为 48 小时）。
