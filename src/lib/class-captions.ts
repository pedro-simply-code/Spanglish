/** Shared by the classroom (client) and the transcript repository (server). */

/** Languages the classroom speech recognizers can listen for. */
export const CAPTION_LANGS = ["es-ES", "en-US"] as const;
export type CaptionLang = (typeof CAPTION_LANGS)[number];

export function isCaptionLang(value: unknown): value is CaptionLang {
  return typeof value === "string" && (CAPTION_LANGS as readonly string[]).includes(value);
}

export type ClassCaptionsState = { enabled: boolean; lang: CaptionLang };

/** A saved line of the class transcript. */
export type ClassTranscriptLine = {
  id: string;
  speakerIdentity: string;
  speakerName: string;
  text: string;
  lang: string;
  at: string;
};
