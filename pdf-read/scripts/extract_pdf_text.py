#!/usr/bin/env python3
"""Extract text from a PDF using pypdf.

Usage:
  ./.venvs/pdf/bin/python tools/pdf/extract_pdf_text.py <in.pdf> <out.txt>

Notes:
- This is a best-effort extractor. Some PDFs are image-only; then it will extract little/no text.
- For scanned PDFs, add an OCR pipeline later (tesseract/ocrmypdf) if needed.
"""

from __future__ import annotations

import sys
from pathlib import Path

from pypdf import PdfReader


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip())
        return 2

    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])

    reader = PdfReader(str(in_path))

    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        try:
            txt = page.extract_text() or ""
        except Exception as e:
            txt = ""
            parts.append(f"\n\n--- page {i+1} extract error: {e} ---\n")
        parts.append(f"\n\n===== page {i+1} =====\n")
        parts.append(txt)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("".join(parts), encoding="utf-8", errors="ignore")

    print(f"pages={len(reader.pages)} out={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
