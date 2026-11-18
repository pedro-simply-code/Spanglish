"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { loadClassForActor } from "@/features/classes/load";
import { getJoinState } from "@/features/classes/policy";
import { appNow } from "@/lib/app-clock";
import { getClassPolicy } from "@/server/classes/class-policy";
import {
  isLiveKitEgressConfigured,
  isLiveKitRtmpConfigured,
} from "@/server/classes/livekit-api";
import {
  getActiveEgress,
  startRoomCompositeRecording,
  startRoomRtmpStream,
  stopActiveEgress,
} from "@/server/classes/livekit-egress";
import { muteAllRemoteTracks, muteParticipantMicrophone } from "@/server/classes/livekit-moderation";
import { sanitizeLiveKitRoomName } from "@/server/classes/livekit";
import {
  endClassLiveSession,
  getClassLiveSession,
  startClassLiveSession,
} from "@/server/classes/class-live-session";
import {
  canModerateClassroom,
  isAssignedClassTeacher,
  isStaffClassAudience,
  isStaffObserverAccount,
} from "@/server/classes/class-teacher";
import { STAFF_GUEST_IDENTITY_PREFIX } from "@/lib/classroom-identities";
import {
  approveWaitingRoomAdmission,
  denyWaitingRoomAdmission,
  getWaitingRoomStatus,
  listWaitingRoomPending,
  requestWaitingRoomAdmission,
} from "@/server/classes/waiting-room";
import { getActorWithPermission } from "@/server/auth/session";
import { hasPermission } from "@/lib/auth-roles";
import {
  insertClassroomChatMessage,
  listClassroomChatMessages,
} from "@/server/classes/classroom-chat-repository";
import { classRoomName, getClassView } from "@/server/classes/class-repository";
import { parseGuestJoinToken } from "@/server/classes/guest-join";
import { env } from "@/env";
import {
  isCaptionLang,
  type ClassCaptionsState,
  type ClassroomChatMessage,
  type ClassTranscriptLine,
} from "@/features/classes/classroom-protocol";
import {
  getClassCaptions,
  insertTranscriptSegments,
  listTranscriptSegments,
  setClassCaptions,
} from "@/server/classes/class-transcript-repository";

export type ClassroomActionResult = {
  ok: boolean;
  message: string;
};

async function assertModerator(classId: string) {
  const t = await getTranslations("classroom");
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { actor: null, item: null, error: t("actions.signInModerate") };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { actor, item: null, error: t("actions.classNotFoundOrDenied") };
  }

  if (!canModerateClassroom(actor, item)) {
    return {
      actor,
      item,
      error: t("actions.onlyTeacherModerate"),
    };
  }

  return { actor, item, error: null };
}

async function assertAssignedTeacher(classId: string) {
  const t = await getTranslations("classroom");
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { actor: null, item: null, error: t("actions.signInStart") };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { actor, item: null, error: t("actions.classNotFoundOrDenied") };
  }

  if (!isAssignedClassTeacher(actor, item)) {
    return {
      actor,
      item,
      error: t("actions.onlyTeacherStartEnd"),
    };
  }

  return { actor, item, error: null };
}

export async function createStaffGuestJoinLinkAction(
  classId: string,
): Promise<{ ok: boolean; message: string; url?: string }> {
  const t = await getTranslations("classroom");
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: t("actions.signInStaff") };
  }

  if (!isStaffObserverAccount(actor)) {
    return {
      ok: false,
      message: t("actions.staffOnly"),
    };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { ok: false, message: t("actions.classNotFoundOrDenied") };
  }

  if (isAssignedClassTeacher(actor, item)) {
    return {
      ok: false,
      message: t("actions.youAreTeacher"),
    };
  }

  const join = getJoinState(item, appNow(), getClassPolicy());
  if (!join.canJoin) {
    return { ok: false, message: join.message };
  }

  const { buildStaffGuestJoinUrl } = await import("@/server/classes/guest-join");
  const url = buildStaffGuestJoinUrl(classId, actor.userId, appNow());
  return { ok: true, message: t("actions.staffLinkReady"), url };
}

