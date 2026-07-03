#!/usr/bin/env node
import { loadEnv } from "./env.mjs";
import { feishuRequest } from "./feishu-openapi.mjs";

loadEnv();

function parseList(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const args = {
    emails: [],
    mobiles: [],
    idType: "open_id",
    includeResigned: false,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--email" || token === "--emails") {
      args.emails.push(...parseList(argv[i + 1]));
      i += 1;
    } else if (token === "--mobile" || token === "--mobiles") {
      args.mobiles.push(...parseList(argv[i + 1]));
      i += 1;
    } else if (token === "--id-type") {
      args.idType = argv[i + 1] || args.idType;
      i += 1;
    } else if (token === "--include-resigned") {
      args.includeResigned = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.emails.length === 0 && args.mobiles.length === 0) {
  throw new Error("Provide --email/--emails or --mobile/--mobiles.");
}

const payload = {
  include_resigned: args.includeResigned
};

if (args.emails.length > 0) payload.emails = args.emails;
if (args.mobiles.length > 0) payload.mobiles = args.mobiles;

const path = `/contact/v3/users/batch_get_id?user_id_type=${encodeURIComponent(args.idType)}`;

if (args.dryRun) {
  console.log(JSON.stringify({ path, payload }, null, 2));
  process.exit(0);
}

const data = await feishuRequest(path, {
  method: "POST",
  body: JSON.stringify(payload)
});

console.log(JSON.stringify(data.data || data, null, 2));
