#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    name: "AI商业IP增长项目每日作战",
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--name") {
      args.name = argv[i + 1] || args.name;
      i += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function parseIds(raw = "") {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tasklistMembersFromEnv() {
  const ids = new Set([
    ...parseIds(process.env.FEISHU_TASK_OWNER_OPEN_IDS),
    ...parseIds(process.env.FEISHU_LIN_OPEN_IDS),
    ...parseIds(process.env.FEISHU_DIRECTOR_A_OPEN_IDS),
    ...parseIds(process.env.FEISHU_DIRECTOR_B_OPEN_IDS)
  ]);

  return [...ids].map((id) => ({
    id,
    type: "user",
    role: "editor"
  }));
}

const args = parseArgs(process.argv.slice(2));
const payload = {
  name: args.name,
  members: tasklistMembersFromEnv()
};

if (args.dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const data = await feishuRequest("/task/v2/tasklists?user_id_type=open_id", {
  method: "POST",
  body: JSON.stringify(payload)
});

console.log(JSON.stringify(data.data || data, null, 2));
