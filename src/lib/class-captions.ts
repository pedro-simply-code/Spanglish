/** Shared by the classroom (client) and the transcript repository (server). */

import type { TranscriptSpeakerRole } from "@/lib/lesson-summary";

/**
 * Text-stream topic the classroom agent publishes live captions on (the
 * LiveKit convention). Attributes: `lk.transcription_final` ("true"/"false"),
 * `lk.segment_id`, and `spanglish.speaker` / `spanglish.speaker_name` for who spoke.
 */
export const TRANSCRIPTION_TOPIC = "lk.transcription";
export const CAPTION_ATTR_FINAL = "lk.transcription_final";
export const CAPTION_ATTR_SEGMENT = "lk.segment_id";
export const CAPTION_ATTR_SPEAKER = "spanglish.speaker";
export const CAPTION_ATTR_SPEAKER_NAME = "spanglish.speaker_name";

/** A saved line of the class transcript. */
export type ClassTranscriptLine = {
  id: string;
  speakerIdentity: string;
  speakerName: string;
  speakerRole: TranscriptSpeakerRole | null;
  text: string;
  lang: string;
  at: string;
};
