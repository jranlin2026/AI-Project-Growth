#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--test") {
      args.test = true;
    } else if (token === "--no-tasklist") {
      args.noTasklist = true;
    } else if (token === "--date") {
      args.date = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function dateFromArg(value) {
  if (!value) return new Date();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Use --date in YYYY-MM-DD format.");
  }
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 4, 0, 0, 0));
}

function shanghaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function shanghaiTimestampMs(hour, minute = 0, date = new Date()) {
  const { year, month, day } = shanghaiDateParts(date);
  return Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 8, minute, 0, 0);
}

function shanghaiDateLabel(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });
  return formatter.format(date);
}

function shanghaiWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  }).format(date);
}

function taskLink(taskGuid) {
  return `https://applink.feishu.cn/client/todo/detail?guid=${encodeURIComponent(taskGuid)}&authscene=1`;
}

function extractGuid(value) {
  if (!value) return "";
  const guidMatch = value.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return guidMatch ? guidMatch[0] : value;
}

function tasklistsFromEnv(skipTasklist = false) {
  if (skipTasklist) return [];
  const raw = process.env.FEISHU_TASKLIST_GUID || process.env.FEISHU_TASKLIST_URL || "";
  return raw
    .split(",")
    .map((item) => extractGuid(item.trim()))
    .filter(Boolean)
    .map((guid) => ({ tasklist_guid: guid }));
}

function membersFromEnv(envName, role) {
  const raw = process.env[envName] || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((id) => ({ id, type: "user", role }));
}

function attachRouting(payload, memberEnvName, options = {}) {
  const tasklists = tasklistsFromEnv(options.noTasklist);
  const members = [
    ...membersFromEnv(memberEnvName, "assignee"),
    ...membersFromEnv("FEISHU_TASK_FOLLOWER_OPEN_IDS", "follower")
  ];
  if (tasklists.length > 0) payload.tasklists = tasklists;
  if (members.length > 0) payload.members = members;
  return payload;
}

function makeTask(payload, memberEnvName, options) {
  return attachRouting(payload, memberEnvName, options);
}

function availabilityNote(weekday) {
  if (weekday === "Sat") return "排班提醒：彭涵奕每周六休息，今天不分配编导B执行任务；剪辑/发布类工作默认使用前一工作日预排素材或顺延。";
  if (weekday === "Sun") return "排班提醒：朱勇浩每周日休息，今天不分配编导A执行任务；脚本/选题类工作默认使用前一工作日预备稿或由林总临时确认。";
  return "排班提醒：今日三人均按 09:00-18:00 工作制协作。";
}

