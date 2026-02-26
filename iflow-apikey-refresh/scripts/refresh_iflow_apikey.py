#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""iFlow API key auto-refresh.

Reads secrets from: /home/ubuntu/.openclaw/workspace/secrets/iflow.json
Writes state to:      /home/ubuntu/.openclaw/workspace/secrets/iflow_state.json

Exit codes:
  0 = skipped (not due yet)
  10 = refreshed (new key issued)
  2 = failed

Stdout (machine-readable):
  SKIP reason=...\n
  REFRESHED apiKey=... expireTime="YYYY-MM-DD HH:MM"\n
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.request

URL = "https://platform.iflow.cn/api/openapi/apikey"
SECRETS_PATH = "/home/ubuntu/.openclaw/workspace/secrets/iflow.json"
STATE_PATH = "/home/ubuntu/.openclaw/workspace/secrets/iflow_state.json"


def _now_shanghai() -> dt.datetime:
    # Asia/Shanghai is UTC+8 with no DST
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).astimezone(
        dt.timezone(dt.timedelta(hours=8))
    )


def _parse_expire_time(s: str) -> dt.datetime:
    # Example: "2026-03-04 15:54" (assume Asia/Shanghai)
    naive = dt.datetime.strptime(s, "%Y-%m-%d %H:%M")
    return naive.replace(tzinfo=dt.timezone(dt.timedelta(hours=8)))


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(path: str, obj: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def should_refresh(lead_hours: float) -> tuple[bool, str]:
    if not os.path.exists(STATE_PATH):
        return True, "no_state"

    try:
        st = _load_json(STATE_PATH)
        exp_s = st.get("expireTime")
        if not exp_s:
            return True, "state_missing_expireTime"
        exp = _parse_expire_time(exp_s)
        now = _now_shanghai()
        lead = dt.timedelta(hours=lead_hours)
        if now >= (exp - lead):
            return True, f"due now={now.isoformat()} exp={exp.isoformat()} lead_hours={lead_hours}"
        else:
            return False, f"not_due now={now.isoformat()} exp={exp.isoformat()} lead_hours={lead_hours}"
    except Exception as e:
        return True, f"state_unreadable {type(e).__name__}: {e}"


def refresh(secrets: dict) -> dict:
    cookie = secrets["cookie"].strip()
    xsrf = secrets["xsrf"].strip()
    name = secrets["name"].strip()

    body = json.dumps({"name": name}).encode("utf-8")

    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "origin": "https://platform.iflow.cn",
        "referer": secrets.get("referer", "https://platform.iflow.cn/profile?tab=apiKey"),
        "user-agent": secrets.get("user_agent", "Mozilla/5.0"),
        "x-xsrf-token": xsrf,
        "cookie": cookie,
    }

    # Optional extra headers for hard-to-please endpoints (e.g. bx-v, accept-language)
    extra = secrets.get("extra_headers") or {}
    for k, v in extra.items():
        if v is None:
            continue
        headers[str(k).lower()] = str(v)

    req = urllib.request.Request(URL, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="replace")

    try:
        j = json.loads(raw)
    except Exception:
        raise RuntimeError(f"Non-JSON response: {raw[:400]}")

    if not j.get("success"):
        raise RuntimeError(f"API returned success=false: {j}")

    data = j.get("data") or {}
    api_key = data.get("apiKey")
    expire_time = data.get("expireTime")
    if not api_key or not expire_time:
        raise RuntimeError(f"Missing apiKey/expireTime in response: {j}")

    return {
        "apiKey": api_key,
        "expireTime": expire_time,
        "refreshedAt": _now_shanghai().strftime("%Y-%m-%d %H:%M:%S%z"),
        "raw": j,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lead-hours", type=float, default=6.0, help="Refresh when within N hours of expiry")
    ap.add_argument("--force", action="store_true", help="Force refresh regardless of expiry/state")
    args = ap.parse_args()

    if not args.force:
        do, reason = should_refresh(args.lead_hours)
        if not do:
            print(f"SKIP reason={reason}")
            return 0

    if not os.path.exists(SECRETS_PATH):
        print(f"ERROR missing secrets file: {SECRETS_PATH}", file=sys.stderr)
        return 2

    try:
        secrets = _load_json(SECRETS_PATH)
        result = refresh(secrets)
        _save_json(STATE_PATH, {"expireTime": result["expireTime"], "lastRefreshAt": result["refreshedAt"]})
        print(f"REFRESHED apiKey={result['apiKey']} expireTime=\"{result['expireTime']}\"")
        return 10
    except Exception as e:
        print(f"ERROR {type(e).__name__}: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
