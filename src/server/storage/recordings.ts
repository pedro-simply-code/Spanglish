import { env } from "@/env";
import { isLiveKitEgressConfigured } from "@/server/classes/livekit-api";
import { isBackblazeConfigured } from "@/server/storage/b2";

export type RecordingStorageMode = "local" | "cloud";

/** RECORDING_STORAGE, or "cloud" by default once Backblaze B2 is configured. */
export function getRecordingStorageMode(): RecordingStorageMode {
  return env.RECORDING_STORAGE ?? (isBackblazeConfigured() ? "cloud" : "local");
}

export function isCloudRecordingEnabled() {
  return getRecordingStorageMode() === "cloud" && isBackblazeConfigured();
}

/** Passed from the server to the classroom UI. */
export function getRecordingClientConfig() {
  return {
    storage: getRecordingStorageMode(),
    cloudReady: isBackblazeConfigured(),
    autoCloudUpload: isCloudRecordingEnabled(),
    /** LiveKit composite egress → B2 (host panel). Hides duplicate browser capture for moderators. */
    serverRecordingAvailable: isLiveKitEgressConfigured(),
  };
}

export type RecordingClientConfig = ReturnType<typeof getRecordingClientConfig>;