export async function getClassLiveSessionStatusAction(classId: string) {
  if (!env.CLASS_TEACHER_STARTS_SESSION) {
    return { active: true, session: null as Awaited<ReturnType<typeof getClassLiveSession>> };
  }

  const session = await getClassLiveSession(classId);
  return { active: Boolean(session), session };
}

export async function startClassLiveSessionAction(
  classId: string,
): Promise<ClassroomActionResult> {
  const t = await getTranslations("classroom");
  const gate = await assertAssignedTeacher(classId);
  if (gate.error) return { ok: false, message: gate.error };

  if (!env.CLASS_TEACHER_STARTS_SESSION) {
    return { ok: true, message: t("actions.alreadyOpen") };
  }

  const join = getJoinState(gate.item!, appNow(), getClassPolicy());
  if (!join.canJoin) {
    return { ok: false, message: join.message };
  }

  await startClassLiveSession({ classId, teacherUserId: gate.actor!.userId });

  revalidatePath(`/classes/${classId}/room`);
  return {
    ok: true,
    message: t("actions.started"),
  };
}

export async function endClassLiveSessionAction(
  classId: string,
): Promise<ClassroomActionResult> {
  const t = await getTranslations("classroom");
  const gate = await assertAssignedTeacher(classId);
  if (gate.error) return { ok: false, message: gate.error };

  if (!env.CLASS_TEACHER_STARTS_SESSION) {
    return { ok: false, message: t("actions.startDisabled") };
  }

  await endClassLiveSession(classId);
  revalidatePath(`/classes/${classId}/room`);
  return {
    ok: true,
    message: t("actions.ended"),
  };
}

export async function requestClassroomAdmissionAction(
  classId: string,
): Promise<ClassroomActionResult> {
  const t = await getTranslations("classroom");
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: t("actions.signInWaiting") };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { ok: false, message: t("actions.noClassAccess") };
  }

  await requestWaitingRoomAdmission({
    classId,
    userId: actor.userId,
    name: actor.name,
  });

  revalidatePath(`/classes/${classId}/room`);
  return { ok: true, message: t("actions.waitingAdmit") };
}

export async function getClassroomAdmissionStatusAction(classId: string) {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) return { status: null as string | null };
  return { status: await getWaitingRoomStatus(classId, actor.userId) };
}

export async function listClassroomWaitingAction(
  classId: string,
): Promise<{ ok: boolean; message: string; pending: { userId: string; name: string }[] }> {
  const t = await getTranslations("classroom");
  const mod = await assertModerator(classId);
  if (mod.error) {
    return { ok: false, message: mod.error, pending: [] };
  }

  const pending = await listWaitingRoomPending(classId);

  return { ok: true, message: t("actions.waitingCount", { count: pending.length }), pending };
}

export async function approveClassroomAdmissionAction(
  classId: string,
  userId: string,
): Promise<ClassroomActionResult> {
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const t = await getTranslations("classroom");
  await approveWaitingRoomAdmission(classId, userId);
  revalidatePath(`/classes/${classId}/room`);
  return { ok: true, message: t("actions.participantAdmitted") };
}

export async function denyClassroomAdmissionAction(
  classId: string,
  userId: string,
): Promise<ClassroomActionResult> {
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const t = await getTranslations("classroom");
  await denyWaitingRoomAdmission(classId, userId);
  return { ok: true, message: t("actions.participantDenied") };
}

export async function muteAllClassroomAudioAction(
  classId: string,
  meetingRoom?: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const roomName = sanitizeLiveKitRoomName(classRoomName(classId));
  const result = await muteAllRemoteTracks(roomName);
  return { ok: result.ok, message: result.message };
}

export async function muteClassroomParticipantAction(
  classId: string,
  meetingRoom: string,
  participantIdentity: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const roomName = sanitizeLiveKitRoomName(classRoomName(classId));
  const result = await muteParticipantMicrophone(roomName, participantIdentity.trim());
  return { ok: result.ok, message: result.message };
}

/** Recording and streaming: the assigned teacher, with recordings:manage. */
async function assertRecorder(classId: string) {
  const mod = await assertModerator(classId);
  if (mod.error) return mod;
  if (!hasPermission(mod.actor!.roles, "recordings:manage")) {
    const t = await getTranslations("classroom");
    return { ...mod, error: t("actions.cannotRecord") };
  }
  return mod;
}

