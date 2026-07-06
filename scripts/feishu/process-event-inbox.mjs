#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();

const ACTION_PATH = path.resolve(process.env.FEISHU_EVENT_ACTION_PATH || "data/feishu-event-actions.jsonl");
const STATE_PATH = path.resolve(process.env.FEISHU_EVENT_STATE_PATH || "data/feishu-event-processed.json");

function parseArgs(argv) {
  const args = { send: false };
  for (const token of argv) {
    if (token === "--send") args.send = true;
  }
  return args;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(safeJsonParse)
    .filter(Boolean);
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return { processed_message_ids: [] };
  return safeJsonParse(fs.readFileSync(STATE_PATH, "utf8")) || { processed_message_ids: [] };
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function sendWebhook(text) {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/feishu/send-webhook.mjs", "--text", text], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || stdout || `send-webhook exited ${code}`));
    });
  });
}

const args = parseArgs(process.argv.slice(2));
const state = readState();
const processed = new Set(state.processed_message_ids || []);
const actions = readJsonl(ACTION_PATH).filter((action) => action.message_id && !processed.has(action.message_id));

const results = [];
for (const action of actions) {
  const reply = action.suggested_reply || "\u6536\u5230\u3002";
  if (args.send) {
    await sendWebhook(reply);
    processed.add(action.message_id);
  }
  results.push({
    message_id: action.message_id,
    sent: args.send,
    reply
  });
}

if (args.send) {
  writeState({ processed_message_ids: Array.from(processed).slice(-1000) });
}

console.log(JSON.stringify({
  mode: args.send ? "send" : "dry-run",
  pending_count: actions.length,
  results
}, null, 2));
