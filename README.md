# openclaw-skills

这里沉淀我长期维护的 OpenClaw Skills（**一个 skill = 一个文件夹**）。目标很简单：把日常高频需求做成可复用、可组合、可自动化的技能库。

## Skills

### ai-daily

从 **Andrej Karpathy 推荐的 90 个热门技术博客**中抓取最新文章，由 **OpenClaw 负责汇总、筛选与摘要**，生成一份可直接阅读/转存的中文日报（Markdown）。

- 触发命令：`/ai-daily`
- 输出：原始抓取数据（JSON/MD）+ 最终精选报告（Markdown，含原文链接）

### iflow-apikey-refresh

iFlow（platform.iflow.cn）API Key 到期前自动刷新，并在成功/失败时通过 OpenClaw 主动通知（适合配合 cron 定时检查）。

- 适用：API Key 7 天过期，需要自动续期
- 输出：成功则推送新 key + expireTime；失败则告警
