# 飞书每日作战闭环实施说明

## 目标

把 Codex 增长负责人接入飞书，让项目每天形成一个稳定闭环：

- 08:00：生成今日执行包，发送群消息和完整脚本文档，创建飞书任务。
- 12:00：轻检查，确认拍摄、剪辑、账号和素材是否卡住。
- 17:00：提醒更新任务状态、提交数据、沉淀复盘。
- 群消息入站：阿浩、小彭在群里提交对标素材后，Codex 可以通过读取或事件订阅进入素材池。

## 核心文件

| 文件 | 作用 |
| --- | --- |
| `feishu/.env.example` | 飞书环境变量模板 |
| `feishu/manual-setup-checklist.md` | 需要人工在飞书后台完成的配置 |
| `scripts/feishu/send-webhook.mjs` | 发送飞书群机器人消息 |
| `scripts/feishu/create-daily-tasks.mjs` | 创建每日父任务和子任务 |
| `scripts/feishu/list-tasklist-tasks.mjs` | 读取任务清单，验证任务是否创建成功 |
| `scripts/feishu/list-chats.mjs` | 读取应用可见群聊 |
| `scripts/feishu/list-chat-messages.mjs` | 读取群聊历史消息 |
| `scripts/feishu/sync-market-materials-from-chat.mjs` | 把群消息整理成市场素材池 |
| `scripts/feishu/event-server.mjs` | 接收飞书事件订阅推送 |
| `scripts/feishu/process-event-inbox.mjs` | 处理事件收件箱里的待回复动作 |
| `scripts/feishu/test-event-server.mjs` | 本地模拟飞书事件订阅测试 |

## 常用命令

测试群机器人：

```powershell
node scripts/feishu/send-webhook.mjs --text "AI商业IP增长项目飞书机器人测试"
```

读取群消息并同步素材：

```powershell
node scripts/feishu/list-chats.mjs
node scripts/feishu/list-chat-messages.mjs --hours 24
node scripts/feishu/sync-market-materials-from-chat.mjs --hours 24
```

创建和检查飞书任务：

```powershell
node scripts/feishu/create-daily-tasks.mjs
node scripts/feishu/list-tasklist-tasks.mjs
```

启动事件订阅接收服务：

```powershell
node scripts/feishu/event-server.mjs
```

本地模拟飞书事件：

```powershell
node scripts/feishu/test-event-server.mjs
node scripts/feishu/process-event-inbox.mjs
```

确认后再发送自动确认消息：

```powershell
node scripts/feishu/process-event-inbox.mjs --send
```

## 当前推荐策略

第一阶段优先使用“定时读取群消息”跑通增长闭环；它更稳定，也更容易排查。

第二阶段再接入“飞书事件订阅”，实现群里一发素材，系统马上进入收件箱。事件订阅需要一个公网可访问的服务地址，本地电脑直接运行只能用于测试。

