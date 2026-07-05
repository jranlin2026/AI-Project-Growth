---
类型: 自动化SOP
状态: 已沉淀
创建时间: 2026-07-05
来源: 飞书群市场素材测试
tags:
  - AI商业IP
  - 飞书
  - 市场素材
  - 入站同步
---

# 飞书群消息入站同步 SOP

## 一句话结论

飞书群机器人 Webhook 只能把 Codex 的消息发到群里，不能自动把群里的消息推回给 Codex。所以阿浩、小彭在群里发了“链接、文案、截图”后，Codex 不会马上有反应。要让我能处理群消息，必须补一条“入站读取”链路：用飞书开放平台应用读取群消息，再同步成市场素材池。

## 当前状态

已补本地脚本：

```powershell
node scripts/feishu/list-chats.mjs
node scripts/feishu/list-chat-messages.mjs --chat-id <chat_id> --hours 24
node scripts/feishu/sync-market-materials-from-chat.mjs --hours 24
```

当前阻塞点：

```text
飞书开放平台应用还没有群聊读取权限，所以暂时不能读取群列表和群消息。
```

## 需要手动开通的飞书权限

在飞书开放平台进入当前自建应用，给应用开通权限并发布版本：

1. 群聊读取权限：优先开 `im:chat:readonly` 或 `im:chat.group_info:readonly`。
2. 消息读取权限：开通消息读取相关权限，用于读取群内最近消息。
3. 确认应用或机器人已经在 `AI商业IP增长项目组` 群里。
4. 发布应用版本，让权限生效。

权限生效后运行：

```powershell
node scripts/feishu/list-chats.mjs
```

从返回结果里找到 `AI商业IP增长项目组`，复制它的 `chat_id`，写入 `.env`：

```text
FEISHU_MARKET_MATERIAL_CHAT_ID=<chat_id>
```

## 日常同步流程

素材提交仍然保持最简单的三件套：

```text
1. 视频链接
2. 视频文案
3. 评论区截图
```

阿浩、小彭不需要解释“为什么值得看”，判断由增长负责人完成。

Codex 在 12:00 轻检查、17:00 复盘或手动触发时运行：

```powershell
node scripts/feishu/sync-market-materials-from-chat.mjs --hours 24
```

脚本会把群消息整理到：

```text
04_每日作战记录/YYYY-MM-DD_市场素材入站同步.md
数据/市场素材池.jsonl
```

## Codex 读取后的处理规则

同步到素材池后，增长负责人只做四件事：

1. 筛掉泛流量内容，只保留老板会关心的线索成交型内容。
2. 拆解开头、痛点、方法、行动指令和评论承接。
3. 选出 1 条可迁移母模板，改写成 AI 商业 IP 场景。
4. 生成次日执行包：完整脚本、拍摄要求、剪辑要求、发布文案和飞书任务。

## 为什么不要求实时秒回

第一阶段目标是跑通增长闭环，不追求技术炫技。群消息读取采用轮询更稳：

```text
人发素材 -> Codex 定时读取 -> 形成素材池 -> 拆解成选题/脚本 -> 派发任务
```

后续如果需要“群里一发我马上处理”，再升级飞书事件订阅，把群消息事件推送到云端服务。

## 验收标准

1. `node scripts/feishu/list-chats.mjs` 能看到 `AI商业IP增长项目组`。
2. `.env` 已配置 `FEISHU_MARKET_MATERIAL_CHAT_ID`。
3. `node scripts/feishu/list-chat-messages.mjs --hours 24` 能读取群消息。
4. `node scripts/feishu/sync-market-materials-from-chat.mjs --hours 24` 能生成当天市场素材同步文件。
5. 08:00/12:00/17:00 SOP 里可以使用素材池，而不是只靠人工截图给 Codex 看。
