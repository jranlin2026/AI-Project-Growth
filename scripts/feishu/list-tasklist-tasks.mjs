#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--tasklist-guid") {
      args.tasklistGuid = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const tasklistGuid = args.tasklistGuid || process.env.FEISHU_TASKLIST_GUID;

if (!tasklistGuid) {
  throw new Error("Provide --tasklist-guid or set FEISHU_TASKLIST_GUID.");
}

const data = await feishuRequest(`/task/v2/tasklists/${tasklistGuid}/tasks?page_size=50`, {
  method: "GET"
});

console.log(JSON.stringify(data.data || data, null, 2));

