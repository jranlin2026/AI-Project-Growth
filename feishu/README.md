# 飞书每日任务闭环实施说明

## 目标

把当前 Codex 每日 08:00 / 17:00 作战机制接入飞书：

- 08:00：Codex 生成今日作战任务，推送到飞书群，并创建/提醒飞书任务。
- 17:00：飞书群提醒组员更新任务状态并填写日报。
- 晚上：Codex 读取飞书多维表格日报和视频数据，复盘并生成第二天任务。

## 推荐分工

| 飞书能力 | 用途 |
| --- | --- |
| 飞书任务 | 正式派工、负责人、截止时间、完成状态 |
| 飞书群机器人 | 08:00 任务提醒、17:00 日报提醒、复盘摘要广播 |
| 飞书多维表格 | 日报、视频数据、线索数据、复盘数据源 |

## 你需要手动准备

1. 在飞书项目群里添加“自定义机器人”，复制 Webhook。
2. 如果启用签名校验，复制机器人密钥。
3. 创建“每日作战日报”多维表格。
4. 创建“视频数据记录”多维表格。
5. 在飞书开放平台创建企业自建应用，获取 `app_id` 和 `app_secret`。
6. 给应用开通多维表格读取/写入权限；如果要自动创建飞书任务，再开通任务相关权限。
7. 把真实配置写入项目根目录 `.env`，不要提交到 GitHub。

## 本地文件

| 文件 | 作用 |
| --- | --- |
| `feishu/.env.example` | 飞书密钥和表格 ID 模板 |
| `feishu/role-map.json` | 项目成员和角色配置 |
| `feishu/daily-report-schema.md` | 日报与视频数据字段 |
| `feishu/manual-setup-checklist.md` | 需要你在飞书里手动完成的配置清单 |
| `scripts/feishu/send-webhook.mjs` | 发送飞书群消息 |
| `scripts/feishu/generate-daily-task.mjs` | 从项目文件生成每日任务文本 |
| `scripts/feishu/feishu-openapi.mjs` | 飞书 OpenAPI 工具函数 |
| `scripts/feishu/read-bitable-records.mjs` | 读取多维表格记录 |

## 第一阶段测试命令

复制配置：

```powershell
Copy-Item feishu/.env.example .env
```

填好 `.env` 后，测试群机器人：

```powershell
node scripts/feishu/send-webhook.mjs --text "AI商业IP增长项目飞书机器人测试"
```

生成今日任务文本：

```powershell
node scripts/feishu/generate-daily-task.mjs
```

生成并推送今日任务：

```powershell
node scripts/feishu/generate-daily-task.mjs | node scripts/feishu/send-webhook.mjs
```

读取日报表记录：

```powershell
node scripts/feishu/read-bitable-records.mjs --app-token $env:FEISHU_DAILY_REPORT_APP_TOKEN --table-id $env:FEISHU_DAILY_REPORT_TABLE_ID
```

## 自动化接入点

当前 Codex 自动化：

```text
id: ai-ip-08
name: AI商业IP增长项目 - 每日08点任务与17点日报
```

接入飞书后的逻辑：

- 08:00：运行 `generate-daily-task.mjs`，再调用 `send-webhook.mjs` 发群消息。
- 17:00：调用 `send-webhook.mjs` 发送日报提醒和表格链接。
- 晚上复盘：调用 `read-bitable-records.mjs` 读取日报和视频数据。
