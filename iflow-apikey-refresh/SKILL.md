---
name: iflow-apikey-refresh
description: "Auto-refresh iFlow (platform.iflow.cn) API key when near expiry, then proactively notify (Feishu DM) on success/failure. Safe: requires only iFlow cookie + XSRF, stored locally."
---

# iFlow API Key Auto Refresh（platform.iflow.cn）

从 iFlow 已登录会话中复用 Cookie + XSRF Token，自动刷新 OpenAPI Key，并在成功/失败时通过 OpenClaw 主动通知你。

> 说明：这个 skill **不会**把任何 Cookie/XSRF 写进 git 或聊天记录；只会引导你把最小必要 secret 写到本机 secrets 文件。

## 什么时候用

- iFlow API Key 7 天过期，想要自动刷新
- 想要“到期前自动换新 key，并把新 key 发到飞书”

## 需要你提供的最小信息

从浏览器 Network 里抓到的请求中提取（只要 iFlow 的）：
- `cookie: <cookie-string>`（只要 iFlow 相关 cookie 字符串，不要全量 cookie jar）
- `x-xsrf-token: <token>`
- body 里的 `name`（账号标识/手机号掩码等）

目标接口：
- `POST https://platform.iflow.cn/api/openapi/apikey`

预期返回：
```json
{ "success": true, "data": { "apiKey": "sk-...", "expireTime": "YYYY-MM-DD HH:MM" } }
```

## 文件（本机）

### 1) secrets（必须）
- `/home/ubuntu/.openclaw/workspace/secrets/iflow.json`（权限建议 0600）
- `/home/ubuntu/.openclaw/workspace/secrets/iflow_state.json`（脚本自动生成）

示例：
```json
{
  "name": "159****9753",
  "xsrf": "<x-xsrf-token>",
  "cookie": "<cookie>",
  "referer": "https://platform.iflow.cn/profile?tab=apiKey",
  "user_agent": "Mozilla/5.0 ...",
  "extra_headers": {
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "bx-v": "2.5.36"
  }
}
```

### 2) scripts（随 skill 提供）
- `scripts/refresh_iflow_apikey.py`：执行刷新（可 `--force`）
- `scripts/run_refresh_and_notify.sh`：包装器（到期才刷新；成功/失败主动发消息）

## 快速命令

手动强制刷新：
```bash
python3 ${SKILL_DIR}/scripts/refresh_iflow_apikey.py --force
```

执行包装器（建议用于 cron；需要 env TARGET）：
```bash
export TARGET="user:ou_xxx"   # 你的飞书 open_id
export CHANNEL="feishu"       # 可选

bash ${SKILL_DIR}/scripts/run_refresh_and_notify.sh
```

## 常见失败

- **401/未登录**：cookie 过期，重新登录后更新 cookie+xsrf
- **XSRF mismatch**：xsrf 与 cookie 不匹配，两个一起更新
- **CAPTCHA/2FA/反爬**：HTTP 回放失效，需要改成浏览器自动化 + 人工确认

## 安全红线（STOP）

- 不要粘贴/保存“全量 cookie 导出”，只要 iFlow 这一站的 cookie 字符串
- secrets 不要 commit，必须留在 `/home/ubuntu/.openclaw/workspace/secrets/`
