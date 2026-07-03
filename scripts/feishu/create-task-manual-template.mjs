#!/usr/bin/env node
// Feishu Task OpenAPI permissions vary by tenant setup. This script prints the
// task structure Codex should create after Feishu app permissions are confirmed.

const now = new Date();
const date = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(now);

const task = {
  title: `${date} AI商业IP增长项目 今日作战任务`,
  subtasks: [
    {
      title: "林总：完成今日出镜拍摄",
      owner: "林总",
      due: "17:00"
    },
    {
      title: "编导A：完成今日脚本和明日选题",
      owner: "编导A",
      due: "17:00"
    },
    {
      title: "编导B：完成剪辑、发布、评论承接和数据记录",
      owner: "编导B",
      due: "17:00"
    },
    {
      title: "编导B：填写视频数据记录",
      owner: "编导B",
      due: "21:30"
    }
  ]
};

console.log(JSON.stringify(task, null, 2));

