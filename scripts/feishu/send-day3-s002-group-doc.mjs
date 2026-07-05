#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();

const docPath = path.resolve("04_每日作战记录", "2026-07-05_Day3正式执行包.md");

function sign(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).digest("base64");
}

function extractCodeBlock(markdown, heading) {
  const index = markdown.indexOf(heading);
  if (index < 0) throw new Error(`Missing heading: ${heading}`);
  const rest = markdown.slice(index);
  const match = rest.match(/```text\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`Missing text code block after: ${heading}`);
  return match[1].trim();
}

async function sendText(text) {
  const webhookUrl = requireEnv("FEISHU_WEBHOOK_URL");
  const secret = process.env.FEISHU_WEBHOOK_SECRET || "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = {
    msg_type: "text",
    content: { text }
  };

  if (secret) {
    body.timestamp = timestamp;
    body.sign = sign(timestamp, secret);
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });

  const result = await response.text();
  if (!response.ok) throw new Error(`Feishu webhook failed: ${response.status} ${result}`);
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const markdown = fs.readFileSync(docPath, "utf8");
const messages = [
  extractCodeBlock(markdown, "## 群聊第一条：今日安排摘要"),
  extractCodeBlock(markdown, "## 群聊第二条：完整拍摄脚本文档"),
  extractCodeBlock(markdown, "## 群聊第三条：朋友圈文案")
];

const sent = [];
for (const message of messages) {
  sent.push(await sendText(message));
  await sleep(2500);
}

console.log(JSON.stringify({ sent }, null, 2));
