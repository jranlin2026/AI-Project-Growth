#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function envList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tasklistsFromEnv() {
  const raw = process.env.FEISHU_TASKLIST_GUID || "";
  const guid = raw.trim();
  return guid ? [{ tasklist_guid: guid }] : [];
}

function members(openIds, role = "assignee") {
  return openIds.map((id) => ({
    id,
    type: "user",
    role
  }));
}

function taskLink(taskGuid) {
  return `https://applink.feishu.cn/client/todo/detail?guid=${encodeURIComponent(taskGuid)}&authscene=1`;
}

function getTaskGuid(task) {
  return task?.guid || task?.task_guid || task?.task_id || task?.id;
}

const now = new Date();
const dateLabel = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(now);

const due = new Date("2026-07-04T21:00:00+08:00");
const assigneeOpenIds = [
  ...envList("FEISHU_LIN_OPEN_IDS"),
  ...envList("FEISHU_DIRECTOR_A_OPEN_IDS")
];

const task = {
  summary: `${dateLabel} 市场素材提交测试：只交链接、文案、评论截图`,
  description: [
    "这是测试任务，用来跑通“群里派工 + 飞书任务 + 截止时间”的市场素材流程。",
    "",
    "今晚 21:00 前，在飞书群里各提交 1 条市场素材，只交三样：",
    "1. 视频链接",
    "2. 视频文案",
    "3. 评论区截图",
    "",
    "不用写为什么值得看，也不用分析。判断和改写由 Codex 增长负责人来做。",
    "",
    "提交格式：",
    "【市场素材】",
    "1. 视频链接：",
    "2. 视频文案：",
    "3. 评论区截图：已发/见图",
    "",
    "验收标准：群里能看到链接、文案、评论截图；任务评论里回复“已提交”。"
  ].join("\n"),
  due: {
    timestamp: String(due.getTime()),
    is_all_day: false
  },
  members: members(assigneeOpenIds),
  tasklists: tasklistsFromEnv()
};

const response = await feishuRequest("/task/v2/tasks?user_id_type=open_id", {
  method: "POST",
  body: JSON.stringify(task)
});

const createdTask = response.data?.task || response.data;
const guid = getTaskGuid(createdTask);

console.log(JSON.stringify({
  summary: createdTask?.summary || task.summary,
  guid,
  url: guid ? taskLink(guid) : null,
  assigneeCount: assigneeOpenIds.length
}, null, 2));