export async function startClassroomCloudRecordingAction(
  classId: string,
  meetingRoom?: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertRecorder(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const result = await startRoomCompositeRecording(classId, mod.actor!.userId);
  return { ok: result.ok, message: result.message };
}

export async function stopClassroomCloudRecordingAction(
  classId: string,
  meetingRoom?: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertRecorder(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const result = await stopActiveEgress(classId);
  return { ok: result.ok, message: result.message };
}

export async function startClassroomRtmpStreamAction(
  classId: string,
  meetingRoom?: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertRecorder(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const result = await startRoomRtmpStream(classId, mod.actor!.userId);
  return { ok: result.ok, message: result.message };
}

export async function stopClassroomRtmpStreamAction(
  classId: string,
  meetingRoom?: string,
): Promise<ClassroomActionResult> {
  void meetingRoom; // Kept for client compatibility; the room comes from the class.
  const mod = await assertRecorder(classId);
  if (mod.error) return { ok: false, message: mod.error };

  const result = await stopActiveEgress(classId);
  return { ok: result.ok, message: result.message };
}

export async function getClassroomHostCapabilitiesAction() {
  return {
    egressReady: isLiveKitEgressConfigured(),
    rtmpReady: isLiveKitRtmpConfigured(),
  };
}

/** Active egress for a class the actor moderates (was keyed by a client room name). */
export async function getClassroomEgressStatusAction(classId: string) {
  const mod = await assertModerator(classId);
  if (mod.error) return null;
  return getActiveEgress(classId);
}

async function assertClassroomRoomOpen(classId: string, guestJoinToken?: string | null) {
  const t = await getTranslations("classroom");
  const actor = await getActorWithPermission("classes:join-own");
  if (actor) {
    const item = await loadClassForActor(classId, actor);
    if (!item) {
      return { ok: false as const, message: t("actions.classNotFoundOrDenied") };
    }
    const join = getJoinState(item, appNow(), getClassPolicy());
    if (!join.canJoin) {
      return { ok: false as const, message: join.message };
    }
    return { ok: true as const, item };
  }

  const token = guestJoinToken?.trim();
  if (token && parseGuestJoinToken(token, classId)) {
    const view = await getClassView(classId);
    if (!view) {
      return { ok: false as const, message: t("actions.classNotFound") };
    }
    const join = getJoinState(view, appNow(), getClassPolicy());
    if (!join.canJoin) {
      return { ok: false as const, message: join.message };
    }
    return { ok: true as const, item: view };
  }

  return { ok: false as const, message: t("actions.signInOrLink") };
}

export async function listClassroomChatMessagesAction(
  classId: string,
  guestJoinToken?: string | null,
): Promise<{ ok: boolean; message: string; messages: ClassroomChatMessage[] }> {
  const t = await getTranslations("classroom");
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) {
    return { ok: false, message: gate.message, messages: [] };
  }

  try {
    const messages = await listClassroomChatMessages(classId);
    return {
      ok: true,
      message: t("actions.chatHistoryCount", { count: messages.length }),
      messages,
    };
  } catch {
    return { ok: false, message: t("actions.chatHistoryFailed"), messages: [] };
  }
}

/**
 * Saves a chat message for the class history. Sender identity, display name,
 * and timestamp come from the server session, never from the client payload.
 * Link-only guests (no account) cannot publish chat in LiveKit, so they cannot
 * write history either.
 */
export async function sendClassroomChatMessageAction(
  classId: string,
  message: ClassroomChatMessage,
  guestJoinToken?: string | null,
): Promise<ClassroomActionResult> {
  const t = await getTranslations("classroom");
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: t("actions.signInChat") };
  }

  const text = String(message?.text ?? "").trim();
  if (!text) {
    return { ok: false, message: t("actions.chatEmpty") };
  }
  if (text.length > 4000) {
    return { ok: false, message: t("actions.chatTooLong") };
  }

  // Same identity the classroom page gives this account in LiveKit.
  const identity = isStaffClassAudience(actor, gate.item)
    ? `${STAFF_GUEST_IDENTITY_PREFIX}${actor.userId}`
    : actor.userId;

  // Keep the client id (used to de-duplicate live and stored messages) only
  // when it belongs to this sender; otherwise mint one.
  const clientId = String(message?.id ?? "");
  const id =
    clientId.startsWith(`${identity}-`) && clientId.length <= 160
      ? clientId
      : `${identity}-${randomUUID()}`;

  try {
    await insertClassroomChatMessage(
      {
        id,
        from: identity,
        name: actor.name,
        text,
        at: new Date().toISOString(),
      },
      classId,
    );
    return { ok: true, message: t("actions.sent") };
  } catch {
    return { ok: false, message: t("actions.chatSaveFailed") };
  }
}

