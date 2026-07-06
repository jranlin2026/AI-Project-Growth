#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();

const PORT = Number(process.env.FEISHU_EVENT_PORT || 8787);
const HOST = process.env.FEISHU_EVENT_HOST || "0.0.0.0";
const EVENT_PATH = process.env.FEISHU_EVENT_PATH || "/feishu/events";
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN || "";
const ENCRYPT_KEY = process.env.FEISHU_EVENT_ENCRYPT_KEY || "";
const INBOX_PATH = path.resolve(process.env.FEISHU_EVENT_INBOX_PATH || "data/feishu-event-inbox.jsonl");
const ACTION_PATH = path.resolve(process.env.FEISHU_EVENT_ACTION_PATH || "data/feishu-event-actions.jsonl");
const REPLY_MODE = process.env.FEISHU_EVENT_REPLY_MODE || "log";

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function verifySignature(rawBody, headers) {
  if (!ENCRYPT_KEY) return { ok: true, skipped: true };

  const timestamp = headers["x-lark-request-timestamp"];
  const nonce = headers["x-lark-request-nonce"];
  const signature = headers["x-lark-signature"];
  if (!timestamp || !nonce || !signature) {
    return { ok: false, reason: "missing signature headers" };
  }

  const expected = crypto
    .createHash("sha256")
    .update(Buffer.concat([Buffer.from(`${timestamp}${nonce}${ENCRYPT_KEY}`, "utf8"), rawBody]))
    .digest("hex");

  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  if (left.length !== right.length) return { ok: false, reason: "signature length mismatch" };
  return { ok: crypto.timingSafeEqual(left, right), reason: "signature mismatch" };
}

function decryptEvent(encrypted) {
  if (!ENCRYPT_KEY) {
    throw new Error("Received encrypted event but FEISHU_EVENT_ENCRYPT_KEY is not set.");
  }

  const key = crypto.createHash("sha256").update(ENCRYPT_KEY, "utf8").digest();
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(decrypted);
}

function unwrapPayload(payload) {
  if (payload?.encrypt) return decryptEvent(payload.encrypt);
  return payload;
}

function checkVerificationToken(payload) {
  if (!VERIFICATION_TOKEN) return true;
  const token = payload?.token || payload?.header?.token;
  return !token || token === VERIFICATION_TOKEN;
}

function appendJsonl(filePath, record) {
  ensureParentDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
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

function parseMessageContent(message) {
  const raw = message?.content || "";
  const parsed = safeJsonParse(raw);
  return {
    raw,
    parsed,
    text: collectText(parsed ?? raw).join("\n").trim()
  };
}

function isMarketMaterial(messageText, messageType) {
  return (
    messageText.includes("\u5e02\u573a\u7d20\u6750") ||
    messageText.includes("\u89c6\u9891\u94fe\u63a5") ||
    messageText.includes("\u89c6\u9891\u6587\u6848") ||
    messageText.includes("\u8bc4\u8bba\u533a\u622a\u56fe") ||
    messageText.includes("douyin.com") ||
    messageType === "image" ||
    messageType === "post"
  );
}

function mentionsBot(event) {
  return (event?.message?.mentions || []).some((mention) => {
    const name = mention?.name || mention?.id?.open_id || "";
    return name.includes("IP\u9879\u76ee\u8d1f\u8d23\u673a\u5668\u4eba") || name.includes("AI\u5546\u4e1aIP\u589e\u957f\u52a9\u624b");
  });
}

function createAction(eventPayload) {
  const event = eventPayload.event || {};
  const eventType = eventPayload.header?.event_type || eventPayload.type;
  if (eventType !== "im.message.receive_v1") return null;

  const message = event.message || {};
  const content = parseMessageContent(message);
  const shouldReact = isMarketMaterial(content.text, message.message_type) || mentionsBot(event);
  if (!shouldReact) return null;

  return {
    action: "acknowledge_group_message",
    reason: isMarketMaterial(content.text, message.message_type) ? "market_material_or_media" : "bot_mentioned",
    message_id: message.message_id,
    chat_id: message.chat_id,
    message_type: message.message_type,
    text_preview: content.text.slice(0, 300),
    suggested_reply: isMarketMaterial(content.text, message.message_type)
      ? "\u6536\u5230\uff0c\u8fd9\u6761\u7d20\u6750\u6211\u5df2\u7ecf\u8fdb\u6536\u4ef6\u7bb1\u4e86\u300217:00 \u590d\u76d8\u65f6\u6211\u4f1a\u62c6\u5b83\u80fd\u4e0d\u80fd\u6539\u6210\u660e\u5929\u9009\u9898\u3002"
      : "\u6536\u5230\uff0c\u6211\u770b\u5230\u4e86\u3002"
  };
}

function handleEvent(eventPayload, rawPayload) {
  const eventType = eventPayload.header?.event_type || eventPayload.type || "unknown";
  const record = {
    received_at: new Date().toISOString(),
    event_type: eventType,
    event_id: eventPayload.header?.event_id || "",
    payload: eventPayload
  };
  appendJsonl(INBOX_PATH, record);

  const action = createAction(eventPayload);
  if (action) {
    if (REPLY_MODE === "webhook") {
      action.reply_mode_note = "queued_for_processor";
    }
    appendJsonl(ACTION_PATH, { received_at: record.received_at, ...action });
  }

  return {
    event_type: eventType,
    queued_action: Boolean(action),
    raw_schema: rawPayload?.schema || rawPayload?.type || ""
  };
}

async function handleRequest(req, res) {
  if (req.method === "GET" && req.url === "/health") {
    jsonResponse(res, 200, { ok: true, service: "feishu-event-server" });
    return;
  }

  if (req.method !== "POST" || req.url !== EVENT_PATH) {
    jsonResponse(res, 404, { error: "not_found" });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = verifySignature(rawBody, req.headers);
  if (!signature.ok) {
    jsonResponse(res, 401, { error: "invalid_signature", reason: signature.reason });
    return;
  }

  const rawPayload = safeJsonParse(rawBody.toString("utf8"));
  if (!rawPayload) {
    jsonResponse(res, 400, { error: "invalid_json" });
    return;
  }

  let payload;
  try {
    payload = unwrapPayload(rawPayload);
  } catch (error) {
    jsonResponse(res, 400, { error: "decrypt_failed", message: error.message });
    return;
  }

  if (!checkVerificationToken(payload)) {
    jsonResponse(res, 401, { error: "invalid_verification_token" });
    return;
  }

  if (payload?.type === "url_verification" && payload?.challenge) {
    jsonResponse(res, 200, { challenge: payload.challenge });
    return;
  }

  const result = handleEvent(payload, rawPayload);
  jsonResponse(res, 200, { code: 0, msg: "ok", ...result });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    jsonResponse(res, 500, { error: "internal_error" });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Feishu event server listening on http://${HOST}:${PORT}${EVENT_PATH}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Reply mode: ${REPLY_MODE}`);
});
