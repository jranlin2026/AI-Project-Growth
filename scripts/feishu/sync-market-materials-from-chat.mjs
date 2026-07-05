#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    chatId: process.env.FEISHU_MARKET_MATERIAL_CHAT_ID || process.env.FEISHU_GROUP_CHAT_ID,
    hours: 24,
    pageSize: 50,
    groupWindowMinutes: 10,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--chat-id") {
      args.chatId = argv[i + 1];
      i += 1;
    } else if (token === "--hours") {
      args.hours = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--start-time") {
      args.startTime = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--end-time") {
      args.endTime = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--page-size") {
      args.pageSize = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function explainFeishuError(error) {
  const message = String(error?.message || error);
  if (message.includes("Bot ability is not activated") || message.includes('"code":232025')) {
    return [
      "Feishu app message permission may be available, but bot ability is not activated.",
      "Enable Bot ability in Feishu Open Platform, publish the app version, add the bot to the project group, then rerun.",
      "",
      message
    ].join("\n");
  }
  if (message.includes("im:message")) {
    return [
      "Feishu app is missing message read permission.",
      "Enable scope im:message.group_msg in Feishu Open Platform, publish the app version, then rerun.",
      "",
      message
    ].join("\n");
  }
  if (message.includes("im:chat")) {
    return [
      "Feishu app is missing chat read permission or the app cannot access this chat.",
      "Make sure the app/bot is in the target group and chat read permission is enabled.",
      "",
      message
    ].join("\n");
  }
  return message;
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function collectText(value, parts = []) {
  if (value == null) return parts;
  if (typeof value === "string" || typeof value === "number") {
    parts.push(String(value));
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, parts);
    return parts;
  }
  if (typeof value === "object") {
    for (const key of ["title", "text", "href", "url", "name"]) {
      if (typeof value[key] === "string") parts.push(value[key]);
    }
    for (const nested of Object.values(value)) {
      if (typeof nested === "object") collectText(nested, parts);
    }
  }
  return parts;
}

function extractUrls(text) {
  return Array.from(new Set(text.match(/https?:\/\/[^\s"'<>，。；、]+/g) || []));
}

function formatChinaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeMessage(message) {
  const content = safeJsonParse(message.body?.content);
  const text = collectText(content)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const createTimeMs = Number(message.create_time || message.update_time || 0);
  const sender = message.sender || {};
  const senderKey = `${sender.sender_type || "unknown"}:${sender.id || "unknown"}`;

  return {
    message_id: message.message_id,
    msg_type: message.msg_type,
    sender_key: senderKey,
    sender_id: sender.id || "",
    sender_type: sender.sender_type || "",
    create_time: message.create_time,
    create_time_ms: createTimeMs,
    create_time_local: createTimeMs ? new Date(createTimeMs).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "",
    text,
    urls: extractUrls(text),
    has_image: message.msg_type === "image" || text.includes("image_key"),
    raw_content: content
  };
}

async function listMessages({ chatId, startTime, endTime, pageSize }) {
  const messages = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      container_id_type: "chat",
      container_id: chatId,
      start_time: String(startTime),
      end_time: String(endTime),
      page_size: String(pageSize),
      sort_type: "ByCreateTimeAsc"
    });
    if (pageToken) params.set("page_token", pageToken);

    const data = await feishuRequest(`/im/v1/messages?${params.toString()}`, {
      method: "GET"
    });

    messages.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
    if (!data.data?.has_more) pageToken = "";
  } while (pageToken);

  return messages;
}

function isMaterialSignal(message) {
  const text = message.text || "";
  return (
    text.includes("【市场素材】") ||
    text.includes("市场素材") ||
    text.includes("视频链接") ||
    text.includes("视频文案") ||
    text.includes("评论区截图") ||
    message.urls.length > 0 ||
    message.has_image
  );
}

function groupMaterialMessages(messages, groupWindowMinutes) {
  const normalized = messages
    .map(normalizeMessage)
    .filter(isMaterialSignal)
    .sort((a, b) => a.create_time_ms - b.create_time_ms);

  const windowMs = groupWindowMinutes * 60 * 1000;
  const bundles = [];

  for (const message of normalized) {
    const last = bundles[bundles.length - 1];
    const shouldJoinLast =
      last &&
      last.sender_key === message.sender_key &&
      message.create_time_ms - last.last_message_time_ms <= windowMs &&
      !message.text.includes("【市场素材】");

    if (shouldJoinLast) {
      last.messages.push(message);
      last.last_message_time_ms = message.create_time_ms;
    } else {
      bundles.push({
        id: `material-${bundles.length + 1}`,
        sender_key: message.sender_key,
        sender_id: message.sender_id,
        first_message_time_ms: message.create_time_ms,
        last_message_time_ms: message.create_time_ms,
        messages: [message]
      });
    }
  }

  return bundles.map((bundle) => {
    const textBlocks = bundle.messages.map((message) => message.text).filter(Boolean);
    const urls = Array.from(new Set(bundle.messages.flatMap((message) => message.urls)));
    return {
      ...bundle,
      first_time_local: new Date(bundle.first_message_time_ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      last_time_local: new Date(bundle.last_message_time_ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      message_ids: bundle.messages.map((message) => message.message_id),
      urls,
      text_blocks: textBlocks,
      image_count: bundle.messages.filter((message) => message.has_image).length,
      status: urls.length && textBlocks.length && bundle.messages.some((message) => message.has_image) ? "完整" : "待补"
    };
  });
}

function buildMarkdown({ bundles, startTime, endTime }) {
  const date = formatChinaDate();
  const lines = [
    "---",
    "类型: 市场素材同步",
    "状态: 自动生成",
    `创建时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    "来源: 飞书群消息轮询",
    "tags:",
    "  - AI商业IP",
    "  - 市场素材",
    "  - 飞书入站",
    "---",
    "",
    `# ${date} 市场素材入站同步`,
    "",
    "## 同步范围",
    "",
    `- 开始时间戳: ${startTime}`,
    `- 结束时间戳: ${endTime}`,
    `- 素材组数: ${bundles.length}`,
    "",
    "## 素材明细",
    ""
  ];

  if (!bundles.length) {
    lines.push("本次没有同步到符合规则的市场素材消息。");
    return lines.join("\n");
  }

  bundles.forEach((bundle, index) => {
    lines.push(`### 素材 ${index + 1}：${bundle.status}`);
    lines.push("");
    lines.push(`- 提交人ID: ${bundle.sender_id || bundle.sender_key}`);
    lines.push(`- 提交时间: ${bundle.first_time_local}`);
    lines.push(`- 消息ID: ${bundle.message_ids.join(", ")}`);
    lines.push(`- 链接数量: ${bundle.urls.length}`);
    lines.push(`- 截图数量: ${bundle.image_count}`);
    lines.push("");

    if (bundle.urls.length) {
      lines.push("链接：");
      for (const url of bundle.urls) lines.push(`- ${url}`);
      lines.push("");
    }

    if (bundle.text_blocks.length) {
      lines.push("文案/文本：");
      lines.push("```text");
      lines.push(bundle.text_blocks.join("\n\n---\n\n"));
      lines.push("```");
      lines.push("");
    }

    lines.push("增长负责人初判：待拆解。");
    lines.push("");
  });

  return lines.join("\n");
}

function appendJsonl(filePath, records) {
  if (!records.length) return;
  const lines = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  fs.appendFileSync(filePath, lines, "utf8");
}

const args = parseArgs(process.argv.slice(2));
if (!args.chatId) {
  console.error("Provide --chat-id or set FEISHU_MARKET_MATERIAL_CHAT_ID in .env.");
  process.exit(1);
}

const nowSeconds = Math.floor(Date.now() / 1000);
const endTime = args.endTime || nowSeconds;
const startTime = args.startTime || endTime - args.hours * 60 * 60;

try {
  const messages = await listMessages({
    chatId: args.chatId,
    startTime,
    endTime,
    pageSize: args.pageSize
  });
  const bundles = groupMaterialMessages(messages, args.groupWindowMinutes);

  const today = formatChinaDate();
  const reportDir = path.join(process.cwd(), "04_每日作战记录");
  const dataDir = path.join(process.cwd(), "数据");
  const reportPath = path.join(reportDir, `${today}_市场素材入站同步.md`);
  const jsonlPath = path.join(dataDir, "市场素材池.jsonl");

  const markdown = buildMarkdown({ bundles, startTime, endTime });

  if (!args.dryRun) {
    fs.mkdirSync(reportDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(reportPath, markdown, "utf8");
    appendJsonl(jsonlPath, bundles.map((bundle) => ({
      synced_at: new Date().toISOString(),
      source: "feishu_group",
      ...bundle
    })));
  }

  console.log(JSON.stringify({
    message_count: messages.length,
    material_bundle_count: bundles.length,
    report_path: args.dryRun ? null : reportPath,
    jsonl_path: args.dryRun ? null : jsonlPath
  }, null, 2));
} catch (error) {
  console.error(explainFeishuError(error));
  process.exitCode = 1;
}
