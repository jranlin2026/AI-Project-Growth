#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

const FIELD_TYPES = {
  text: 1,
  number: 2
};

const schemas = {
  daily: {
    appToken: process.env.FEISHU_DAILY_REPORT_APP_TOKEN,
    tableId: process.env.FEISHU_DAILY_REPORT_TABLE_ID,
    fields: [
      ["日期", "text"],
      ["填写人", "text"],
      ["角色", "text"],
      ["今日任务完成情况", "text"],
      ["未完成事项", "text"],
      ["未完成原因", "text"],
      ["明日建议", "text"],
      ["需要支持", "text"],
      ["任务状态", "text"]
    ]
  },
  video: {
    appToken: process.env.FEISHU_VIDEO_DATA_APP_TOKEN,
    tableId: process.env.FEISHU_VIDEO_DATA_TABLE_ID,
    fields: [
      ["日期", "text"],
      ["平台", "text"],
      ["账号", "text"],
      ["脚本ID", "text"],
      ["视频标题", "text"],
      ["内容类型", "text"],
      ["开头钩子", "text"],
      ["视频链接", "text"],
      ["播放量", "number"],
      ["点赞数", "number"],
      ["评论数", "number"],
      ["实战地图评论数", "number"],
      ["私信数", "number"],
      ["进群人数", "number"],
      ["老板型线索数", "number"],
      ["真实业务问题", "text"],
      ["初步判断", "text"]
    ]
  }
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--schema") {
      args.schema = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function listFields(appToken, tableId) {
  const data = await feishuRequest(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
    method: "GET"
  });
  return data.data?.items || [];
}

async function createField(appToken, tableId, [fieldName, kind]) {
  return feishuRequest(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
    method: "POST",
    body: JSON.stringify({
      field_name: fieldName,
      type: FIELD_TYPES[kind]
    })
  });
}

const args = parseArgs(process.argv.slice(2));
const targetNames = args.schema ? [args.schema] : Object.keys(schemas);

for (const name of targetNames) {
  const schema = schemas[name];
  if (!schema) throw new Error(`Unknown schema: ${name}`);
  if (!schema.appToken || !schema.tableId) {
    throw new Error(`Missing app token or table id for schema: ${name}`);
  }

  const existingFields = await listFields(schema.appToken, schema.tableId);
  const existingNames = new Set(existingFields.map((field) => field.field_name));
  const created = [];
  const skipped = [];

  for (const field of schema.fields) {
    const [fieldName] = field;
    if (existingNames.has(fieldName)) {
      skipped.push(fieldName);
      continue;
    }
    await createField(schema.appToken, schema.tableId, field);
    created.push(fieldName);
  }

  console.log(JSON.stringify({ schema: name, created, skipped }, null, 2));
}

