import { EgressClient, RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";
import { isLiveKitConfigured } from "@/server/classes/livekit";

export function getLiveKitApiHost() {
  const wsUrl = env.LIVEKIT_URL ?? env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!wsUrl) return null;
  const parsed = new URL(wsUrl);
  return `https://${parsed.host}`;
}

export function getRoomServiceClient() {
  if (!isLiveKitConfigured()) return null;
  const host = getLiveKitApiHost();
  if (!host || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return null;
  return new RoomServiceClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

export function getEgressClient() {
  if (!isLiveKitConfigured()) return null;
  const host = getLiveKitApiHost();
  if (!host || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return null;
  return new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

export function isLiveKitEgressConfigured() {
  return (
    Boolean(getEgressClient()) &&
    Boolean(env.B2_BUCKET_NAME && env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_S3_ENDPOINT)
  );
}

export function isLiveKitRtmpConfigured() {
  return Boolean(getEgressClient() && env.LIVEKIT_RTMP_URL);
}