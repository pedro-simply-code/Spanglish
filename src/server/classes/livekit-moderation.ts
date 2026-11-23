import { TrackSource } from "@livekit/protocol";
import { getTranslations } from "next-intl/server";
import { isStaffGuestIdentity } from "@/lib/classroom-identities";
import { getRoomServiceClient } from "@/server/classes/livekit-api";

export async function muteAllRemoteTracks(roomName: string) {
  const t = await getTranslations("classroom");
  const client = getRoomServiceClient();
  if (!client) {
    return { ok: false as const, message: t("moderation.apiNotConfigured") };
  }

  const participants = await client.listParticipants(roomName);
  let muted = 0;

  for (const participant of participants) {
    if (isStaffGuestIdentity(participant.identity)) {
      continue;
    }
    for (const track of participant.tracks) {
      const isAudio =
        track.source === TrackSource.MICROPHONE ||
        track.source === TrackSource.SCREEN_SHARE_AUDIO;

      if (isAudio && !track.muted) {
        await client.mutePublishedTrack(
          roomName,
          participant.identity,
          track.sid,
          true,
        );
        muted += 1;
      }
    }
  }

  return {
    ok: true as const,
    message: muted
      ? t("moderation.mutedCount", { count: muted })
      : t("moderation.noActiveAudio"),
  };
}

export async function muteParticipantMicrophone(roomName: string, identity: string) {
  const t = await getTranslations("classroom");
  const client = getRoomServiceClient();
  if (!client) {
    return { ok: false as const, message: t("moderation.apiNotConfigured") };
  }

  if (isStaffGuestIdentity(identity.trim())) {
    return {
      ok: false as const,
      message: t("moderation.staffNotMuted"),
    };
  }

  const participants = await client.listParticipants(roomName);
  const participant = participants.find((row) => row.identity === identity);
  if (!participant) {
    return { ok: false as const, message: t("moderation.participantNotFound") };
  }

  let muted = 0;
  for (const track of participant.tracks) {
    const isMic = track.source === TrackSource.MICROPHONE;
    if (isMic && !track.muted) {
      await client.mutePublishedTrack(roomName, participant.identity, track.sid, true);
      muted += 1;
    }
  }

  return {
    ok: true as const,
    message: muted ? t("moderation.participantMuted") : t("moderation.alreadyMuted"),
  };
}
/**
 * Closes the LiveKit room for everyone: every participant is disconnected
 * (reason ROOM_DELETED). Used when the teacher ends the class on purpose.
 */
export async function closeLiveKitRoom(roomName: string) {
  const client = getRoomServiceClient();
  if (!client) return false;
  try {
    await client.deleteRoom(roomName);
    return true;
  } catch {
    // Already gone (everyone left) or never created.
    return false;
  }
}
