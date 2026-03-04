#!/usr/bin/env python3
"""Scrapling quick CLI for OpenClaw.

Goals:
- Fast “does this selector work?” loop
- Minimal dependencies beyond Scrapling
- Safe defaults (small limits, explicit modes)

Usage:
  scrapling_cli.py fetch --url URL --selector CSS --fields k:"subselector" ...

Field syntax:
- key:"css::text"          -> .css("css::text").get() on each selected item
- key:"a::attr(href)"      -> attribute extraction

Notes:
- This is intentionally simple; for serious crawls, write a Spider.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def parse_fields(pairs: List[str]) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    for p in pairs:
        if ":" not in p:
            raise ValueError(f"Bad --fields entry (expected key:selector): {p}")
        k, sel = p.split(":", 1)
        k = k.strip()
        sel = sel.strip().strip('"')
        if not k or not sel:
            raise ValueError(f"Bad --fields entry (empty key/selector): {p}")
        out.append((k, sel))
    return out


def get_fetcher(mode: str):
    if mode == "simple":
        from scrapling.fetchers import Fetcher

        return Fetcher
    if mode == "stealth":
        from scrapling.fetchers import StealthyFetcher

        # Enable adaptive mode globally (helps selectors survive small DOM changes)
        StealthyFetcher.adaptive = True
        return StealthyFetcher
    if mode == "dynamic":
        from scrapling.fetchers import DynamicFetcher

        return DynamicFetcher
    raise ValueError(f"Unknown mode: {mode}")


def cmd_fetch(args: argparse.Namespace) -> int:
    FetcherCls = get_fetcher(args.mode)

    fetch_kwargs = {}
    if args.mode in ("stealth", "dynamic"):
        fetch_kwargs.update(
            {
                "headless": not args.headful,
                "network_idle": args.network_idle,
            }
        )

    # Scrapling APIs vary by version: some expose Fetcher.fetch (classmethod),
    # others use an instance method Fetcher().get(url, ...).
    if hasattr(FetcherCls, "fetch"):
        page = FetcherCls.fetch(args.url, **fetch_kwargs)
    else:
        page = FetcherCls().get(args.url, **fetch_kwargs)

    # Save raw HTML for debugging if requested
    if args.save_html:
        html = getattr(page, "html_content", None) or getattr(page, "text", "")
        if not html and hasattr(page, "body") and isinstance(page.body, (bytes, bytearray)):
            try:
                html = page.body.decode("utf-8", errors="ignore")
            except Exception:
                html = ""
        Path(args.save_html).write_text(html, encoding="utf-8")

    nodes = page.css(args.selector)
    if args.limit is not None:
        nodes = nodes[: args.limit]

    fields = parse_fields(args.fields)
    results: List[Dict[str, Optional[str]]] = []
    for n in nodes:
        item: Dict[str, Optional[str]] = {}
        for key, sel in fields:
            try:
                r = n.css(sel)
                # Prefer getall() when available to avoid returning only whitespace
                if hasattr(r, "getall"):
                    vals = r.getall()
                    if not vals:
                        item[key] = None
                    else:
                        text = "".join(v if isinstance(v, str) else str(v) for v in vals)
                        text = " ".join(text.split())
                        item[key] = text if text else None
                else:
                    v = r.get()
                    if isinstance(v, str):
                        v = " ".join(v.split())
                    item[key] = v if v else None
            except Exception:
                # Keep going; scraping is best-effort
                item[key] = None
        results.append(item)

    if args.format == "json":
        out_text = json.dumps(results, ensure_ascii=False, indent=2)
    elif args.format == "jsonl":
        out_text = "\n".join(json.dumps(r, ensure_ascii=False) for r in results)
    else:
        raise ValueError(f"Unknown format: {args.format}")

    if args.out:
        Path(args.out).write_text(out_text + ("\n" if not out_text.endswith("\n") else ""), encoding="utf-8")
    else:
        sys.stdout.write(out_text)
        if not out_text.endswith("\n"):
            sys.stdout.write("\n")

    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="scrapling_cli.py")
    sub = p.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch", help="Fetch one page and extract items")
    f.add_argument("--url", required=True)
    f.add_argument("--mode", choices=["simple", "stealth", "dynamic"], default="simple")
    f.add_argument("--selector", required=True, help="CSS selector for item containers")
    f.add_argument(
        "--fields",
        nargs="+",
        default=[],
        required=True,
        help='Field mappings like title:"h2::text" link:"a::attr(href)"',
    )
    f.add_argument("--limit", type=int, default=20)
    f.add_argument("--format", choices=["json", "jsonl"], default="json")
    f.add_argument("--out", help="Write output to a file (optional)")
    f.add_argument("--save-html", help="Save raw HTML to a file for debugging")
    f.add_argument("--headful", action="store_true", help="Run browser headful (stealth/dynamic only)")
    f.add_argument("--network-idle", action="store_true", help="Wait for network idle (stealth/dynamic only)")

    f.set_defaults(func=cmd_fetch)
    return p


def main(argv: List[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
