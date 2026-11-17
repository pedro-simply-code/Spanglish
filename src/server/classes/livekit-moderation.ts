import { TrackSource } from "@livekit/protocol";
import { isStaffGuestIdentity } from "@/lib/classroom-identities";
import { getRoomServiceClient } from "@/server/classes/livekit-api";

export async function muteAllRemoteTracks(roomName: string) {
  const client = getRoomServiceClient();
  if (!client) {
    return { ok: false as const, message: "LiveKit admin API is not configured." };
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
    message: muted ? `Muted ${muted} audio track(s).` : "No active audio tracks to mute.",
  };
}

export async function muteParticipantMicrophone(roomName: string, identity: string) {
  const client = getRoomServiceClient();
  if (!client) {
    return { ok: false as const, message: "LiveKit admin API is not configured." };
  }

  if (isStaffGuestIdentity(identity.trim())) {
    return {
      ok: false as const,
      message: "Staff guest observers are not muted from the host controls.",
    };
  }

  const participants = await client.listParticipants(roomName);
  const participant = participants.find((row) => row.identity === identity);
  if (!participant) {
    return { ok: false as const, message: "Participant is not in the room." };
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
    message: muted ? "Participant microphone muted." : "Microphone was already muted.",
  };
}