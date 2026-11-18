/**
 * Checks the recording setup end to end without opening a classroom:
 *   pnpm check:recordings
 * - which storage mode is active (local disk or Backblaze B2);
 * - B2: uploads a tiny file the same way the browser does (presigned PUT),
 *   checks it arrived and deletes it;
 * - B2 CORS: asks the bucket whether the site's origin may PUT (the browser
 *   upload fails without that rule);
 * - LiveKit: whether the API keys work for cloud (egress) recording.
 * Prints variable names and results only, never secret values.
 */
import { env } from "../src/env";
import { getEgressClient, isLiveKitEgressConfigured } from "../src/server/classes/livekit-api";
import {
  b2Region,
  createRecordingUploadUrl,
  deleteRecordingObject,
  headRecordingObject,
  isBackblazeConfigured,
} from "../src/server/storage/b2";
import { getRecordingStorageMode } from "../src/server/storage/recordings";

const ok = (text: string) => console.log(`  ✓ ${text}`);
const bad = (text: string) => console.log(`  ✗ ${text}`);
const info = (text: string) => console.log(`  · ${text}`);

async function main() {
  console.log("\nRecording storage");
  info(`mode: ${getRecordingStorageMode()}${env.RECORDING_STORAGE ? " (RECORDING_STORAGE)" : " (automatic)"}`);

  console.log("\nBackblaze B2");
  for (const name of ["B2_KEY_ID", "B2_APPLICATION_KEY", "B2_BUCKET_NAME", "B2_S3_ENDPOINT"] as const) {
    if (env[name]) ok(`${name} is set`);
    else bad(`${name} is missing`);
  }
  if (env.B2_S3_ENDPOINT && b2Region() !== env.B2_REGION) {
    info(`region taken from the endpoint: ${b2Region()} (B2_REGION says ${env.B2_REGION})`);
  }

  if (isBackblazeConfigured()) {
    const key = `recordings/_check/${Date.now()}.txt`;
    const body = new TextEncoder().encode("spanglish storage check");
    try {
      const url = await createRecordingUploadUrl({ key, contentType: "text/plain", sizeBytes: body.byteLength });
      const put = await fetch(url, { method: "PUT", headers: { "Content-Type": "text/plain" }, body });
      if (!put.ok) {
        const text = await put.text();
        const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1];
        const message = text.match(/<Message>([^<]+)<\/Message>/)?.[1];
        bad(`upload refused: HTTP ${put.status} ${code ?? ""} ${message ?? text.slice(0, 200)}`);
        if (code === "InvalidAccessKeyId") {
          info("B2_KEY_ID must be the keyID of an Application Key (25 characters, starts with 00…).");
          info("The Master Application Key does not work with the S3 API; extra spaces or quotes also break it.");
        }
        if (code === "SignatureDoesNotMatch") {
          info("B2_APPLICATION_KEY does not match the keyID (it is shown only once when the key is created).");
        }
      } else {
        ok("upload with a presigned URL works (same as the browser)");
        const head = await headRecordingObject(key);
        if (head) ok(`file is in the bucket (${head.sizeBytes} bytes)`);
        else bad("upload answered OK but the file is not in the bucket");
        await deleteRecordingObject(key).catch(() => undefined);
      }

      const preflight = await fetch(url, {
        method: "OPTIONS",
        headers: {
          Origin: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      const allowed = preflight.headers.get("access-control-allow-origin");
      if (preflight.ok && allowed) ok(`CORS allows PUT from ${allowed}`);
      else bad(`CORS does not allow PUT from ${env.NEXT_PUBLIC_APP_URL}: run pnpm b2:cors (browser uploads fail without it)`);
    } catch (error) {
      bad(`B2 check failed: ${(error as Error).message}`);
    }
  }

  console.log("\nLiveKit cloud recording (egress)");
  const egress = getEgressClient();
  if (!egress) {
    bad("LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set");
  } else {
    try {
      const list = await egress.listEgress({ active: true });
      ok(`LiveKit API keys work (${list.length} active egress)`);
      if (isLiveKitEgressConfigured()) ok("cloud recording to B2 is available in the classroom");
      else bad("cloud recording needs the B2 variables too");
      info("LiveKit must reach B2 and call https://<your-domain>/api/webhooks/livekit (not localhost) to mark files ready;");
      info("without the webhook the Recordings page settles them when it loads.");
    } catch (error) {
      bad(`LiveKit refused the keys or is unreachable: ${(error as Error).message}`);
    }
  }
  console.log("");
  process.exit(0);
}

void main();
