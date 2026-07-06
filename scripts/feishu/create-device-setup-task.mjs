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

function idsFromEnv(name) {
  return (process.env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function membersFromEnv(name) {
  return idsFromEnv(name).map((id) => ({ id, type: "user", role: "assignee" }));
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

const today = new Date();
const payload = {
  summary: "N哥：12:00 前完成手机设备与账号安排",
  description: [
    "这是今天新增的基础设施任务，12:00 前完成。",
    "",
    "目标：给阿浩和小彭各安排 2 台手机，总计 4 台。",
    "",
    "配置标准：",
    "1. 阿浩：2 台手机。",
    "2. 小彭：2 台手机。",
    "3. 每台手机绑定 1 个抖音号。",
    "4. 每台手机绑定 1 个视频号。",
    "5. 每台手机贴/记录清楚设备编号、负责人、抖音号、视频号。",
    "",
    "交付格式：",
    "请在任务评论或群里按下面格式反馈：",
    "阿浩手机1：设备编号 / 抖音号 / 视频号",
    "阿浩手机2：设备编号 / 抖音号 / 视频号",
    "小彭手机1：设备编号 / 抖音号 / 视频号",
    "小彭手机2：设备编号 / 抖音号 / 视频号",
    "",
    "验收标准：",
    "12:00 前能明确看到 4 台手机分别归属谁，以及每台手机对应的抖音号、视频号。"
  ].join("\n"),
  due: { timestamp: shanghaiTimestamp(today, 12, 0), is_all_day: false },
  members: membersFromEnv("FEISHU_LIN_OPEN_IDS"),
  tasklists: tasklists()
};

const task = await createTask(payload);
const guid = getTaskGuid(task);
if (!guid) throw new Error(`Could not find task guid: ${JSON.stringify(task)}`);

console.log(JSON.stringify({
  guid,
  summary: task.summary || payload.summary,
  url: taskUrl(guid)
}, null, 2));
