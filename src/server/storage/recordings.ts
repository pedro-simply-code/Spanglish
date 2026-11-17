import { env } from "@/env";
import { isLiveKitEgressConfigured } from "@/server/classes/livekit-api";
import { isBackblazeConfigured } from "@/server/storage/b2";

export type RecordingStorageMode = "local" | "cloud";

export function getRecordingStorageMode(): RecordingStorageMode {
  return env.RECORDING_STORAGE;
}

export function isCloudRecordingEnabled() {
  return (
    env.RECORDING_STORAGE === "cloud" && isBackblazeConfigured()
  );
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