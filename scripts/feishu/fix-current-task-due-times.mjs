#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

const tasks = [
  {
    guid: "02623791-b860-4941-8c61-9f79066de686",
    label: "2026/07/04 市场素材提交测试",
    due: "2026-07-04T21:00:00+08:00"
  },
  {
    guid: "d2c71f28-7782-4785-8aa1-481e428dd2de",
    label: "Day3 父任务",
    due: "2026-07-05T17:30:00+08:00"
  },
  {
    guid: "c8f573a2-40a7-48bd-a318-32c899eb8615",
    label: "N哥 S002 确认/补拍",
    due: "2026-07-05T12:00:00+08:00"
  },
  {
    guid: "12e4b75c-bc3f-491a-ab2b-7185a75e07a6",
    label: "小彭 S002 剪辑发布",
    due: "2026-07-05T17:30:00+08:00"
  },
  {
    guid: "24e4b1cc-6dcd-4100-b4d7-a189273fe36c",
    label: "小彭 朋友圈发布",
    due: "2026-07-05T18:00:00+08:00"
  }
];

const results = [];

for (const task of tasks) {
  const timestamp = String(new Date(task.due).getTime());
  const response = await feishuRequest(`/task/v2/tasks/${task.guid}`, {
    method: "PATCH",
    body: JSON.stringify({
      update_fields: ["due"],
      task: {
        due: {
          timestamp,
          is_all_day: false
        }
      }
    })
  });

  results.push({
    guid: task.guid,
    label: task.label,
    due: task.due,
    timestamp,
    updated: Boolean(response.data)
  });
}

console.log(JSON.stringify(results, null, 2));
