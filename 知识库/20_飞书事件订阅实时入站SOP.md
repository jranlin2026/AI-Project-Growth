---
类型: 自动化SOP
状态: 已沉淀
创建时间: 2026-07-06
来源: 飞书事件订阅实时入站测试
tags:
  - AI商业IP
  - 飞书
  - 事件订阅
  - 实时入站
---

# 飞书事件订阅实时入站SOP

## 一句话结论

我不能凭空“盯着”飞书群。要做到实时反应，需要让飞书开放平台把群消息事件推送到一个公网服务地址，再由本项目的事件接收服务写入收件箱，后续由 Codex 处理、回复、拆选题或创建任务。

## 已新增脚本

```powershell
node scripts/feishu/event-server.mjs
node scripts/feishu/test-event-server.mjs
node scripts/feishu/process-event-inbox.mjs
node scripts/feishu/process-event-inbox.mjs --send
```

脚本分工：

- `event-server.mjs`：接收飞书事件订阅推送，支持 URL 校验、消息事件入站、可选加密校验。
- `test-event-server.mjs`：本地模拟飞书 URL 校验和群消息事件。
- `process-event-inbox.mjs`：读取待处理动作，先 dry-run，确认后再加 `--send` 发群确认。

## 本地测试命令

启动服务：

```powershell
node scripts/feishu/event-server.mjs
```

另开一个终端测试：

```powershell
node scripts/feishu/test-event-server.mjs
node scripts/feishu/process-event-inbox.mjs
```

测试通过的表现：

```text
URL verification 返回 challenge
im.message.receive_v1 返回 queued_action=true
process-event-inbox 输出 pending_count > 0
```

## 飞书后台需要人工配置

在飞书开放平台的企业自建应用里配置：

1. 开启机器人能力，并确认机器人在 `AI商业IP增长项目组` 群里。
2. 开通群消息事件所需权限，至少包括群消息读取或接收相关权限。
3. 在“事件订阅”里配置请求地址：

```text
https://你的公网域名/feishu/events
```

4. 填写并保存 Verification Token。
5. 如开启 Encrypt Key，把它写入本地或云端环境变量。
6. 订阅事件：`im.message.receive_v1`。
7. 发布应用版本，让权限和事件订阅生效。

## 环境变量

```text
FEISHU_EVENT_HOST=0.0.0.0
FEISHU_EVENT_PORT=8787
FEISHU_EVENT_PATH=/feishu/events
FEISHU_VERIFICATION_TOKEN=
FEISHU_EVENT_ENCRYPT_KEY=
FEISHU_EVENT_INBOX_PATH=data/feishu-event-inbox.jsonl
FEISHU_EVENT_ACTION_PATH=data/feishu-event-actions.jsonl
FEISHU_EVENT_STATE_PATH=data/feishu-event-processed.json
FEISHU_EVENT_REPLY_MODE=log
```

本地测试可以不填 Encrypt Key。正式接入公网服务时建议启用。

## 实战处理策略

收到群消息后，不建议服务端立即做复杂判断或直接调用大模型。更稳的方式是：

```text
飞书推送事件 -> 写入收件箱 -> 生成待处理动作 -> Codex/定时任务处理 -> 必要时发群回复或创建任务
```

这样即使飞书短时间内推送多条消息，也不会卡住事件回调。

## 当前边界

本地电脑运行 `event-server.mjs` 只能本地测试，飞书云端访问不到 `127.0.0.1`。正式实时入站需要二选一：

1. 把服务部署到云服务器或 Vercel/Render 等平台。
2. 用 ngrok、Cloudflare Tunnel 等工具把本地端口临时暴露到公网。

如果电脑关机，本地服务就会停止；云端部署后才是真正全天候实时。
