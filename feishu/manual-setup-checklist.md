# 飞书手动配置清单

## 1. 飞书群机器人

你需要手动做：

1. 打开 AI 商业 IP 项目群。
2. 添加自定义机器人。
3. 复制 Webhook 地址。
4. 如果启用签名校验，复制签名密钥。
5. 在项目根目录创建 `.env`，填入：

```text
FEISHU_WEBHOOK_URL=你的群机器人Webhook
FEISHU_WEBHOOK_SECRET=你的签名密钥，没有则留空
```

测试：

```powershell
node scripts/feishu/send-webhook.mjs --text "AI商业IP增长项目飞书机器人测试"
```

## 2. 飞书任务

你需要手动做：

1. 打开飞书左侧“任务”。
2. 创建一个任务清单，例如：`AI商业IP增长项目每日作战`。
3. 先手动创建一次父任务和子任务，确认团队成员能看到、能更新状态。
4. 如果后续要让 Codex 自动创建飞书任务，需要在飞书开放平台给企业自建应用开通任务 API 权限。

建议父任务：

```text
YYYY-MM-DD AI商业IP增长项目 Day X 作战任务
```

建议子任务：

- 林总：完成今日出镜拍摄
- 编导A：完成今日脚本和明日选题
- 编导B：完成剪辑、发布、评论承接和数据记录
- 编导B：填写视频数据记录

## 3. 多维表格

你需要手动创建两个多维表格：

1. `AI商业IP增长项目_每日作战日报`
2. `AI商业IP增长项目_视频数据记录`

字段按 `feishu/daily-report-schema.md` 创建。

创建完成后，记录：

```text
FEISHU_DAILY_REPORT_APP_TOKEN=
FEISHU_DAILY_REPORT_TABLE_ID=
FEISHU_VIDEO_DATA_APP_TOKEN=
FEISHU_VIDEO_DATA_TABLE_ID=
```

填入项目根目录 `.env`。

## 4. 飞书开放平台应用

如果要让 Codex 读取多维表格或自动创建任务，需要手动做：

1. 进入飞书开放平台。
2. 创建企业自建应用。
3. 获取 `app_id` 和 `app_secret`。
4. 开通多维表格读取/写入权限。
5. 如果要自动创建飞书任务，开通任务相关权限。
6. 把应用添加到对应飞书群或授权给对应文档。

填入 `.env`：

```text
FEISHU_APP_ID=
FEISHU_APP_SECRET=
```

## 5. 第一阶段验收

先只验收三件事：

1. `send-webhook.mjs` 能成功发消息到飞书群。
2. 组员能在飞书任务里看到今日任务并更新状态。
3. `read-bitable-records.mjs` 能读取多维表格日报记录。

这三件事跑通后，再做自动创建飞书任务。

