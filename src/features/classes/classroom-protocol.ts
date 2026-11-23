export { isStaffGuestIdentity, STAFF_GUEST_IDENTITY_PREFIX } from "@/lib/classroom-identities";
export {
  CAPTION_ATTR_FINAL,
  CAPTION_ATTR_SEGMENT,
  CAPTION_ATTR_SPEAKER,
  CAPTION_ATTR_SPEAKER_NAME,
  TRANSCRIPTION_TOPIC,
  type ClassTranscriptLine,
} from "@/lib/class-captions";

export const CLASSROOM_TOPIC_CHAT = "spanglish.chat";
export const CLASSROOM_TOPIC_RAISED_HAND = "spanglish.raised_hand";
export const CLASSROOM_TOPIC_HOST = "spanglish.host";
export const CLASSROOM_TOPIC_PROFILE = "spanglish.profile";
export const CLASSROOM_TOPIC_SCREEN_SHARE = "spanglish.screen_share";
export const CLASSROOM_TOPIC_LOCAL_RECORDING = "spanglish.local_recording";


export type ClassroomChatMessage = {
  id: string;
  from: string;
  name: string;
  text: string;
  at: string;
};

export type ClassroomProfilePayload = {
  identity: string;
  avatarUrl?: string;
  logoCover?: boolean;
};

export type ClassroomRaisedHandPayload = {
  identity: string;
  name: string;
  raised: boolean;
};

export type ClassroomScreenShareRequestPayload = {
  identity: string;
  name: string;
  requested: boolean;
};

export type ClassroomLocalRecordingRequestPayload = {
  identity: string;
  name: string;
  requested: boolean;
};

export type ClassroomHostSignal =
  | { type: "mute_all" }
  | { type: "layout"; view: "speaker" | "gallery" }
  | { type: "screen_share"; identity: string; approved: boolean }
  /** Browser recording on the student's device only (no cloud). */
  | { type: "local_recording"; identity: string; granted: boolean }
  /** When locked, non-host participants cannot turn their microphone back on. */
  | { type: "audience_mic_lock"; locked: boolean }
  | {
      type: "raised_hand";
      identity: string;
      decision: "accepted" | "denied" | "released";
    };

export type ClassroomLayoutMode = "speaker" | "gallery";

export type ClassroomParticipantMeta = {
  classId?: string;
  avatarUrl?: string;
  /** When true, others show this participant's account photo when their camera is off. */
  logoCover?: boolean;
};

export function parseClassroomParticipantMetadata(raw: string | undefined): ClassroomParticipantMeta {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as ClassroomParticipantMeta;
  } catch {
    return {};
  }
}