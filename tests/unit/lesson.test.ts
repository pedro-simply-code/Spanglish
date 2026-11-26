import { describe, expect, it } from "vitest";
import {
  availableExercises,
  blankOut,
  buildLesson,
  checkTyped,
  parseLessonSettings,
  similarity,
  type Exercise,
} from "@/lib/lesson";
import type { PracticeItem } from "@/lib/practice-games";

const items: PracticeItem[] = [
  { id: "1", term: "la playa", translation: "the beach", example: "Vamos a la playa mañana.", exampleTranslation: "We're going to the beach tomorrow." },
  { id: "2", term: "comer", translation: "to eat", example: "Me gusta comer tacos." },
  { id: "3", term: "el hotel", translation: "the hotel", example: "El hotel está cerca." },
  { id: "4", term: "barato", translation: "cheap", example: "" },
  { id: "5", term: "la cuenta", translation: "the bill", example: "La cuenta, por favor." },
];

/** Same numbers every run. */
function seeded(seed = 42) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

describe("answers", () => {
  it("accepts a missing accent but says so, rejects a wrong word", () => {
    expect(checkTyped("Mañana", "mañana")).toEqual({ correct: true, accentSlip: false });
    expect(checkTyped("manana", "mañana")).toEqual({ correct: true, accentSlip: true });
    expect(checkTyped("¡La cuenta, por favor!", "la cuenta por favor")).toEqual({ correct: true, accentSlip: false });
    expect(checkTyped("la cena", "la cuenta").correct).toBe(false);
  });

  it("scores speech by words in order", () => {
    expect(similarity("vamos a la playa mañana", "Vamos a la playa mañana.")).toBe(1);
    expect(similarity("vamos a playa mañana", "Vamos a la playa mañana.")).toBeCloseTo(0.8);
    expect(similarity("", "hola")).toBe(0);
  });

  it("blanks out the word only as a whole word", () => {
    expect(blankOut(items[0]!)).toEqual({ before: "Vamos a ", after: " mañana." });
    expect(blankOut(items[2]!)).toEqual({ before: "", after: " está cerca." });
    expect(blankOut({ id: "x", term: "el", translation: "the", example: "Un hotel grande." })).toBeNull();
    expect(blankOut(items[3]!)).toBeNull();
  });
});

describe("lessons", () => {
  it("knows which exercises the words can make", () => {
    const can = availableExercises(items);
    expect(can.meaning).toBe(5);
    expect(can.fill).toBe(4);
    expect(can.build).toBe(4);
    expect(availableExercises(items, false).speak).toBe(0);
    expect(availableExercises(items.slice(0, 3)).meaning).toBe(0);
  });

  it("builds a lesson of the chosen kinds and length, with the answer among the options", () => {
    const lesson = buildLesson(items, { types: ["meaning", "fill", "build", "match"], length: 12 }, { random: seeded() });
    expect(lesson).toHaveLength(12);
    expect(new Set(lesson.map((exercise) => exercise.type))).toEqual(new Set(["meaning", "fill", "build", "match"]));
    for (const exercise of lesson as Exercise[]) {
      if ("options" in exercise) expect(exercise.options).toContain(exercise.answer);
      if (exercise.type === "build") {
        for (const word of exercise.answer.split(" ")) expect(exercise.tiles).toContain(word);
      }
    }
    expect(lesson.filter((exercise) => exercise.type === "match")).toHaveLength(1);
  });

  it("skips kinds the words can't make and needs at least 4 words", () => {
    const noSentences = items.map((item) => ({ ...item, example: "" }));
    const lesson = buildLesson(noSentences, { types: ["fill", "build", "write"], length: 8 }, { random: seeded() });
    expect(lesson.every((exercise) => exercise.type === "write")).toBe(true);
    expect(buildLesson(items.slice(0, 3))).toEqual([]);
  });

  it("reads saved settings safely", () => {
    expect(parseLessonSettings({ types: ["speak", "nope", "speak"], length: 16 })).toEqual({ types: ["speak"], length: 16 });
    expect(parseLessonSettings(null).length).toBe(12);
  });
});

describe("lesson mix", () => {
  it("uses every chosen kind once the lesson is long enough, easy kinds first", () => {
    for (let seed = 1; seed < 30; seed++) {
      const lesson = buildLesson(items, parseLessonSettings({ length: 12 }), { random: seeded(seed) });
      expect(lesson).toHaveLength(12);
      expect(new Set(lesson.map((exercise) => exercise.type)).size).toBe(9);
      expect(lesson.filter((exercise) => exercise.type === "match")).toHaveLength(1);
      // Speaking never opens the lesson.
      expect(lesson.slice(0, 4).some((exercise) => exercise.type === "speak")).toBe(false);
    }
  });
});
