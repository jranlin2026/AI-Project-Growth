#!/usr/bin/env node
import { request } from "node:http";

function postJson(eventPath, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1",
      port: Number(process.env.FEISHU_EVENT_PORT || 8787),
      path: eventPath,
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

const eventPath = process.env.FEISHU_EVENT_PATH || "/feishu/events";
const challenge = await postJson(eventPath, {
  type: "url_verification",
  token: process.env.FEISHU_VERIFICATION_TOKEN || "",
  challenge: "challenge-test-123"
});

const message = await postJson(eventPath, {
  schema: "2.0",
  header: {
    event_id: `test-${Date.now()}`,
    event_type: "im.message.receive_v1",
    token: process.env.FEISHU_VERIFICATION_TOKEN || ""
  },
  event: {
    sender: { sender_id: { open_id: "ou_test" }, sender_type: "user" },
    message: {
      message_id: `om_test_${Date.now()}`,
      chat_id: "oc_test",
      message_type: "text",
      content: JSON.stringify({
        text: "\u3010\u5e02\u573a\u7d20\u6750\u3011https://v.douyin.com/test/ \u89c6\u9891\u6587\u6848\uff1a\u6d4b\u8bd5 \u8bc4\u8bba\u533a\u622a\u56fe\uff1a\u89c1\u56fe"
      })
    }
  }
});

console.log(JSON.stringify({ challenge, message }, null, 2));
