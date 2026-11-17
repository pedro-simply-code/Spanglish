import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

function getB2Client() {
  if (
    !env.B2_KEY_ID ||
    !env.B2_APPLICATION_KEY ||
    !env.B2_BUCKET_NAME ||
    !env.B2_S3_ENDPOINT
  ) {
    return null;
  }

  return new S3Client({
    region: env.B2_REGION,
    endpoint: env.B2_S3_ENDPOINT,
    credentials: {
      accessKeyId: env.B2_KEY_ID,
      secretAccessKey: env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
  });
}

export function isBackblazeConfigured() {
  return Boolean(getB2Client());
}

/** Largest browser recording accepted for direct upload (2 GB). */
export const MAX_RECORDING_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * A short-lived URL the browser PUTs the recording to, straight to B2 (the
 * file never passes through our server). The bucket needs a CORS rule that
 * allows PUT from the site's origin.
 */
export async function createRecordingUploadUrl(input: {
  key: string;
  contentType: string;
  sizeBytes: number;
}) {
  const client = getB2Client();
  if (!client || !env.B2_BUCKET_NAME) throw new Error("Backblaze B2 is not configured.");
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.B2_BUCKET_NAME,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
    }),
    { expiresIn: 60 * 30 },
  );
}

/** Size of an uploaded object, or null when it is not there. */
export async function headRecordingObject(key: string) {
  const client = getB2Client();
  if (!client || !env.B2_BUCKET_NAME) return null;
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key }));
    return { sizeBytes: head.ContentLength ?? 0 };
  } catch {
    return null;
  }
}

/** Short-lived download link for a recording the viewer may see. */
export async function getRecordingDownloadUrl(key: string, fileName: string) {
  const client = getB2Client();
  if (!client || !env.B2_BUCKET_NAME) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.B2_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `inline; filename="${fileName.replace(/[^\w.-]/g, "_")}"`,
    }),
    { expiresIn: 60 * 10 },
  );
}
