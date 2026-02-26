#!/usr/bin/env bash
set -euo pipefail

# Generic wrapper: refresh iFlow API key when due, then notify via OpenClaw message.
#
# Required env:
#   TARGET   e.g. "user:ou_xxx" or "chat:oc_xxx"
# Optional env:
#   CHANNEL     default: feishu
#   LEAD_HOURS  default: 6
#   SCRIPT      default: <this-dir>/refresh_iflow_apikey.py
#   LOGDIR      default: /home/ubuntu/.openclaw/workspace/iflow/logs

TARGET="${TARGET:?Missing env TARGET (e.g. user:ou_xxx)}"
CHANNEL="${CHANNEL:-feishu}"
LEAD_HOURS="${LEAD_HOURS:-6}"

SCRIPT_DEFAULT="$(cd "$(dirname "$0")" && pwd)/refresh_iflow_apikey.py"
SCRIPT="${SCRIPT:-$SCRIPT_DEFAULT}"

LOGDIR="${LOGDIR:-/home/ubuntu/.openclaw/workspace/iflow/logs}"
mkdir -p "$LOGDIR"

TS="$(date +"%Y%m%d-%H%M%S")"
LOG="$LOGDIR/run-$TS.log"

set +e
OUT=$(python3 "$SCRIPT" --lead-hours "$LEAD_HOURS" 2>&1)
CODE=$?
set -e

printf "%s\n" "$OUT" | tee "$LOG" >/dev/null

send_msg() {
  local msg="$1"
  openclaw message send --channel "$CHANNEL" --target "$TARGET" --message "$msg" >/dev/null
}

if [[ $CODE -eq 10 ]]; then
  APIKEY=$(echo "$OUT" | sed -n 's/.*apiKey=\([^ ]*\).*/\1/p' | tail -n 1)
  EXPIRE=$(echo "$OUT" | sed -n 's/.*expireTime="\([^"]*\)".*/\1/p' | tail -n 1)
  if [[ -n "${APIKEY:-}" ]]; then
    send_msg "iFlow API Key 已自动刷新 ✅\nexpireTime: ${EXPIRE:-unknown}\napiKey: ${APIKEY}"
  else
    send_msg "iFlow 自动刷新执行成功，但未能从输出解析 apiKey（请看日志）。\n${OUT}"
  fi
  exit 0
elif [[ $CODE -eq 0 ]]; then
  exit 0
else
  send_msg "iFlow API Key 自动刷新失败 ❌（exit=$CODE）\n${OUT:0:1200}"
  exit 0
fi
