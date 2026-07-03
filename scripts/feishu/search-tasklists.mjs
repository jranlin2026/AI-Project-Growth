#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = { keyword: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--keyword") {
      args.keyword = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const data = await feishuRequest("/task/v2/tasklists/search", {
  method: "POST",
  body: JSON.stringify({
    keyword: args.keyword || "AI商业IP增长项目"
  })
});

console.log(JSON.stringify(data.data || data, null, 2));

