---
name: scrapling-scraper
description: Use when the user asks to scrape web pages, crawl a site, extract structured data from HTML, or bypass anti-bot blocks (Cloudflare/Turnstile) using the Scrapling Python library.
---

# Scrapling Scraper (Python)

## Overview
Scrapling is an adaptive Python web-scraping framework: it can do simple HTTP fetches, stealthy fetches, and full browser (Playwright) rendering, plus a Scrapy-like Spider API for crawls.

This skill standardizes **how to run Scrapling inside this OpenClaw workspace** (venv + a small CLI wrapper) so future scraping requests are one command away.

## When to Use
Use this skill when the user says things like:
- “爬这个页面/抓取这个网站的数据/做个爬虫”
- “把列表页所有商品标题/价格抓出来”
- “被 Cloudflare/Turnstile 挡住了”
- “需要渲染 JS 才能看到内容”
- “要全站 crawl / 多页面并发抓取”

Don’t use this skill for:
- Official APIs exist and the user is okay using them (prefer API)
- Anything clearly illegal / ToS-forbidden (confirm scope)

## First Questions to Ask (fast requirements)
1) 目标 URL（1 个还是一批）
2) 要抽取的字段（示例 3-5 条即可）
3) 页面是否需要登录/验证码/JS 渲染
4) 频率与规模（一次性/每天跑；几十页/几万页）
5) 输出格式（JSON/JSONL/CSV）

## Local Setup (one-time per machine)
All commands are relative to the OpenClaw workspace.

```bash
cd /home/ubuntu/.openclaw/workspace/skills/scrapling-scraper
python3 -m venv .venv
. .venv/bin/activate
pip install -U pip
pip install Scrapling
```

If you need dynamic rendering:
- Install Playwright browsers (may take time):
```bash
python -m playwright install chromium
```

## Quick Start (single page)
### 1) Simple fetch (fast)
Use when HTML is server-rendered and not blocked.

```python
from scrapling.fetchers import Fetcher
page = Fetcher.fetch("https://example.com")
items = page.css(".product")
print(len(items))
```

### 2) Stealth fetch (anti-bot)
Use when you see blocks / interstitials / Turnstile.

```python
from scrapling.fetchers import StealthyFetcher
StealthyFetcher.adaptive = True
page = StealthyFetcher.fetch("https://example.com", headless=True, network_idle=True)
```

### 3) Dynamic fetch (needs JS)
Use when key content appears only after JS execution.

```python
from scrapling.fetchers import DynamicFetcher
page = DynamicFetcher.fetch("https://example.com", headless=True, network_idle=True)
```

## The Wrapper Script (recommended)
Use the bundled CLI to quickly test selectors and dump results.

### Examples
```bash
# Fetch a page, extract text or attributes using CSS selectors
./scripts/scrapling_cli.py fetch \
  --url "https://example.com" \
  --mode stealth \
  --selector ".product" \
  --fields title:"h2::text" link:"a::attr(href)" \
  --limit 20

# Output JSONL (one item per line)
./scripts/scrapling_cli.py fetch --url "https://example.com" --selector ".product" \
  --fields title:"h2::text" price:".price::text" \
  --out ./out.jsonl --format jsonl
```

## Crawling (multi-page)
For site crawls, prefer implementing a small Spider (async parse callbacks). Start with:
- start_urls
- parse() yielding dict items
- add a link-following rule only after validating correctness on 5–20 pages

(If the user wants this, create a dedicated spider file under a project folder, not inside this skill folder.)

## Common Mistakes
- Choosing DynamicFetcher when simple Fetcher would do (slower, heavier)
- Not normalizing relative URLs (use the page’s base URL)
- Scraping too aggressively (add delays / per-domain throttling)
- Forgetting to save raw HTML when debugging selector failures

## Safety / Compliance
- Confirm the user has the right to scrape the target.
- Respect robots/ToS when asked.
- Do not build features intended to bypass paid access controls.
