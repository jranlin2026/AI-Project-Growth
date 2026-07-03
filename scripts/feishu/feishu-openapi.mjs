import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

export async function getTenantAccessToken() {
  const appId = requireEnv("FEISHU_APP_ID");
  const appSecret = requireEnv("FEISHU_APP_SECRET");

  const response = await fetch(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Failed to get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

export async function feishuRequest(path, options = {}) {
  const token = await getTenantAccessToken();
  const response = await fetch(`${FEISHU_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Feishu API request failed: ${path} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function searchBitableRecords({ appToken, tableId, pageSize = 100, filter }) {
  const body = { page_size: pageSize };
  if (filter) body.filter = filter;

  return feishuRequest(`/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

