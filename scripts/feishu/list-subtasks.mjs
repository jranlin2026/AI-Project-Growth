#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--task-guid") {
      args.taskGuid = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const taskGuid = args.taskGuid;

if (!taskGuid) {
  throw new Error("Provide --task-guid.");
}

const data = await feishuRequest(`/task/v2/tasks/${taskGuid}/subtasks`, {
  method: "GET"
});

console.log(JSON.stringify(data.data || data, null, 2));

