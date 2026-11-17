import { AccessToken } from "livekit-server-sdk";
import { env } from "@/env";

export function sanitizeLiveKitRoomName(room: string) {
  return room
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export function isLiveKitConfigured() {
  return Boolean(
    env.LIVEKIT_API_KEY &&
      env.LIVEKIT_API_SECRET &&
      env.NEXT_PUBLIC_LIVEKIT_URL,
  );
}

export function getLiveKitServerUrl() {
  return env.NEXT_PUBLIC_LIVEKIT_URL;
}

type LiveKitGrantInput = {
  room: string;
  identity: string;
  name: string;
  classId: string;
  avatarUrl?: string;
  /** Guests join with subscribe-only permissions. */
  guest?: boolean;
};

export async function createLiveKitRoomToken(input: LiveKitGrantInput) {
  if (!isLiveKitConfigured()) {
    return null;
  }

  const roomName = sanitizeLiveKitRoomName(input.room);
  const ttlSeconds = env.MEETING_TOKEN_TTL_MINUTES * 60;

  const token = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
    identity: input.identity,
    name: input.name,
    ttl: ttlSeconds,
    metadata: JSON.stringify({
      classId: input.classId,
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    }),
  });

  const guest = Boolean(input.guest);

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !guest,
    canSubscribe: true,
    canPublishData: !guest,
    canUpdateOwnMetadata: !guest,
  });

  const jwt = await token.toJwt();

  return {
    roomName,
    token: jwt,
    serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL!,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}