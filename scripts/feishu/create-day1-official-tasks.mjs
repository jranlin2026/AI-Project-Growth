#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    date: "",
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--date") {
      args.date = argv[i + 1] || "";
      i += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function runDate(value) {
  if (!value) return new Date();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("Use --date in YYYY-MM-DD format.");
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 4, 0, 0, 0));
}

function shanghaiDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function shanghaiTimestampMs(date, hour, minute = 0) {
  const { year, month, day } = shanghaiDateParts(date);
  return Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 8, minute, 0, 0);
}

function shanghaiDateLabel(date) {
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

function members(envName) {
  return idsFromEnv(envName).map((id) => ({
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
  return response.data?.task || response.data || {};
}

const args = parseArgs(process.argv.slice(2));
const date = runDate(args.date);
const dateLabel = shanghaiDateLabel(date);
const due16 = String(shanghaiTimestampMs(date, 16));
const due17 = String(shanghaiTimestampMs(date, 17));
const due1730 = String(shanghaiTimestampMs(date, 17, 30));
const list = tasklists();

const parentTask = {
  summary: `${dateLabel} AI商业IP增长项目 Day1 正式作战任务`,
  description: [
    "今日目标：验证“老板做 AI，第一步不是学工具，而是找公司最贵的问题”是否能吸引老板型用户评论、私信和索取资料。",
    "",
    "今日主选题：S001/T001《老板做 AI，最不该先学工具》",
    "目标账号：账号 B",
    "内容类型：认知纠偏",
    "固定 CTA：评论区打“实战地图”。",
    "",
    "执行包：04_每日作战记录/2026-07-03_Day1正式执行包.md",
    "",
    "今日必须完成：",
    "1. 林总拍 S001 两个开头版本。",
    "2. 朱勇浩检查 S001，并准备明天 3 条候选。",
    "3. 彭涵奕剪辑并发布 S001 到账号 B。",
    "4. 彭涵奕 17:30 前完成视频数据初填。",
    "",
    "注意：任务按执行包执行，不临场从零想选题、脚本、文案和拍法。"
  ].join("\n"),
  due: { timestamp: due17, is_all_day: false },
  members: members("FEISHU_TASK_OWNER_OPEN_IDS"),
  tasklists: list
};

const subtasks = [
  {
    summary: "林总：14:00-15:00 拍 S001 两个开头版本",
    description: [
      "拍摄脚本：S001《老板做 AI，最不该先学工具》",
      "",
      "开头版本 A：",
      "大部分老板学 AI 的顺序，一开始就是错的。",
      "",
      "开头版本 B：",
      "如果你学了很多 AI 工具，公司业务还是没变化，问题不在工具。",
      "",
      "完整口播稿：",
      "大部分老板学 AI 的顺序，一开始就是错的。",
      "你天天研究哪个工具好用、哪个模型厉害、哪个提示词更高级，但公司业务没有变化。",
      "为什么？",
      "因为老板做 AI，第一步不是学工具，而是先找到公司最贵的问题。",
      "比如获客成本高、销售跟进乱、客服重复回复、运营每天憋内容，这些才是 AI 应该先改造的地方。",
      "正确顺序是三步：先找最贵的问题，再把流程拆清楚，最后才选择 AI 工具去提效。",
      "工具只是手段，业务结果才是目的。",
      "我把这套方法整理成了一份《老板 AI 落地实战地图》，想要的评论区打“实战地图”。",
      "",
      "表达要求：不讲工具清单，不讲模型名，重点讲“业务问题优先于工具”。“最贵的问题”说慢一点。结尾必须说出“实战地图”。",
      "",
      "交付：素材文件标记 S001_A、S001_B。"
    ].join("\n"),
    due: { timestamp: due16, is_all_day: false },
    members: members("FEISHU_LIN_OPEN_IDS"),
    tasklists: list
  },
  {
    summary: "朱勇浩：检查 S001，并准备明日 3 条候选",
    description: [
      "今日不需要从零写脚本，只做检查和明日候选。",
      "",
      "12:00 前检查 S001：",
      "1. 林总说起来是否自然。",
      "2. “最贵的问题”这个观点是否突出。",
      "3. CTA 是否足够清楚。",
      "",
      "17:30 前准备明天 3 条候选，每条给标题、3 秒钩子、核心观点：",
      "",
      "T002《别再收藏 AI 工具了，你公司真正缺的是 AI 流程》",
      "钩子：你收藏的 AI 工具越多，公司可能越乱。",
      "观点：工具不是系统，老板要先搭流程。",
      "",
      "T003《为什么你的短视频发了很多，却没有客户》",
      "钩子：很多老板视频发了不少，但一个客户都没有。",
      "观点：内容不是为了热闹，是为了筛选精准客户。",
      "",
      "T005《你的销售不是不努力，是没有 AI 跟进系统》",
      "钩子：客户不是不买，很多时候是你跟丢了。",
      "观点：AI 应该先帮销售建立跟进节奏。",
      "",
      "交付：把检查意见和 3 条候选写到任务评论或日报。"
    ].join("\n"),
    due: { timestamp: due1730, is_all_day: false },
    members: members("FEISHU_DIRECTOR_A_OPEN_IDS"),
    tasklists: list
  },
  {
    summary: "彭涵奕：剪辑并发布 S001 到账号 B",
    description: [
      "剪辑任务：剪辑并发布 S001 到账号 B。",
      "",
      "剪辑要求：",
      "1. 优先用冲突更强的开头版本。",
      "2. 前 3 秒字幕重点：学 AI 的顺序错了。",
      "3. 中段字幕突出：找问题 / 拆流程 / 选工具。",
      "4. 结尾 CTA 字幕突出：评论区打“实战地图”。",
      "",
      "封面字：",
      "老板做 AI",
      "别先学工具",
      "",
      "发布账号：账号 B",
      "发布时间：17:00 前",
      "优先标题：老板做 AI，最不该先学工具",
      "备选标题：学了 20 个 AI 工具，公司为什么还是没变化？",
      "",
      "发布文案：",
      "老板做 AI，第一步不是追工具，而是先找到公司最贵的问题。",
      "获客贵、销售跟进乱、客服重复回复、内容生产慢，这些才是 AI 应该优先改造的地方。",
      "想要《老板 AI 落地实战地图》的，评论区打“实战地图”。",
      "",
      "置顶评论：",
      "想要《老板 AI 落地实战地图》的，评论区打“实战地图”，我发你。"
    ].join("\n"),
    due: { timestamp: due1730, is_all_day: false },
    members: members("FEISHU_DIRECTOR_B_OPEN_IDS"),
    tasklists: list
  },
  {
    summary: "彭涵奕：完成 S001 数据初填和评论承接",
    description: [
      "17:30 前完成 S001 数据初填，次日 09:30 补隔夜数据。",
      "",
      "必须填写字段：",
      "1. 账号：账号 B",
      "2. 发布时间",
      "3. 标题",
      "4. 内容类型：认知纠偏",
      "5. 开头钩子",
      "6. 播放量",
      "7. 点赞",
      "8. 评论",
      "9. “实战地图”评论数",
      "10. 私信数",
      "11. 进群数",
      "12. 老板型线索",
      "13. 真实业务问题",
      "",
      "评论承接话术：",
      "用户评论“实战地图”：收到，我发你。你也可以说下你公司现在最贵的问题是获客、销售、客服还是内容生产。",
      "用户问“适合什么行业”：最适合有销售、有客服、有内容获客需求的中小企业，尤其是获客贵、跟进乱、员工重复劳动多的公司。",
      "用户问“怎么落地”：先别从工具开始，先列出公司最贵的 3 个问题，再拆流程，看哪一步能被 AI 提效。",
      "",
      "交付：多维表格初填完成，并在任务评论里写“已初填”。"
    ].join("\n"),
    due: { timestamp: due1730, is_all_day: false },
    members: members("FEISHU_DIRECTOR_B_OPEN_IDS"),
    tasklists: list
  }
];

const payload = { parentTask, subtasks };

if (args.dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const parent = await createTask(parentTask);
const parentGuid = parent.guid;
if (!parentGuid) throw new Error(`Could not find parent guid: ${JSON.stringify(parent)}`);

for (const subtask of subtasks) {
  await createSubtask(parentGuid, subtask);
}

const result = {
  parent: {
    guid: parentGuid,
    summary: parent.summary || parentTask.summary,
    url: taskUrl(parentGuid)
  }
};

console.log(JSON.stringify(result, null, 2));
