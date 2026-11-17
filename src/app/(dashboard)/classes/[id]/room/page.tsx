import type { Metadata } from "next";
import { Suspense } from "react";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { getJoinState, loadClassForActor, type LiveClass } from "@/features/classes";
import { ClassRoom } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import { getActorWithPermission } from "@/server/auth/session";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getClassView } from "@/server/classes/class-repository";
import { markJoinedFromToken } from "@/server/classes/attendance";
import {
  buildGuestJoinUrl,
  parseGuestJoinToken,
} from "@/server/classes/guest-join";
import {
  createMeetingToken,
  getMeetingProviderLabel,
  getMeetingTokenExpiry,
  isMeetingConfigured,
  resolveClassroomVideo,
} from "@/server/classes/meeting";
import { getRecordingClientConfig } from "@/server/storage/recordings";
import { getAccountAvatarUrl } from "@/lib/account-avatar";
import { env } from "@/env";
import { isClassBroadcastLive } from "@/server/classes/broadcast-live";
import { isClassLiveSessionActive } from "@/server/classes/class-live-session";
import { academyDayKey } from "@/server/classes/manager-rooms";
import {
  canModerateClassroom,
  isAssignedClassTeacher,
  isStaffClassAudience,
} from "@/server/classes/class-teacher";
import { getWaitingRoomStatus } from "@/server/classes/waiting-room";

export const metadata: Metadata = {
  title: "Classroom",
  description: "Your live Spanglish class",
};

type ClassRoomPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ join?: string; name?: string }>;
};

export default function ClassRoomPage({ params, searchParams }: ClassRoomPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ClassRoomContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClassRoomContent({ params, searchParams }: ClassRoomPageProps) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const guestToken = query.join?.trim();
  const guestNameParam = query.name?.trim();

  const actor = await getActorWithPermission("classes:join-own");
  let guestViewer = false;
  let guestSelfServeMedia = false;
  let viewerId = actor?.userId ?? "";
  let viewerName = actor?.name ?? "";
  let item: LiveClass | null = null;

  const guestJoin = guestToken ? parseGuestJoinToken(guestToken, id) : null;

  if (guestJoin) {
    const owned = await getClassView(id);
    if (owned) {
      item = owned;
      guestViewer = true;
      if (guestJoin.kind === "staff") {
        if (!actor || actor.userId !== guestJoin.staffUserId) {
          if (!actor) {
            redirect(`/login?next=${encodeURIComponent(`/classes/${id}/room?join=${encodeURIComponent(guestToken!)}`)}`);
          }
          notFound();
        }
        guestSelfServeMedia = true;
        viewerId = `guest-staff-${guestJoin.staffUserId}`;
        viewerName = actor.name;
      } else if (actor && item && isStaffClassAudience(actor, item)) {
        guestSelfServeMedia = true;
        viewerId = `guest-staff-${actor.userId}`;
        viewerName = actor.name;
      } else {
        viewerId = `guest-${randomUUID()}`;
        viewerName = guestNameParam || "Guest";
      }
    }
  } else if (actor) {
    item = await loadClassForActor(id, actor);
  }

  if (!item) {
    if (!actor) {
      redirect(guestToken ? "/login" : "/classes");
    }
    notFound();
  }

  const policy = getClassPolicy();
  const now = appNow();
  const join = getJoinState(item, now, policy);

  const canModerate = Boolean(actor && canModerateClassroom(actor, item));
  const staffAudience = Boolean(actor && isStaffClassAudience(actor, item));

  if (staffAudience && !canModerate && actor) {
    const broadcastLive = await isClassBroadcastLive(item, now);
    if (!broadcastLive) {
      const day = academyDayKey(new Date(item.startsAt));
      redirect(
        actor.activeRole === "manager" ? `/manager/rooms?date=${day}` : `/classes/${id}`,
      );
    }
  }

  if (staffAudience && actor) {
    guestSelfServeMedia = true;
    viewerId = `guest-staff-${actor.userId}`;
    viewerName = actor.name;
  }
  const isAssignedTeacher = Boolean(actor && isAssignedClassTeacher(actor, item));
  const requireTeacherStart = env.CLASS_TEACHER_STARTS_SESSION;
  const canEndLiveSession = Boolean(isAssignedTeacher && requireTeacherStart);
  const liveSessionActive =
    !requireTeacherStart || (await isClassLiveSessionActive(id));
  const teacherMustStartSession = Boolean(
    join.canJoin && requireTeacherStart && !liveSessionActive && isAssignedTeacher,
  );
  const awaitingTeacherSession = Boolean(
    join.canJoin && requireTeacherStart && !liveSessionActive && !isAssignedTeacher,
  );

  const waitingRoomEnabled = env.CLASS_WAITING_ROOM && join.canJoin && liveSessionActive;
  const admittedToLiveKit =
    !waitingRoomEnabled ||
    guestViewer ||
    canModerate ||
    (actor ? (await getWaitingRoomStatus(id, actor.userId)) === "approved" : false);
  const waitingInLobby = Boolean(
    waitingRoomEnabled && join.canJoin && actor && !guestViewer && !canModerate && !admittedToLiveKit,
  );

  const token = join.canJoin && actor
    ? createMeetingToken({
        room: item.meetingRoom,
        classId: item.id,
        viewerId: actor.userId,
        nowIso: now,
      })
    : null;

  const viewerAvatarUrl = getAccountAvatarUrl(viewerId);

  const video =
    join.canJoin &&
    liveSessionActive &&
    admittedToLiveKit &&
    !teacherMustStartSession &&
    !awaitingTeacherSession
      ? await resolveClassroomVideo({
          room: item.meetingRoom,
          classId: item.id,
          viewerId,
          viewerName,
          avatarUrl: viewerAvatarUrl,
          guest: guestViewer && !guestSelfServeMedia,
        })
      : { mode: "local" as const, liveKit: null };

  // Attendance fallback when LiveKit webhooks are not configured.
  if (video.liveKit && actor && !guestViewer) {
    await markJoinedFromToken(item.id, actor.userId);
  }

  const canShareGuestLink = Boolean(actor && join.canJoin && canModerate);

  const guestJoinUrl = canShareGuestLink ? buildGuestJoinUrl(item.id, now) : null;

  return (
    <ClassRoom
      item={item}
      now={now}
      policy={policy}
      viewerName={viewerName}
      providerLabel={getMeetingProviderLabel()}
      providerConfigured={isMeetingConfigured()}
      videoMode={video.mode}
      liveKit={video.liveKit}
      recordingConfig={getRecordingClientConfig()}
      tokenExpiresAt={token ? getMeetingTokenExpiry(now) : null}
      guestJoinUrl={guestJoinUrl}
      guestViewer={guestViewer}
      guestSelfServeMedia={guestSelfServeMedia}
      canModerate={canModerate}
      waitingInLobby={waitingInLobby}
      viewerAvatarUrl={viewerAvatarUrl}
      teacherMustStartSession={teacherMustStartSession}
      awaitingTeacherSession={awaitingTeacherSession}
      liveSessionActive={liveSessionActive}
      canEndLiveSession={canEndLiveSession}
    />
  );
}