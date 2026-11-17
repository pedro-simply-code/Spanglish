"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
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
import type { ClassroomChatMessage } from "@/features/classes/classroom-protocol";

export type ClassroomActionResult = {
  ok: boolean;
  message: string;
};

async function assertModerator(classId: string) {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { actor: null, item: null, error: "Sign in to moderate this class." };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { actor, item: null, error: "Class not found or access denied." };
  }

  if (!canModerateClassroom(actor, item)) {
    return {
      actor,
      item,
      error: "Only the teacher assigned to this class can run this action.",
    };
  }

  return { actor, item, error: null };
}

async function assertAssignedTeacher(classId: string) {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { actor: null, item: null, error: "Sign in to start this class." };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { actor, item: null, error: "Class not found or access denied." };
  }

  if (!isAssignedClassTeacher(actor, item)) {
    return {
      actor,
      item,
      error: "Only the teacher assigned to this class can start or end the live session.",
    };
  }

  return { actor, item, error: null };
}

export async function createStaffGuestJoinLinkAction(
  classId: string,
): Promise<{ ok: boolean; message: string; url?: string }> {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: "Sign in to join as staff guest." };
  }

  if (!isStaffObserverAccount(actor)) {
    return {
      ok: false,
      message: "Staff guest links are only for manager or admin accounts.",
    };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { ok: false, message: "Class not found or access denied." };
  }

  if (isAssignedClassTeacher(actor, item)) {
    return {
      ok: false,
      message: "You are the class teacher — refresh this page to host the room.",
    };
  }

  const join = getJoinState(item, appNow(), getClassPolicy());
  if (!join.canJoin) {
    return { ok: false, message: join.message };
  }

  const { buildStaffGuestJoinUrl } = await import("@/server/classes/guest-join");
  const url = buildStaffGuestJoinUrl(classId, actor.userId, appNow());
  return { ok: true, message: "Staff guest link ready.", url };
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
  const gate = await assertAssignedTeacher(classId);
  if (gate.error) return { ok: false, message: gate.error };

  if (!env.CLASS_TEACHER_STARTS_SESSION) {
    return { ok: true, message: "Live session is already open (teacher start disabled)." };
  }

  const join = getJoinState(gate.item!, appNow(), getClassPolicy());
  if (!join.canJoin) {
    return { ok: false, message: join.message };
  }

  await startClassLiveSession({ classId, teacherUserId: gate.actor!.userId });

  revalidatePath(`/classes/${classId}/room`);
  return {
    ok: true,
    message: "Live class started. Students can join the video call now.",
  };
}

export async function endClassLiveSessionAction(
  classId: string,
): Promise<ClassroomActionResult> {
  const gate = await assertAssignedTeacher(classId);
  if (gate.error) return { ok: false, message: gate.error };

  if (!env.CLASS_TEACHER_STARTS_SESSION) {
    return { ok: false, message: "Teacher start mode is off for this environment." };
  }

  await endClassLiveSession(classId);
  revalidatePath(`/classes/${classId}/room`);
  return {
    ok: true,
    message: "Live session ended for students. They cannot join the call until you start again.",
  };
}

export async function requestClassroomAdmissionAction(
  classId: string,
): Promise<ClassroomActionResult> {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: "Sign in to join the waiting room." };
  }

  const item = await loadClassForActor(classId, actor);
  if (!item) {
    return { ok: false, message: "You do not have access to this class." };
  }

  await requestWaitingRoomAdmission({
    classId,
    userId: actor.userId,
    name: actor.name,
  });

  revalidatePath(`/classes/${classId}/room`);
  return { ok: true, message: "Waiting for the teacher to admit you." };
}

export async function getClassroomAdmissionStatusAction(classId: string) {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) return { status: null as string | null };
  return { status: await getWaitingRoomStatus(classId, actor.userId) };
}

export async function listClassroomWaitingAction(
  classId: string,
): Promise<{ ok: boolean; message: string; pending: { userId: string; name: string }[] }> {
  const mod = await assertModerator(classId);
  if (mod.error) {
    return { ok: false, message: mod.error, pending: [] };
  }

  const pending = await listWaitingRoomPending(classId);

  return { ok: true, message: `${pending.length} waiting`, pending };
}

export async function approveClassroomAdmissionAction(
  classId: string,
  userId: string,
): Promise<ClassroomActionResult> {
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  await approveWaitingRoomAdmission(classId, userId);
  revalidatePath(`/classes/${classId}/room`);
  return { ok: true, message: "Participant admitted." };
}

export async function denyClassroomAdmissionAction(
  classId: string,
  userId: string,
): Promise<ClassroomActionResult> {
  const mod = await assertModerator(classId);
  if (mod.error) return { ok: false, message: mod.error };

  await denyWaitingRoomAdmission(classId, userId);
  return { ok: true, message: "Participant denied." };
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
    return { ...mod, error: "Your account cannot record classes." };
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
  const actor = await getActorWithPermission("classes:join-own");
  if (actor) {
    const item = await loadClassForActor(classId, actor);
    if (!item) {
      return { ok: false as const, message: "Class not found or access denied." };
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
      return { ok: false as const, message: "Class not found." };
    }
    const join = getJoinState(view, appNow(), getClassPolicy());
    if (!join.canJoin) {
      return { ok: false as const, message: join.message };
    }
    return { ok: true as const, item: view };
  }

  return { ok: false as const, message: "Sign in or use a valid guest link to use class chat." };
}

export async function listClassroomChatMessagesAction(
  classId: string,
  guestJoinToken?: string | null,
): Promise<{ ok: boolean; message: string; messages: ClassroomChatMessage[] }> {
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) {
    return { ok: false, message: gate.message, messages: [] };
  }

  try {
    const messages = await listClassroomChatMessages(classId);
    return { ok: true, message: `${messages.length} messages`, messages };
  } catch {
    return { ok: false, message: "Could not load chat history.", messages: [] };
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
  const gate = await assertClassroomRoomOpen(classId, guestJoinToken);
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) {
    return { ok: false, message: "Sign in to send messages in class chat." };
  }

  const text = String(message?.text ?? "").trim();
  if (!text) {
    return { ok: false, message: "Message cannot be empty." };
  }
  if (text.length > 4000) {
    return { ok: false, message: "Message is too long (max 4000 characters)." };
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
    return { ok: true, message: "Sent" };
  } catch {
    return { ok: false, message: "Could not save chat message." };
  }
}
