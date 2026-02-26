---
name: pdf-read
description: "Extract text from PDFs locally (no external APIs). Creates/uses a reusable Python venv and outputs per-page text to a .txt file for downstream analysis."
---

# PDF Read / Text Extraction（Local）

把 PDF 内容**确定性地**抽成可搜索的纯文本（按页分隔），方便后续总结/检索/引用条款。

## 必要条件

- Python 3
- 允许创建 venv（Ubuntu 24.04 避免 PEP 668，不要 `pip --user`，不要 `--break-system-packages`）
- venv 里安装 `pypdf`

## 一次性初始化（创建 venv）

在 OpenClaw workspace 下执行：

```bash
cd ~/.openclaw/workspace
python3 -m venv .venvs/pdf
./.venvs/pdf/bin/python -m pip install -U pip
./.venvs/pdf/bin/python -m pip install pypdf
./.venvs/pdf/bin/python -c "import pypdf; print('pypdf', pypdf.__version__)"
```

## 从 PDF 抽取文本

```bash
cd ~/.openclaw/workspace

./.venvs/pdf/bin/python ${SKILL_DIR}/scripts/extract_pdf_text.py \
  "~/.openclaw/media/inbound/<file>.pdf" \
  "tmp/<file>.txt"
```

产物：
- `tmp/<file>.txt`（包含 `===== page N =====` 分页标记）

## 提醒：扫描件 PDF

如果 PDF 是纯图片扫描件，pypdf 可能抽不到文字，需要 OCR（例如 tesseract/ocrmypdf）。这属于额外安装步骤，建议先确认再做。

## Files

- Script: `scripts/extract_pdf_text.py`
- Venv: `~/.openclaw/workspace/.venvs/pdf/`
- Output: `~/.openclaw/workspace/tmp/*.txt`