async function createTask(payload) {
  const response = await feishuRequest("/task/v2/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.data?.task || response.data;
}

async function createSubtask(parentGuid, payload) {
  const response = await feishuRequest(`/task/v2/tasks/${parentGuid}/subtasks`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response.data?.task || response.data;
}

function getTaskGuid(task) {
  return task?.guid || task?.task_guid || task?.task_id || task?.id;
}

const args = parseArgs(process.argv.slice(2));
const runDate = dateFromArg(args.date);
const weekday = shanghaiWeekday(runDate);
const dateLabel = shanghaiDateLabel(runDate);
const due16 = shanghaiTimestampMs(16, 0, runDate);
const due17 = shanghaiTimestampMs(17, 0, runDate);
const due1730 = shanghaiTimestampMs(17, 30, runDate);

const parentTask = attachRouting({
  summary: args.test ? `${dateLabel} AI商业IP增长项目 飞书任务API测试` : `${dateLabel} AI商业IP增长项目 今日作战任务`,
  description: args.test
    ? "系统测试任务：用于验证 Codex 是否可以通过飞书任务 API 创建任务。测试完成后可删除。"
    : [
        "今日目标：跑通短视频矩阵第一天执行闭环。",
        "",
        "重点内容：S001/T001《老板做 AI，最不该先学工具》。",
        "核心观点：老板做 AI，第一步不是学工具，而是先找到公司最贵的问题。",
        "固定 CTA：评论区打“实战地图”。",
        "",
        availabilityNote(weekday),
        "工作时间：09:00-18:00。所有人工执行任务默认在 17:30 前完成状态更新和数据初填。"
      ].join("\n"),
  due: {
    timestamp: String(due17),
    is_all_day: false
  }
}, "FEISHU_TASK_OWNER_OPEN_IDS", { noTasklist: args.noTasklist });

const normalSubtasks = [
  makeTask({
    summary: "林总：完成今日出镜拍摄",
    description: "16:00 前完成 S001 口播录制，至少录 2 个开头版本。重点表达：最贵问题 -> 流程拆解 -> 工具匹配。",
    due: { timestamp: String(due16), is_all_day: false }
  }, "FEISHU_LIN_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导A：完成今日脚本和明日选题",
    description: "12:00 前检查 S001 口播表达是否顺口；17:30 前准备明天 3 条认知纠偏脚本备选；记录评论区/群内可二创选题。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_A_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导B：完成剪辑、发布、评论承接和数据记录",
    description: "17:30 前按《剪辑工作台.md》完成 S001 成片；按《发布记录.md》准备账号 B 发布；盯评论“实战地图”“怎么拿”“适合什么行业”“怎么落地”。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_B_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导B：填写视频数据记录",
    description: "17:30 前完成视频数据初填，包括账号、发布时间、标题、内容类型、开头钩子、播放、点赞、评论、实战地图评论、私信、进群、老板型线索和真实业务问题。次日上午 09:30 可补充隔夜数据。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_B_OPEN_IDS", { noTasklist: args.noTasklist })
];

const saturdaySubtasks = [
  makeTask({
    summary: "林总：完成今日出镜拍摄或确认预排素材",
    description: "16:00 前完成口播录制；若今日使用预排素材，则确认最终发布口径。彭涵奕周六休息，不安排剪辑/发布执行任务。",
    due: { timestamp: String(due16), is_all_day: false }
  }, "FEISHU_LIN_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导A：完成今日脚本复核和周日预备选题",
    description: "12:00 前复核今日脚本；17:30 前准备周日可直接使用的脚本/选题，避免周日朱勇浩休息时断档。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_A_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "林总：周六发布状态确认（彭休）",
    description: "17:30 前确认今天是否发布：优先使用周五已完成/预排素材；如没有可发布素材，则在任务评论里说明顺延原因和明天补救安排。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_LIN_OPEN_IDS", { noTasklist: args.noTasklist })
];

const sundaySubtasks = [
  makeTask({
    summary: "林总：完成今日出镜拍摄和脚本最终确认",
    description: "朱勇浩周日休息，今日脚本使用周六预备稿或由林总临时确认；16:00 前完成拍摄或最终素材确认。",
    due: { timestamp: String(due16), is_all_day: false }
  }, "FEISHU_LIN_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导B：完成剪辑、发布、评论承接",
    description: "17:30 前完成今日素材剪辑和发布；如果脚本需要微调，基于林总确认稿处理，不打扰朱勇浩休息。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_B_OPEN_IDS", { noTasklist: args.noTasklist }),
  makeTask({
    summary: "编导B：填写视频数据记录",
    description: "17:30 前完成视频数据初填；次日上午 09:30 可补充隔夜数据。",
    due: { timestamp: String(due1730), is_all_day: false }
  }, "FEISHU_DIRECTOR_B_OPEN_IDS", { noTasklist: args.noTasklist })
];

const workdaySubtasks = weekday === "Sat" ? saturdaySubtasks : weekday === "Sun" ? sundaySubtasks : normalSubtasks;

const subtasks = args.test
  ? [
      makeTask({
        summary: "系统测试子任务：确认任务 API 可创建子任务",
        description: "系统测试，可删除。",
        due: { timestamp: String(due17), is_all_day: false }
      }, "FEISHU_TASK_OWNER_OPEN_IDS", { noTasklist: args.noTasklist })
    ]
  : workdaySubtasks;

if (args.dryRun) {
  console.log(JSON.stringify({ parentTask, subtasks }, null, 2));
  process.exit(0);
}

const createdParent = await createTask(parentTask);
const parentGuid = getTaskGuid(createdParent);
if (!parentGuid) {
  throw new Error(`Could not find task guid in response: ${JSON.stringify(createdParent)}`);
}

const createdSubtasks = [];
for (const subtask of subtasks) {
  const created = await createSubtask(parentGuid, subtask);
  createdSubtasks.push(created);
}

const result = {
  parent: {
    guid: parentGuid,
    summary: createdParent.summary || parentTask.summary,
    url: taskLink(parentGuid)
  },
  subtasks: createdSubtasks.map((task) => {
    const guid = getTaskGuid(task);
    return {
      guid,
      summary: task?.summary,
      url: guid ? taskLink(guid) : null
    };
  })
};

console.log(JSON.stringify(result, null, 2));
