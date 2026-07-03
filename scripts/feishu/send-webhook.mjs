#!/usr/bin/env node
import crypto from "node:crypto";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--text") {
      args.text = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function sign(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).digest("base64");
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

const args = parseArgs(process.argv.slice(2));
const stdinText = await readStdin();
const text = args.text || stdinText;

if (!text) {
  throw new Error("Provide message text with --text or pipe text into stdin.");
}

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

const resultText = await response.text();
if (!response.ok) {
  throw new Error(`Feishu webhook failed: ${response.status} ${resultText}`);
}

console.log(resultText);

