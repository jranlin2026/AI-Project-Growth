#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--app-token") {
      args.appToken = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const appToken = args.appToken || process.env.FEISHU_DAILY_REPORT_APP_TOKEN;

if (!appToken) {
  throw new Error("Provide --app-token, or set FEISHU_DAILY_REPORT_APP_TOKEN.");
}

const data = await feishuRequest(`/bitable/v1/apps/${appToken}/tables`, {
  method: "GET"
});

console.log(JSON.stringify(data.data?.items || [], null, 2));