/** Captions switch for the room (late joiners read it here). */
export async function getClassroomCaptionsAction(
  classId: string,
  guestJoinToken?: string | null,
): Promise<ClassCaptionsState | null> {
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) return null;
  return getClassCaptions(classId);
}

/** Transcript so far, for the room's transcript panel (late joiners, reloads). */
export async function getClassroomTranscriptAction(
  classId: string,
  guestJoinToken?: string | null,
): Promise<ClassTranscriptLine[]> {
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) return [];
  try {
    return await listTranscriptSegments(classId, 2000);
  } catch {
    return [];
  }
}

/** The teacher turns live captions on or off and picks the spoken language. */
export async function setClassroomCaptionsAction(
  classId: string,
  input: { enabled: boolean; lang: string },
): Promise<ClassroomActionResult & { state?: ClassCaptionsState }> {
  const t = await getTranslations("classroom");
  const { error } = await assertModerator(classId);
  if (error) return { ok: false, message: error };
  const state: ClassCaptionsState = {
    enabled: Boolean(input.enabled),
    lang: isCaptionLang(input.lang) ? input.lang : "es-ES",
  };
  try {
    await setClassCaptions(classId, state);
    return {
      ok: true,
      message: state.enabled ? t("captions.turnedOn") : t("captions.turnedOff"),
      state,
    };
  } catch {
    return { ok: false, message: t("captions.saveFailed") };
  }
}

const MAX_SEGMENTS_PER_SAVE = 40;
const MAX_SEGMENT_CHARS = 2000;

/**
 * Saves the speaker's own final caption lines to the class transcript.
 * Speaker identity and name come from the server session; lines are only
 * accepted while the teacher has captions on.
 */
export async function saveClassroomTranscriptAction(
  classId: string,
  segments: { id: string; text: string; at: string }[],
  guestJoinToken?: string | null,
): Promise<ClassroomActionResult> {
  const t = await getTranslations("classroom");
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) return { ok: false, message: gate.message };

  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) return { ok: false, message: t("actions.signInChat") };

  const captions = await getClassCaptions(classId);
  if (!captions.enabled) return { ok: false, message: t("captions.off") };

  const identity = isStaffClassAudience(actor, gate.item)
    ? `${STAFF_GUEST_IDENTITY_PREFIX}${actor.userId}`
    : actor.userId;
  const now = Date.now();

  const rows = (Array.isArray(segments) ? segments : [])
    .slice(0, MAX_SEGMENTS_PER_SAVE)
    .map((segment) => {
      const text = String(segment?.text ?? "").trim().slice(0, MAX_SEGMENT_CHARS);
      const clientId = String(segment?.id ?? "");
      const spoken = Date.parse(String(segment?.at ?? ""));
      // Trust the client clock only within a few minutes of the server's.
      const spokenAt =
        Number.isFinite(spoken) && Math.abs(spoken - now) < 10 * 60_000
          ? new Date(spoken)
          : new Date(now);
      return {
        id:
          clientId.startsWith(`${identity}-`) && clientId.length <= 160
            ? clientId
            : `${identity}-${randomUUID()}`,
        sessionId: classId,
        speakerIdentity: identity,
        speakerUserId: actor.userId,
        speakerName: actor.name,
        body: text,
        lang: captions.lang,
        spokenAt,
      };
    })
    .filter((row) => row.body);

  try {
    await insertTranscriptSegments(rows);
    return { ok: true, message: t("captions.saved", { count: rows.length }) };
  } catch {
    return { ok: false, message: t("captions.saveFailed") };
  }
}
