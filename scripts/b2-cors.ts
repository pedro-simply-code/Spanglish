/**
 * Adds the CORS rule browser uploads need to the recordings bucket:
 *   pnpm b2:cors                       (localhost:3000 + NEXT_PUBLIC_APP_URL)
 *   pnpm b2:cors https://other-domain  (extra origins)
 *
 * Uses Backblaze's native API (b2_update_bucket), which needs a key with the
 * writeBuckets capability. The upload key from B2_KEY_ID usually does not
 * have it: set B2_ADMIN_KEY_ID / B2_ADMIN_APPLICATION_KEY in .env for this
 * one run (your Master Application Key works here), then remove them.
 * Other CORS rules on the bucket are kept; only "spanglish-uploads" is replaced.
 */
import { env } from "../src/env";

const RULE_NAME = "spanglish-uploads";

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & { code?: string; message?: string };
  if (!response.ok) throw new Error(`${body.code ?? response.status}: ${body.message ?? "request failed"}`);
  return body;
}

async function main() {
  const keyId = process.env.B2_ADMIN_KEY_ID || env.B2_KEY_ID;
  const key = process.env.B2_ADMIN_APPLICATION_KEY || env.B2_APPLICATION_KEY;
  if (!keyId || !key || !env.B2_BUCKET_NAME) {
    console.log("Set B2_BUCKET_NAME and a key (B2_ADMIN_KEY_ID / B2_ADMIN_APPLICATION_KEY) in .env.");
    process.exit(1);
  }

  const origins = new Set(["http://localhost:3000", new URL(env.NEXT_PUBLIC_APP_URL).origin]);
  for (const arg of process.argv.slice(2)) origins.add(new URL(arg).origin);

  const auth = await call<{ apiUrl: string; authorizationToken: string; accountId: string }>(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    { headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${key}`).toString("base64")}` } },
  );
  const headers = { Authorization: auth.authorizationToken, "Content-Type": "application/json" };

  const { buckets } = await call<{
    buckets: { bucketId: string; bucketName: string; corsRules?: { corsRuleName: string }[] }[];
  }>(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
    method: "POST",
    headers,
    body: JSON.stringify({ accountId: auth.accountId, bucketName: env.B2_BUCKET_NAME }),
  });
  const bucket = buckets[0];
  if (!bucket) throw new Error(`Bucket ${env.B2_BUCKET_NAME} not found for this key.`);

  const rules = [
    ...(bucket.corsRules ?? []).filter((rule) => rule.corsRuleName !== RULE_NAME),
    {
      corsRuleName: RULE_NAME,
      allowedOrigins: [...origins],
      allowedOperations: ["s3_put", "s3_get", "s3_head"],
      allowedHeaders: ["*"],
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3600,
    },
  ];

  await call(`${auth.apiUrl}/b2api/v2/b2_update_bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ accountId: auth.accountId, bucketId: bucket.bucketId, corsRules: rules }),
  });
  console.log(`✓ CORS rule "${RULE_NAME}" set on ${bucket.bucketName} for: ${[...origins].join(", ")}`);
  console.log("  It can take a minute to apply. Then run: pnpm check:recordings");
}

main().catch((error) => {
  const message = (error as Error).message;
  console.log(`✗ ${message}`);
  if (/unauthorized|not_allowed|capability/i.test(message)) {
    console.log("  This key cannot change bucket settings: use the Master Application Key in B2_ADMIN_KEY_ID / B2_ADMIN_APPLICATION_KEY for this run.");
  }
  process.exit(1);
});
