import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

/**
 * B2's region is part of its S3 endpoint (s3.<region>.backblazeb2.com); a
 * different B2_REGION makes every signature fail, so the endpoint wins.
 */
export function b2Region() {
  const match = env.B2_S3_ENDPOINT?.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  return match?.[1] ?? env.B2_REGION;
}

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
    region: b2Region(),
    // Newer AWS SDKs add CRC32 checksums to every request, including presigned
    // PUT URLs (computed for an empty body). B2 rejects the browser upload
    // then, so checksums are only sent when an operation requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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

/**
 * Private streaming link for a recording the viewer may see. Always "inline"
 * (play, not save) and it expires: 90 minutes covers a 50-minute class with
 * pauses and seeking, after which a copied link stops working.
 */
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
    { expiresIn: 60 * 90 },
  );
}

/** Removes an object (used by the storage check script and cleanups). */
export async function deleteRecordingObject(key: string) {
  const client = getB2Client();
  if (!client || !env.B2_BUCKET_NAME) return false;
  await client.send(new DeleteObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key }));
  return true;
}
