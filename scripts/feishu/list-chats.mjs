#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseArgs(argv) {
  const args = { pageSize: 100 };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--page-size") {
      args.pageSize = Number(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function explainFeishuError(error) {
  const message = String(error?.message || error);
  if (message.includes("im:chat")) {
    return [
      "Feishu app is missing chat read permission.",
      "Enable one of these scopes in Feishu Open Platform, publish the app version, then rerun:",
      "- im:chat:readonly",
      "- im:chat.group_info:readonly",
      "",
      message
    ].join("\n");
  }
  return message;
}

const args = parseArgs(process.argv.slice(2));

try {
  const data = await feishuRequest(`/im/v1/chats?page_size=${args.pageSize}`, {
    method: "GET"
  });

  const items = data.data?.items || [];
  const chats = items.map((chat) => ({
    chat_id: chat.chat_id,
    name: chat.name,
    chat_type: chat.chat_type,
    description: chat.description || "",
    member_count: chat.member_count
  }));

  console.log(JSON.stringify(chats, null, 2));
} catch (error) {
  console.error(explainFeishuError(error));
  process.exitCode = 1;
}
