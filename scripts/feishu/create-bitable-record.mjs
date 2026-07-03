#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

const schemas = {
  daily: {
    appToken: process.env.FEISHU_DAILY_REPORT_APP_TOKEN,
    tableId: process.env.FEISHU_DAILY_REPORT_TABLE_ID,
    fields: {
      "文本": "系统测试日报记录，可删除",
      "日期": new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai" }).format(new Date()),
      "填写人": "Codex",
      "角色": "增长负责人",
      "今日任务完成情况": "飞书日报表写入测试成功",
      "未完成事项": "无",
      "未完成原因": "无",
      "明日建议": "继续完善飞书任务自动创建",
      "需要支持": "无",
      "任务状态": "系统测试"
    }
  },
  video: {
    appToken: process.env.FEISHU_VIDEO_DATA_APP_TOKEN,
    tableId: process.env.FEISHU_VIDEO_DATA_TABLE_ID,
    fields: {
      "文本": "系统测试视频数据记录，可删除",
      "日期": new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai" }).format(new Date()),
      "平台": "抖音",
      "账号": "账号B",
      "脚本ID": "S001",
      "视频标题": "老板做 AI，最不该先学工具",
      "内容类型": "认知纠偏",
      "开头钩子": "大部分老板学 AI 的顺序，一开始就是错的。",
      "视频链接": "系统测试",
      "播放量": 0,
      "点赞数": 0,
      "评论数": 0,
      "实战地图评论数": 0,
      "私信数": 0,
      "进群人数": 0,
      "老板型线索数": 0,
      "真实业务问题": "系统测试",
      "初步判断": "系统测试"
    }
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

async function createRecord(schema) {
  const response = await feishuRequest(`/bitable/v1/apps/${schema.appToken}/tables/${schema.tableId}/records`, {
    method: "POST",
    body: JSON.stringify({ fields: schema.fields })
  });
  return response.data?.record;
}

const args = parseArgs(process.argv.slice(2));
const targetNames = args.schema ? [args.schema] : Object.keys(schemas);
const results = [];

for (const name of targetNames) {
  const schema = schemas[name];
  if (!schema) throw new Error(`Unknown schema: ${name}`);
  if (!schema.appToken || !schema.tableId) {
    throw new Error(`Missing app token or table id for schema: ${name}`);
  }
  const record = await createRecord(schema);
  results.push({ schema: name, record });
}

console.log(JSON.stringify(results, null, 2));

