import { env } from "@/env";
import {
  createLiveKitRoomToken,
  getLiveKitServerUrl,
  isLiveKitConfigured,
  sanitizeLiveKitRoomName,
} from "@/server/classes/livekit";
import { signPayload, verifySignature } from "@/server/security";
import type { ClassroomVideoMode } from "@/features/classes";

type MeetingTokenInput = {
  room: string;
  classId: string;
  viewerId: string;
  nowIso: string;
};

type MeetingTokenPayload = {
  room: string;
  classId: string;
  sub: string;
  iat: number;
  exp: number;
};

const providerLabels = {
  livekit: "LiveKit",
  zoom: "Zoom",
  "google-meet": "Google Meet",
} as const;

export function getMeetingProviderLabel(t?: (key: string) => string) {
  if (isLiveKitConfigured()) return "LiveKit";
  const key = env.MEETING_PROVIDER;
  if (key === "custom") return t ? t("meeting.customProvider") : "Custom meeting room";
  return key in providerLabels
    ? providerLabels[key as keyof typeof providerLabels]
    : "LiveKit";
}

export function isMeetingConfigured() {
  return isLiveKitConfigured();
}

export function getMeetingTokenExpiry(nowIso: string) {
  return new Date(
    new Date(nowIso).getTime() + env.MEETING_TOKEN_TTL_MINUTES * 60_000,
  ).toISOString();
}

/** Legacy signed cookie for deep links (optional). */
export function createMeetingToken(input: MeetingTokenInput) {
  const issuedAt = Math.floor(new Date(input.nowIso).getTime() / 1000);
  const payload: MeetingTokenPayload = {
    room: input.room,
    classId: input.classId,
    sub: input.viewerId,
    iat: issuedAt,
    exp: issuedAt + env.MEETING_TOKEN_TTL_MINUTES * 60,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

export function verifyMeetingToken(token: string, room: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!verifySignature(body, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as MeetingTokenPayload;

    if (payload.room !== room) return null;
    if (Date.now() / 1000 >= payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export type ClassroomVideoSession = {
  mode: ClassroomVideoMode;
  liveKit: {
    serverUrl: string;
    token: string;
    roomName: string;
  } | null;
};

export async function resolveClassroomVideo(input: {
  room: string;
  classId: string;
  viewerId: string;
  viewerName: string;
  avatarUrl?: string;
  guest?: boolean;
}): Promise<ClassroomVideoSession> {
  const liveKit = await createLiveKitRoomToken({
    room: input.room,
    identity: input.viewerId,
    name: input.viewerName,
    classId: input.classId,
    avatarUrl: input.avatarUrl,
    guest: input.guest,
  });

  if (liveKit) {
    return {
      mode: "livekit",
      liveKit: {
        serverUrl: liveKit.serverUrl,
        token: liveKit.token,
        roomName: liveKit.roomName,
      },
    };
  }

  return { mode: "local", liveKit: null };
}

export function getMeetingRoomLabel(room: string) {
  return sanitizeLiveKitRoomName(room).replace(/-/g, " ");
}

export function getMeetingRoomUrl(room: string) {
  const base = getLiveKitServerUrl();
  if (!base) return null;
  return `${base}/${sanitizeLiveKitRoomName(room)}`;
}