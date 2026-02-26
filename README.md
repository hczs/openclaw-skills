# openclaw-skills

[中文](./README.zh-CN.md)

## 1) Repository

A curated collection of practical **OpenClaw Skills** (one skill = one folder). The goal is to turn repetitive workflows into reusable, composable, automatable skills.

## 2) Quick Start (Install a skill from this repo)

### Option A — Copy into your OpenClaw workspace (recommended)

1. Clone this repo:

```bash
git clone https://github.com/hczs/openclaw-skills.git
cd openclaw-skills
```

2. Copy the skill folder you want into your OpenClaw workspace:

```bash
# Example: install ai-daily
cp -r ai-daily ~/.openclaw/workspace/skills/ai-daily

# Example: install iflow-apikey-refresh
cp -r iflow-apikey-refresh ~/.openclaw/workspace/skills/iflow-apikey-refresh
```

3. Restart (or reload) your OpenClaw agent if needed.

### Option B — Use a symlink (for contributors)

```bash
# From your local clone
ln -s "$(pwd)/ai-daily" ~/.openclaw/workspace/skills/ai-daily
```

> Notes
> - A skill folder should only contain `SKILL.md` and files referenced by it.
> - Do **not** commit secrets. Keep them in your local OpenClaw `secrets/` directory.

## 3) Skills

| Skill | What it does | Trigger / Usage |
|---|---|---|
| `ai-daily` | Fetches the latest posts from **90 tech blogs curated by Andrej Karpathy**, then OpenClaw summarizes and selects the best articles into a Markdown daily digest (with original links). | Trigger: `/ai-daily` |
| `iflow-apikey-refresh` | Auto-refreshes iFlow (platform.iflow.cn) OpenAPI key near expiry, and proactively notifies you on success/failure (great for cron). | Run wrapper script via cron; requires `TARGET` env. |
| `pdf-read` | Extracts text from PDFs locally (no external APIs) into a per-page `.txt` for analysis/summarization. | Run the extraction script (requires Python venv + `pypdf`). |
| `iflow-coding` | A practical guide for using the `iflow` CLI as a coding agent (project-scoped runs, session logs, safe workflow). | Use when you want to operate `iflow` in a repo; see SKILL.md for command patterns. |
| `ppt-generator` | Generates a Jobs-style minimal tech **16:9** HTML slide deck from a script (single self-contained HTML). | Ask for PPT/Slides/演示稿; output is an HTML file. |
