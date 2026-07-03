#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function extractFirstTableRow(markdown, marker) {
  const index = markdown.indexOf(marker);
  if (index === -1) return "";
  const slice = markdown.slice(index);
  const lines = slice.split(/\r?\n/).filter(Boolean);
  return lines.find((line) => line.startsWith("| 第 1 天")) || "";
}

const cwd = process.cwd();
const today = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short"
}).format(new Date());

const calendar = readIfExists(path.join(cwd, "内容日历.md"));
const scripts = readIfExists(path.join(cwd, "脚本库.md"));
const s001Ready = scripts.includes("| S001 |") && scripts.includes("已完成");
const day1AccountB = extractFirstTableRow(calendar, "| 第 1 天 | 账号 B |");

const taskText = `# ${today} AI商业IP增长项目 今日作战任务

## 今日总目标

跑通短视频矩阵第一天执行闭环：拍摄、剪辑、发布、评论承接、数据记录。

## 今日重点内容

- 主测试内容：S001/T001《老板做 AI，最不该先学工具》
- 核心观点：老板做 AI，第一步不是学工具，而是先找到公司最贵的问题。
- 固定 CTA：评论区打“实战地图”

## 今日排期参考

${day1AccountB || "- 内容日历未找到第 1 天账号 B 排期，请先检查《内容日历.md》。"}

## 分工任务

### 林总

- 17:00 前完成 S001 口播录制。
- 至少录 2 个开头版本。
- 口播重点：最贵问题 -> 流程拆解 -> 工具匹配。

### 编导 A

- 检查 S001 脚本表达是否适合林总口播。
- 准备明天 3 条认知纠偏脚本备选。
- 从评论区/群内问题中记录可二创选题。

### 编导 B

- 按《剪辑工作台.md》完成 S001 成片。
- 按《发布记录.md》准备账号 B 发布。
- 发布后盯评论“实战地图”“怎么拿”“适合什么行业”“怎么落地”。
- 17:00 前更新任务状态，晚上填写视频数据。

## 17:00 必须回填

- 每人更新飞书任务状态。
- 填写每日作战日报。
- 编导 B 填写每条视频数据。
- 标记老板型评论和真实业务问题。

## 当前文件状态

- S001 脚本：${s001Ready ? "已完成" : "待检查"}
- 内容日历：${day1AccountB ? "已排期" : "需补齐"}
`;

console.log(taskText);
