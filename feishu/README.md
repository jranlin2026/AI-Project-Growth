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
| `scripts/feishu/list-bitable-tables.mjs` | 列出多维表格中的 table_id |
| `scripts/feishu/list-bitable-fields.mjs` | 列出多维表格中的字段 |
| `scripts/feishu/setup-bitable-fields.mjs` | 自动补齐日报和视频数据字段 |
| `scripts/feishu/create-bitable-record.mjs` | 创建一条日报或视频数据测试记录 |
| `scripts/feishu/read-bitable-records.mjs` | 读取多维表格记录 |
| `scripts/feishu/create-daily-tasks.mjs` | 创建飞书每日父任务和子任务 |
| `scripts/feishu/create-day1-official-tasks.mjs` | 用 UTF-8 脚本重建 Day1 详细正式任务，避免 PowerShell 中文转码 |
| `scripts/feishu/update-day1-s001-oral-tasks.mjs` | 把 Day1 S001 飞书任务更新为口语化拍摄、剪辑和数据指令 |
| `scripts/feishu/add-task-members.mjs` | 给已存在的任务补负责人或关注人 |
| `scripts/feishu/create-tasklist.mjs` | 创建由应用拥有并共享给成员的任务清单 |
| `scripts/feishu/delete-task.mjs` | 删除测试任务或废弃任务 |
| `scripts/feishu/get-user-ids.mjs` | 用手机号或邮箱换取成员 open_id/user_id |
| `scripts/feishu/search-tasklists.mjs` | 搜索飞书任务清单 GUID |
| `scripts/feishu/list-tasklist-tasks.mjs` | 读取指定任务清单下的任务 |
| `scripts/feishu/list-subtasks.mjs` | 读取某个父任务下的子任务 |

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

创建飞书任务 API 测试任务：

```powershell
node scripts/feishu/get-user-ids.mjs --mobile "手机号1,手机号2,手机号3"
node scripts/feishu/get-user-ids.mjs --email "邮箱1,邮箱2,邮箱3"
node scripts/feishu/search-tasklists.mjs --keyword "AI商业IP增长项目"
node scripts/feishu/create-tasklist.mjs --name "AI商业IP增长项目每日作战-Codex自动化"
node scripts/feishu/create-daily-tasks.mjs --test
node scripts/feishu/create-daily-tasks.mjs --test --no-tasklist
node scripts/feishu/list-subtasks.mjs --task-guid "父任务guid"
```

创建今日父任务和子任务：

```powershell
node scripts/feishu/create-daily-tasks.mjs
```

读取日报表记录：

```powershell
node scripts/feishu/list-bitable-tables.mjs --app-token $env:FEISHU_DAILY_REPORT_APP_TOKEN
node scripts/feishu/list-bitable-fields.mjs --app-token $env:FEISHU_DAILY_REPORT_APP_TOKEN --table-id $env:FEISHU_DAILY_REPORT_TABLE_ID
node scripts/feishu/setup-bitable-fields.mjs
node scripts/feishu/create-bitable-record.mjs --schema daily
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
