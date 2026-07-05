#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {
    chatId: process.env.FEISHU_MARKET_MATERIAL_CHAT_ID || process.env.FEISHU_GROUP_CHAT_ID,
    hours: 24,
    pageSize: 50
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
      "Enable message read permission in Feishu Open Platform, publish the app version, then rerun.",
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
  console.log(JSON.stringify(messages, null, 2));
} catch (error) {
  console.error(explainFeishuError(error));
  process.exitCode = 1;
}
