/** Interactive practice (games) shared by the material editor, the player and the server. */

/** One word or phrase of a practice set. */
export type PracticeItem = {
  id: string;
  /** Spanish word or phrase. */
  term: string;
  /** English meaning. */
  translation: string;
  /** Optional Spanish sentence (dictation, "complete the sentence", "build the sentence"). */
  example?: string;
  /** English of the example sentence: the prompt of "translate with tiles". */
  exampleTranslation?: string;
  /** Teacher's recording (practice-audio key); without it the browser voice reads the term. */
  audio?: string;
};

export const PRACTICE_GAMES = ["flashcards", "memory", "listen", "dictation", "order"] as const;
export type PracticeGame = (typeof PRACTICE_GAMES)[number];

/** A practice set needs this many items (memory pairs, four answer options). */
export const MIN_PRACTICE_ITEMS = 4;
export const MAX_PRACTICE_ITEMS = 60;
/** Teacher recordings: short clips only. */
export const MAX_PRACTICE_AUDIO_BYTES = 1024 * 1024;

/** URL that plays a practice recording (signed in users only). */
export const practiceAudioUrl = (key: string) => `/api/practice-audio?key=${encodeURIComponent(key)}`;
