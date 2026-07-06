#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();

const docPath = path.resolve("04_每日作战记录", "2026-07-06_Day4正式执行包.md");

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
const headings = [
  "## 群聊第一条：今日安排摘要",
  "## 群聊第二条：S003 完整拍摄脚本文档",
  "## 群聊第三条：S004 完整拍摄脚本文档",
  "## 群聊第四条：S005 完整拍摄脚本文档",
  "## 群聊第五条：S006 完整拍摄脚本文档"
];

const sent = [];
for (const heading of headings) {
  sent.push(await sendText(extractCodeBlock(markdown, heading)));
  await sleep(2500);
}

console.log(JSON.stringify({ sent_count: sent.length }, null, 2));
