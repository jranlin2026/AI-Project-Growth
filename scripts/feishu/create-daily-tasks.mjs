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
    }
  }
  return args;
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

function taskLink(taskGuid) {
  return `https://applink.feishu.cn/client/todo/detail?guid=${encodeURIComponent(taskGuid)}&authscene=1`;
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
const dateLabel = shanghaiDateLabel();
const due17 = shanghaiTimestampMs(17);
const due2130 = shanghaiTimestampMs(21, 30);

const parentTask = {
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
        "17:00 前更新任务状态，并在多维表格填写日报。"
      ].join("\n"),
  due: {
    timestamp: String(due17),
    is_all_day: false
  },
  origin: {
    platform_i18n_name: "Codex 增长负责人",
    href: {
      title: "AI商业IP增长项目",
      url: "https://github.com/jranlin2026/AI-Project-Growth"
    }
  }
};

const subtasks = args.test
  ? [
      {
        summary: "系统测试子任务：确认任务 API 可创建子任务",
        description: "系统测试，可删除。",
        due: { timestamp: String(due17), is_all_day: false }
      }
    ]
  : [
      {
        summary: "林总：完成今日出镜拍摄",
        description: "17:00 前完成 S001 口播录制，至少录 2 个开头版本。重点表达：最贵问题 -> 流程拆解 -> 工具匹配。",
        due: { timestamp: String(due17), is_all_day: false }
      },
      {
        summary: "编导A：完成今日脚本和明日选题",
        description: "检查 S001 口播表达是否顺口；准备明天 3 条认知纠偏脚本备选；记录评论区/群内可二创选题。",
        due: { timestamp: String(due17), is_all_day: false }
      },
      {
        summary: "编导B：完成剪辑、发布、评论承接和数据记录",
        description: "按《剪辑工作台.md》完成 S001 成片；按《发布记录.md》准备账号 B 发布；盯评论“实战地图”“怎么拿”“适合什么行业”“怎么落地”。",
        due: { timestamp: String(due17), is_all_day: false }
      },
      {
        summary: "编导B：填写视频数据记录",
        description: "在飞书多维表格填写每条视频数据，包括播放、点赞、评论、实战地图评论、私信、进群、老板型线索和真实业务问题。",
        due: { timestamp: String(due2130), is_all_day: false }
      }
    ];

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

