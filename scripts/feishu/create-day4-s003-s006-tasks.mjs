#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function shanghaiDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function shanghaiTimestamp(date, hour, minute = 0) {
  const { year, month, day } = shanghaiDateParts(date);
  return String(Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 8, minute, 0, 0));
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function idsFromEnv(name) {
  return (process.env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function membersFromEnv(name) {
  return idsFromEnv(name).map((id) => ({
    id,
    type: "user",
    role: "assignee"
  }));
}

function tasklists() {
  const raw = process.env.FEISHU_TASKLIST_GUID || process.env.FEISHU_TASKLIST_URL || "";
  const guidMatch = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const guid = guidMatch ? guidMatch[0] : raw.trim();
  return guid ? [{ tasklist_guid: guid }] : [];
}

function taskUrl(guid) {
  return `https://applink.feishu.cn/client/todo/detail?guid=${encodeURIComponent(guid)}&authscene=1`;
}

function getTaskGuid(task) {
  return task?.guid || task?.task_guid || task?.task_id || task?.id;
}

async function createTask(payload) {
  const response = await feishuRequest("/task/v2/tasks?user_id_type=open_id", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.data?.task || response.data;
}

async function createSubtask(parentGuid, payload) {
  const response = await feishuRequest(`/task/v2/tasks/${parentGuid}/subtasks?user_id_type=open_id`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.data?.task || response.data || {};
}

const today = new Date();
const label = dateLabel(today);
const list = tasklists();
const nMembers = membersFromEnv("FEISHU_LIN_OPEN_IDS");
const haoMembers = membersFromEnv("FEISHU_DIRECTOR_A_OPEN_IDS");
const pengMembers = membersFromEnv("FEISHU_DIRECTOR_B_OPEN_IDS");
const allMembers = [...nMembers, ...haoMembers, ...pengMembers];

const parentTask = {
  summary: `${label} AI商业IP增长项目 Day4 作战任务：4 条选题脚本拍摄测试`,
  description: [
    "今日目标：基于 2026-07-05 飞书群 6 条市场素材，输出并执行 4 条完整选题脚本。",
    "",
    "必拍：S003《老板做 AI 获客，别拍工具，拍成交场景》、S004《为什么招商型 IP 最容易变现》。",
    "备拍：S005《本地商家用 AI 获客，先找客户在哪》、S006《AI 案例展示容易爆，但别编造信任》。",
    "",
    "执行包：04_每日作战记录/2026-07-06_Day4正式执行包.md",
    "",
    "17:30 前最低反馈：拍了哪几条、发布哪条、视频链接、初始数据、实战地图评论数、卡点。"
  ].join("\n"),
  due: { timestamp: shanghaiTimestamp(today, 17, 30), is_all_day: false },
  members: allMembers,
  tasklists: list
};

const subtasks = [
  {
    summary: "N哥：14:30 前优先拍 S003、S004，状态好补拍 S005、S006",
    description: [
      "今天不用自己想选题，直接按执行包拍。",
      "",
      "必拍 1：S003《老板做 AI 获客，别拍工具，拍成交场景》",
      "核心句：工具只是过程，成交场景才是客户停下来的理由。",
      "",
      "必拍 2：S004《为什么招商型 IP 最容易变现？因为它拍的是老板最关心的 5 件事》",
      "核心结构：回报模型、运营干货、案例展示、创始人态度、交付体系。",
      "",
      "备拍：S005、S006，状态好就顺手拍。",
      "",
      "素材命名：S003_main、S004_main、S005_main、S006_main。每条至少录 1 个完整主版。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 14, 30), is_all_day: false },
    members: nMembers,
    tasklists: list
  },
  {
    summary: "阿浩：15:30 前复核 S003/S004，并补 2 条市场素材",
    description: [
      "今天你主责脚本复核和选题判断。",
      "",
      "15:30 前检查：",
      "1. S003 有没有讲成工具介绍。",
      "2. S004 有没有讲成招商承诺。",
      "3. 哪条更适合今天主发。",
      "",
      "判断标准：前 3 秒是否筛选老板，是否有明确业务场景，是否自然引到“实战地图”。",
      "",
      "17:30 前继续在群里补 2 条市场素材，仍然按三件套：链接、文案、评论区截图。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 17, 30), is_all_day: false },
    members: haoMembers,
    tasklists: list
  },
  {
    summary: "小彭：17:30 前剪辑发布 S003，S004 做备发/草稿",
    description: [
      "今天你主责剪辑发布。",
      "",
      "优先发布 S003。",
      "标题：老板做 AI 获客，别天天拍工具",
      "封面字：AI获客 / 别拍工具",
      "置顶评论：想要《老板AI落地实战地图》的，评论区打“实战地图”，我发你。",
      "",
      "S004 来得及就做备发/草稿。",
      "封面字：招商IP / 拍这5件事",
      "",
      "17:30 前反馈：发布链接、发布时间、初始播放/点赞/评论、实战地图评论数、私信数、卡点。",
      "",
      "也继续在群里补 2 条市场素材，按三件套提交。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 17, 30), is_all_day: false },
    members: pengMembers,
    tasklists: list
  }
];

const parent = await createTask(parentTask);
const parentGuid = getTaskGuid(parent);
if (!parentGuid) throw new Error(`Could not find parent task guid: ${JSON.stringify(parent)}`);

const createdSubtasks = [];
for (const subtask of subtasks) {
  createdSubtasks.push(await createSubtask(parentGuid, subtask));
}

console.log(JSON.stringify({
  parent: {
    guid: parentGuid,
    summary: parent.summary || parentTask.summary,
    url: taskUrl(parentGuid)
  },
  subtasks: createdSubtasks.map((task) => {
    const guid = getTaskGuid(task);
    return {
      guid,
      summary: task.summary,
      url: guid ? taskUrl(guid) : null
    };
  })
}, null, 2));
