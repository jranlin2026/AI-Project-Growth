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
const pengMembers = membersFromEnv("FEISHU_DIRECTOR_B_OPEN_IDS");

const parentTask = {
  summary: `${label} AI商业IP增长项目 Day3 作战任务：补齐 S002 闭环`,
  description: [
    "今日目标：不重新开新题，先把 S002《别再收藏 AI 工具了，你公司真正缺的是 AI 流程》跑成闭环。",
    "",
    "排班：阿浩今天周日休息，不安排任务；N哥负责素材确认/补拍；小彭负责剪辑发布、朋友圈和数据反馈。",
    "",
    "执行包：04_每日作战记录/2026-07-05_Day3正式执行包.md",
    "",
    "17:30 前最低反馈：视频是否发布、链接、初始数据、朋友圈截图、有没有私信或真实问题。"
  ].join("\n"),
  due: { timestamp: shanghaiTimestamp(today, 17, 30), is_all_day: false },
  members: [...nMembers, ...pengMembers],
  tasklists: list
};

const subtasks = [
  {
    summary: "N哥：12:00 前确认或补拍 S002《别再收藏 AI 工具了》",
    description: [
      "今天只处理 S002，不重新开新题。",
      "",
      "如果昨天 S002 已经拍好：",
      "1. 在任务评论里确认素材可用。",
      "2. 说明最佳开头是哪一版：A/B/C。",
      "",
      "如果昨天没拍或素材不可用：",
      "1. 12:00 前补拍 S002。",
      "2. 至少录开头 A/B/C 和主版口播 1 遍。",
      "3. 素材命名：S002_A、S002_B、S002_C、S002_main、S002_short。",
      "",
      "主开头优先：你收藏的 AI 工具越多，公司可能越乱。",
      "",
      "核心口径：工具只能解决一个动作，流程才能解决一件事。",
      "",
      "完成后在任务评论回复：已拍/未拍/可用素材/最佳开头。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 12), is_all_day: false },
    members: nMembers,
    tasklists: list
  },
  {
    summary: "小彭：17:30 前剪辑并发布 S002",
    description: [
      "素材可用后，今天你主责 S002 剪辑和发布。",
      "",
      "标题：老板做 AI，别先收藏工具",
      "封面字：老板做 AI / 别先收藏工具",
      "",
      "剪辑重点：",
      "1. 前 3 秒优先用 A 版：你收藏的 AI 工具越多，公司可能越乱。",
      "2. 字幕突出：工具只能解决一个动作；流程才能解决一件事；AI 应该装进流程里。",
      "3. 保留口语感，不要剪成工具课或硬广。",
      "",
      "发布文案：",
      "很多老板做 AI，不是输在工具少，而是输在流程没拆清楚。",
      "工具只能解决一个动作，流程才能解决一件事。",
      "想要《老板AI落地实战地图》的，评论区打“实战地图”。",
      "",
      "置顶评论：",
      "想要《老板AI落地实战地图》的，评论区打“实战地图”，我发你。",
      "",
      "17:30 前反馈：是否发布、视频链接、发布时间、播放/点赞/评论、实战地图评论数、卡点。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 17, 30), is_all_day: false },
    members: pengMembers,
    tasklists: list
  },
  {
    summary: "小彭：18:00 前发布朋友圈文案并反馈私域数据",
    description: [
      "今天加一条朋友圈，用来承接私域信任，不要改成硬广。",
      "",
      "朋友圈文案：",
      "最近发现很多老板做 AI，都卡在同一个地方：",
      "",
      "工具收藏了一堆，员工也试了几个，但公司效率没有明显变化。",
      "",
      "问题通常不是工具不够好。",
      "",
      "而是你还没拆清楚：公司到底哪条流程最值得先被 AI 改。",
      "",
      "比如获客，不是让 AI 写一篇文案就结束了。",
      "客户从哪里来，谁来跟进，客户问了什么，最后怎么成交，这些才是流程。",
      "",
      "流程清楚以后，AI 才知道应该帮你做哪一步。",
      "",
      "我整理了一份《老板AI落地实战地图》，里面讲的就是老板怎么先找问题、再拆流程、最后选工具。",
      "",
      "需要的可以私信我。",
      "",
      "配图建议：老板AI落地实战地图截图 / S002封面图 / 白板图“问题 -> 流程 -> 工具”。",
      "",
      "发完反馈：朋友圈截图、评论数、私信数、用户真实问题。"
    ].join("\n"),
    due: { timestamp: shanghaiTimestamp(today, 18), is_all_day: false },
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
