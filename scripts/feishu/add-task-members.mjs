#!/usr/bin/env node
import crypto from "node:crypto";
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    role: "assignee",
    ids: [],
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--task-guid") {
      args.taskGuid = argv[i + 1];
      i += 1;
    } else if (token === "--id" || token === "--ids") {
      args.ids.push(...(argv[i + 1] || "").split(",").map((item) => item.trim()).filter(Boolean));
      i += 1;
    } else if (token === "--role") {
      args.role = argv[i + 1] || args.role;
      i += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.taskGuid) {
  throw new Error("Provide --task-guid.");
}

if (args.ids.length === 0) {
  throw new Error("Provide --id or --ids.");
}

const payload = {
  members: args.ids.map((id) => ({
    id,
    type: "user",
    role: args.role
  })),
  client_token: crypto.randomUUID()
};

if (args.dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const data = await feishuRequest(`/task/v2/tasks/${args.taskGuid}/add_members?user_id_type=open_id`, {
  method: "POST",
  body: JSON.stringify(payload)
});

console.log(JSON.stringify(data.data || data, null, 2));
