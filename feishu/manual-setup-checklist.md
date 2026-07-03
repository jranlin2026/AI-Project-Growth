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
4. 复制这个任务清单的链接，或拿到任务清单 GUID，填入 `.env` 的 `FEISHU_TASKLIST_URL` 或 `FEISHU_TASKLIST_GUID`。
5. 拿到需要派工成员的飞书 `open_id`，填入 `.env` 的成员配置。
6. 如果后续要让 Codex 自动创建飞书任务，需要在飞书开放平台给企业自建应用开通任务 API 权限。

飞书界面不会直接展示成员 `open_id`。推荐做法是用成员手机号或邮箱换取：

```powershell
node scripts/feishu/get-user-ids.mjs --mobile "手机号1,手机号2,手机号3"
node scripts/feishu/get-user-ids.mjs --email "邮箱1,邮箱2,邮箱3"
```

如果接口提示没有权限，需要在飞书开放平台给企业自建应用开通通讯录相关权限，并发布版本使权限生效。当前脚本需要的精确权限是：

```text
contact:user.id:readonly
```

飞书开放平台里通常会显示为“通过手机号或邮箱获取用户 ID / 获取用户 ID”一类权限。

自动创建飞书任务至少需要开通以下权限之一：

- `task:task:write`
- `task:task:writeonly`

如果要让 Codex 自动读取、创建或维护飞书任务清单，还需要开通以下权限之一：

- `task:tasklist:write`
- `task:tasklist:writeonly`
- `task:tasklist:read`（只读取清单任务时可用）

开通后需要发布应用版本，使权限生效。

任务可见性排障：

- 如果 API 创建成功，但你在飞书任务清单里看到 0 个任务，通常是任务没有绑定到 `FEISHU_TASKLIST_GUID`。
- 如果右侧提示“暂无权限查看该任务”，通常是任务由企业应用创建，但没有把你或组员加为负责人/关注人。
- 如果接口返回 `Invoker is unauthorized to add task to tasklist`，说明应用对该清单没有可编辑权限。可以把应用加为清单可编辑协作成员；如果飞书界面不支持直接加应用，则让 Codex 通过 `create-tasklist.mjs` 创建一个应用拥有的新清单，再共享给成员。
- 解决方式是在 `.env` 补齐任务清单和成员配置后，重新运行 `node scripts/feishu/create-daily-tasks.mjs --test`。

`.env` 需要补齐：

```text
FEISHU_TASKLIST_GUID=
FEISHU_TASKLIST_URL=
FEISHU_TASK_OWNER_OPEN_IDS=
FEISHU_TASK_FOLLOWER_OPEN_IDS=
FEISHU_LIN_OPEN_IDS=
FEISHU_DIRECTOR_A_OPEN_IDS=
FEISHU_DIRECTOR_B_OPEN_IDS=
```

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

如果读取可以、创建字段或写入记录时报 `91403 Forbidden`，还需要检查两件事：

1. 在开放平台给应用开通多维表格写入权限，例如 `bitable:app` 或 `bitable:app:write` 一类权限，并发布版本使权限生效。
2. 在对应多维表格里把这个应用添加为协作者，并授予可编辑权限。只在开放平台开 scope 不一定够，文档本身也要允许该应用编辑。

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
