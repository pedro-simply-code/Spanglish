/** `localhost` / `127.0.0.1` (any port) — not valid as the public site URL in production. */
function isLoopbackUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function withHttps(urlWithoutScheme: string) {
  const trimmed = urlWithoutScheme.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return `https://${trimmed}`;
}

/**
 * Canonical public origin (no trailing slash). Better Auth OAuth callbacks and
 * error redirects use this — it must match the URL in the browser, not localhost
 * on a Vercel deploy.
 */
export function resolveAppBaseUrl(configuredUrl: string): string {
  const normalized = configuredUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV !== "production" || !isLoopbackUrl(normalized)) {
    return normalized;
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return withHttps(vercelProduction);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return withHttps(vercelUrl);
  }

  return normalized;
}