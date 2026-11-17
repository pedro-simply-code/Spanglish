import { env } from "@/env";
import { signPayload, verifySignature } from "@/server/security";

type GuestJoinPayload = {
  classId: string;
  iat: number;
  exp: number;
  typ: "guest" | "staff-guest";
  /** Present for staff-guest: account that minted the link. */
  sub?: string;
};

export type GuestJoinKind = "viewer" | "staff";

export function createGuestJoinToken(classId: string, nowIso: string) {
  const issuedAt = Math.floor(new Date(nowIso).getTime() / 1000);
  const payload: GuestJoinPayload = {
    classId,
    iat: issuedAt,
    exp: issuedAt + env.MEETING_TOKEN_TTL_MINUTES * 60,
    typ: "guest",
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

function readGuestJoinPayload(token: string, classId: string): GuestJoinPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!verifySignature(body, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as GuestJoinPayload;

    if (payload.classId !== classId) return null;
    if (payload.typ !== "guest" && payload.typ !== "staff-guest") return null;
    if (Date.now() / 1000 >= payload.exp) return null;
    if (payload.typ === "staff-guest" && !payload.sub?.trim()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function parseGuestJoinToken(
  token: string,
  classId: string,
): { kind: GuestJoinKind; staffUserId?: string } | null {
  const payload = readGuestJoinPayload(token, classId);
  if (!payload) return null;
  if (payload.typ === "staff-guest") {
    return { kind: "staff", staffUserId: payload.sub!.trim() };
  }
  return { kind: "viewer" };
}

export function verifyGuestJoinToken(token: string, classId: string) {
  return parseGuestJoinToken(token, classId)?.kind === "viewer";
}

export function buildGuestJoinUrl(classId: string, nowIso: string) {
  const token = createGuestJoinToken(classId, nowIso);
  return `${env.NEXT_PUBLIC_APP_URL}/classes/${classId}/room?join=${encodeURIComponent(token)}`;
}

export function createStaffGuestJoinToken(
  classId: string,
  staffUserId: string,
  nowIso: string,
) {
  const issuedAt = Math.floor(new Date(nowIso).getTime() / 1000);
  const payload: GuestJoinPayload = {
    classId,
    iat: issuedAt,
    exp: issuedAt + env.MEETING_TOKEN_TTL_MINUTES * 60,
    typ: "staff-guest",
    sub: staffUserId,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

export function buildStaffGuestJoinUrl(
  classId: string,
  staffUserId: string,
  nowIso: string,
) {
  const token = createStaffGuestJoinToken(classId, staffUserId, nowIso);
  return `${env.NEXT_PUBLIC_APP_URL}/classes/${classId}/room?join=${encodeURIComponent(token)}`;
}