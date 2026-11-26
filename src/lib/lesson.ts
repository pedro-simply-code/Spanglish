/*
 * Duolingo-style lessons built from a practice set's words and phrases.
 * Pure functions shared by the teacher's editor (preview, counts), the
 * student's player and the tests. The teacher picks which kinds of exercise a
 * lesson uses; each kind needs certain data (an example sentence, its
 * translation…), and kinds without data are simply skipped.
 */

import type { PracticeItem } from "@/lib/practice-games";

export const EXERCISE_TYPES = [
  "meaning",
  "reverse",
  "listen",
  "match",
  "fill",
  "build",
  "write",
  "dictation",
  "speak",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Lesson settings saved with a practice material. */
export type LessonSettings = { types: ExerciseType[]; length: number };

export const LESSON_LENGTHS = [8, 12, 16, 20] as const;
export const DEFAULT_LESSON: LessonSettings = {
  types: ["meaning", "reverse", "listen", "match", "fill", "build", "write", "dictation", "speak"],
  length: 12,
};

export type Exercise =
  /** Spanish word → pick its meaning (4 options). */
  | { id: string; type: "meaning"; item: PracticeItem; options: string[]; answer: string }
  /** English → pick the Spanish word. */
  | { id: string; type: "reverse"; item: PracticeItem; options: string[]; answer: string }
  /** Hear the word → pick how it is written. */
  | { id: string; type: "listen"; item: PracticeItem; options: string[]; answer: string }
  /** Tap the pairs (Spanish ↔ English). */
  | { id: string; type: "match"; pairs: { left: string; right: string }[] }
  /** Example sentence with the word missing → pick the word. */
  | { id: string; type: "fill"; item: PracticeItem; before: string; after: string; options: string[]; answer: string }
  /** Build the Spanish sentence from word tiles (shows its English, or plays it). */
  | { id: string; type: "build"; item: PracticeItem; prompt: string | null; tiles: string[]; answer: string }
  /** Write the Spanish for an English word. */
  | { id: string; type: "write"; item: PracticeItem; answer: string }
  /** Hear a sentence (or word) → type it. */
  | { id: string; type: "dictation"; item: PracticeItem; answer: string }
  /** Read the sentence (or word) out loud. */
  | { id: string; type: "speak"; item: PracticeItem; answer: string };

/* ----------------------------------------------------------------------- */

export const sentenceOf = (item: PracticeItem) => (item.example?.trim() ? item.example.trim() : "");
export const tokens = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Lower case, no accents or punctuation, single spaces: how answers are compared. */
export function normalizeAnswer(text: string, keepAccents = false) {
  let value = text.toLowerCase().trim();
  if (!keepAccents) value = value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return value
    .replace(/[¿?¡!.,;:"“”«»()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type AnswerCheck = { correct: boolean; /** Right except for accents (ñ, á…): accepted with a note. */ accentSlip: boolean };

export function checkTyped(given: string, expected: string): AnswerCheck {
  if (normalizeAnswer(given, true) === normalizeAnswer(expected, true)) return { correct: true, accentSlip: false };
  if (normalizeAnswer(given) === normalizeAnswer(expected)) return { correct: true, accentSlip: true };
  return { correct: false, accentSlip: false };
}

/** Word-level similarity 0–1 (for speech: recognition is never perfect). */
export function similarity(given: string, expected: string) {
  const a = tokens(normalizeAnswer(given));
  const b = tokens(normalizeAnswer(expected));
  if (!a.length || !b.length) return 0;
  // Longest common subsequence of words.
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp[a.length]![b.length]! / Math.max(a.length, b.length);
}

export const SPEAK_PASS = 0.75;

/** The example sentence split around the word (case- and accent-insensitive), or null. */
export function blankOut(item: PracticeItem): { before: string; after: string } | null {
  const sentence = sentenceOf(item);
  const term = item.term.trim();
  if (!sentence || !term || tokens(term).length > 3) return null;
  const plain = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const at = plain(sentence).indexOf(plain(term));
  if (at < 0) return null;
  // Whole words only ("el" must not blank part of "hotel").
  const before = sentence.slice(0, at);
  const after = sentence.slice(at + term.length);
  const edge = /[\p{L}\p{N}]/u;
  if ((before && edge.test(before.at(-1)!)) || (after && edge.test(after[0]!))) return null;
  return { before, after };
}

/* ----------------------------------------------------------------------- */

type Random = () => number;

function shuffle<T>(list: readonly T[], random: Random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function optionsFor(answer: string, pool: string[], random: Random, count = 4) {
  const others = shuffle(
    [...new Set(pool.filter((value) => normalizeAnswer(value) !== normalizeAnswer(answer)))],
    random,
  ).slice(0, count - 1);
  return shuffle([answer, ...others], random);
}

/** Which exercise kinds these items can make (and how many). */
export function availableExercises(items: PracticeItem[], speechSupported = true): Record<ExerciseType, number> {
  const usable = items.filter((item) => item.term.trim() && item.translation.trim());
  const withSentence = usable.filter((item) => tokens(sentenceOf(item)).length >= 3);
  const enough = usable.length >= 4;
  return {
    meaning: enough ? usable.length : 0,
    reverse: enough ? usable.length : 0,
    listen: enough ? usable.length : 0,
    match: usable.length >= 4 ? Math.floor(usable.length / 4) : 0,
    fill: enough ? usable.filter((item) => blankOut(item)).length : 0,
    build: withSentence.length,
    write: usable.length,
    dictation: usable.length,
    speak: speechSupported ? usable.length : 0,
  };
}

/**
 * A lesson: `length` exercises mixing the chosen kinds, easier ones first
 * (recognize → build → produce), each word used several ways.
 */
export function buildLesson(
  items: PracticeItem[],
  settings: LessonSettings = DEFAULT_LESSON,
  options: { random?: Random; speechSupported?: boolean } = {},
): Exercise[] {
  const random = options.random ?? Math.random;
  const usable = items.filter((item) => item.term.trim() && item.translation.trim());
  if (usable.length < 4) return [];
  const can = availableExercises(usable, options.speechSupported ?? true);
  const types = settings.types.filter((type) => can[type] > 0);
  if (!types.length) return [];

  const terms = usable.map((item) => item.term);
  const meanings = usable.map((item) => item.translation);
  let serial = 0;
  const id = (type: string) => `${type}-${(serial += 1)}`;

  const make = (type: ExerciseType, item: PracticeItem): Exercise | null => {
    const sentence = sentenceOf(item);
    switch (type) {
      case "meaning":
        return { id: id(type), type, item, options: optionsFor(item.translation, meanings, random), answer: item.translation };
      case "reverse":
        return { id: id(type), type, item, options: optionsFor(item.term, terms, random), answer: item.term };
      case "listen":
        return { id: id(type), type, item, options: optionsFor(item.term, terms, random), answer: item.term };
      case "fill": {
        const blank = blankOut(item);
        if (!blank) return null;
        return { id: id(type), type, item, ...blank, options: optionsFor(item.term, terms, random), answer: item.term };
      }
      case "build": {
        if (tokens(sentence).length < 3) return null;
        const answerTokens = tokens(sentence);
        // A couple of extra words from other sentences make it a real choice.
        const extra = shuffle(
          usable
            .filter((other) => other !== item)
            .flatMap((other) => tokens(sentenceOf(other) || other.term))
            .filter((word) => !answerTokens.some((own) => normalizeAnswer(own) === normalizeAnswer(word))),
          random,
        ).slice(0, Math.min(3, Math.max(1, Math.floor(answerTokens.length / 3))));
        return {
          id: id(type),
          type,
          item,
          prompt: item.exampleTranslation?.trim() || null,
          tiles: shuffle([...answerTokens, ...extra], random),
          answer: sentence,
        };
      }
      case "write":
        return { id: id(type), type, item, answer: item.term };
      case "dictation":
        return { id: id(type), type, item, answer: tokens(sentence).length >= 3 ? sentence : item.term };
      case "speak":
        return { id: id(type), type, item, answer: tokens(sentence).length >= 3 && tokens(sentence).length <= 10 ? sentence : item.term };
      default:
        return null;
    }
  };

  // Rough order of difficulty, so a lesson warms up.
  const order: ExerciseType[] = ["meaning", "listen", "match", "reverse", "fill", "build", "dictation", "write", "speak"];
  const chosen = order.filter((type) => types.includes(type));
  const length = Math.max(4, Math.min(30, settings.length));

  // Every chosen kind at least once (when the lesson is long enough), the
  // rest spread over the non-match kinds; then easier kinds first, with a
  // little shuffling between neighbours.
  const repeatable = chosen.filter((type) => type !== "match");
  const plan: ExerciseType[] =
    chosen.length <= length
      ? [...chosen]
      : Array.from({ length }, (_, at) => chosen[Math.floor((at * chosen.length) / length)]!);
  while (plan.length < length && repeatable.length) plan.push(repeatable[Math.floor(random() * repeatable.length)]!);
  const rank = new Map(order.map((type, at) => [type, at]));
  const sorted = plan
    .map((type) => ({ type, key: rank.get(type)! + random() * 1.6 }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.type);

  const exercises: Exercise[] = [];
  const queue = shuffle(usable, random);
  let cursor = 0;
  for (const type of sorted) {
    if (type === "match") {
      const pairs = shuffle(usable, random)
        .slice(0, 4)
        .map((item) => ({ left: item.term, right: item.translation }));
      exercises.push({ id: id(type), type: "match", pairs });
      continue;
    }
    // Next word that can feed this kind (fill and build need a sentence).
    for (let tries = 0; tries < queue.length; tries++) {
      const exercise = make(type, queue[cursor % queue.length]!);
      cursor += 1;
      if (exercise) {
        exercises.push(exercise);
        break;
      }
    }
  }
  return exercises;
}

/** Points for finishing: 10 base + 1 per first-try correct answer. */
export function lessonXp(firstTryCorrect: number) {
  return 10 + firstTryCorrect;
}

export function parseLessonSettings(value: unknown): LessonSettings {
  const raw = (value ?? {}) as { types?: unknown; length?: unknown };
  const types = Array.isArray(raw.types)
    ? raw.types.filter((type): type is ExerciseType => (EXERCISE_TYPES as readonly string[]).includes(String(type)))
    : DEFAULT_LESSON.types;
  const length = Number(raw.length);
  return {
    types: types.length ? [...new Set(types)] : DEFAULT_LESSON.types,
    length: (LESSON_LENGTHS as readonly number[]).includes(length) ? length : DEFAULT_LESSON.length,
  };
}

/** What a finished lesson reports (and saves). */
export type LessonOutcome = { correct: number; total: number; xp: number; seconds: number };
