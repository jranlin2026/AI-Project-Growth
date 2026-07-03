#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    taskGuids: [],
    ignoreMissing: false,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--task-guid" || token === "--task-guids") {
      args.taskGuids.push(...(argv[i + 1] || "").split(",").map((item) => item.trim()).filter(Boolean));
      i += 1;
    } else if (token === "--ignore-missing") {
      args.ignoreMissing = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.taskGuids.length === 0) {
  throw new Error("Provide --task-guid or --task-guids.");
}

const results = [];

for (const taskGuid of args.taskGuids) {
  if (args.dryRun) {
    results.push({ taskGuid, status: "dry-run" });
    continue;
  }

  try {
    await feishuRequest(`/task/v2/tasks/${taskGuid}`, {
      method: "DELETE"
    });
    results.push({ taskGuid, status: "deleted" });
  } catch (error) {
    if (args.ignoreMissing && String(error.message).includes("1470404")) {
      results.push({ taskGuid, status: "missing" });
      continue;
    }
    throw error;
  }
}

console.log(JSON.stringify({ results }, null, 2));
