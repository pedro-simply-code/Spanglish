import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { appNowDate } from "@/lib/app-clock";
import type { LessonEntry, StudentAchievement, StudentInsights } from "@/lib/learning-types";
import { db } from "@/server/db";
import {
  assignmentSubmissions,
  assignments,
  classParticipants,
  classSessions,
  classSummaries,
  classTranscriptSegments,
  classVocabulary,
  recordings,
  studentWords,
  users,
} from "@/server/db/schema";
import { listAssignmentsForStudent } from "@/server/learning/assignments";
import { LEARNED_BOX } from "@/server/learning/vocabulary";

/*
 * Everything the student dashboard shows about progress is computed from
 * what really happened: classes taken (and minutes present), words in the
 * word list, and practice forms submitted.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd of a date in the viewer's time zone. */
function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Monday (yyyy-mm-dd) of the week a day key falls in. */
function weekKey(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(date.getTime() - weekday * DAY_MS).toISOString().slice(0, 10);
}

const shiftWeek = (week: string, weeks: number) =>
  new Date(new Date(`${week}T00:00:00Z`).getTime() + weeks * 7 * DAY_MS).toISOString().slice(0, 10);

/** Past (ended, not canceled) classes the student was booked into, newest first. */
async function pastClassRows(studentId: string) {
  return db
    .select({
      id: classSessions.id,
      topic: classSessions.topic,
      startsAt: classSessions.startsAt,
      durationMinutes: classSessions.durationMinutes,
      classType: classSessions.classType,
      recap: classSessions.recap,
      homework: classSessions.homework,
      teacherName: users.name,
      teacherAvatar: users.image,
      firstJoinedAt: classParticipants.firstJoinedAt,
      secondsPresent: classParticipants.secondsPresent,
    })
    .from(classParticipants)
    .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
    .innerJoin(users, eq(users.id, classSessions.teacherId))
    .where(
      and(
        eq(classParticipants.userId, studentId),
        ne(classSessions.status, "canceled"),
        lt(classSessions.endsAt, appNowDate()),
      ),
    )
    .orderBy(desc(classSessions.startsAt));
}

type PastClassRow = Awaited<ReturnType<typeof pastClassRows>>[number];

/** Minutes present; falls back to the class length when presence was not tracked. */
function minutesOf(row: PastClassRow) {
  if (row.secondsPresent > 0) return Math.round(row.secondsPresent / 60);
  return row.firstJoinedAt ? row.durationMinutes : 0;
}

const attendedRow = (row: PastClassRow) => Boolean(row.firstJoinedAt) || row.secondsPresent > 0;

/** The student's lesson history: one entry per past class, with what it left behind. */
export async function listLessonHistory(studentId: string, locale: "en" | "es" = "en"): Promise<LessonEntry[]> {
  const rows = await pastClassRows(studentId);
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);

  const [recordingRows, transcriptRows, vocabRows, assignmentRows, summaryRows] = await Promise.all([
    db
      .selectDistinct({ sessionId: recordings.sessionId })
      .from(recordings)
      .where(and(inArray(recordings.sessionId, ids), eq(recordings.status, "ready"))),
    db
      .selectDistinct({ sessionId: classTranscriptSegments.sessionId })
      .from(classTranscriptSegments)
      .where(inArray(classTranscriptSegments.sessionId, ids)),
    db
      .select({ sessionId: classVocabulary.sessionId, count: sql<number>`count(*)::int` })
      .from(classVocabulary)
      .where(inArray(classVocabulary.sessionId, ids))
      .groupBy(classVocabulary.sessionId),
    db
      .select({ id: assignments.id, sessionId: assignments.sessionId })
      .from(assignments)
      .where(inArray(assignments.sessionId, ids)),
    db
      .select({ sessionId: classSummaries.sessionId, en: classSummaries.contentEn, es: classSummaries.contentEs })
      .from(classSummaries)
      .where(and(inArray(classSummaries.sessionId, ids), eq(classSummaries.status, "ready"))),
  ]);
  const submitted = assignmentRows.length
    ? await db
        .select({ assignmentId: assignmentSubmissions.assignmentId })
        .from(assignmentSubmissions)
        .where(
          and(
            eq(assignmentSubmissions.studentId, studentId),
            inArray(
              assignmentSubmissions.assignmentId,
              assignmentRows.map((row) => row.id),
            ),
          ),
        )
    : [];
  const done = new Set(submitted.map((row) => row.assignmentId));
  const withRecording = new Set(recordingRows.map((row) => row.sessionId));
  const withTranscript = new Set(transcriptRows.map((row) => row.sessionId));
  const vocabCount = new Map(vocabRows.map((row) => [row.sessionId, row.count]));
  const summaries = new Map(
    summaryRows.map((row) => [row.sessionId, (locale === "es" ? row.es : row.en)?.overview ?? row.en?.overview ?? null]),
  );

  return rows.map((row) => {
    const own = assignmentRows.filter((item) => item.sessionId === row.id);
    return {
      id: row.id,
      topic: row.topic,
      teacherName: row.teacherName,
      teacherAvatar: row.teacherAvatar,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      classType: row.classType,
      attended: attendedRow(row),
      minutesPresent: minutesOf(row),
      recap: row.recap,
      homework: row.homework,
      hasRecording: withRecording.has(row.id),
      hasTranscript: withTranscript.has(row.id),
      summary: summaries.get(row.id) ?? null,
      vocabularyCount: vocabCount.get(row.id) ?? 0,
      assignmentCount: own.length,
      pendingAssignments: own.filter((item) => !done.has(item.id)).length,
    };
  });
}

function achievement(
  id: StudentAchievement["id"],
  icon: StudentAchievement["icon"],
  current: number,
  goal: number,
  unlockedAt: string | null,
): StudentAchievement {
  const unlocked = current >= goal;
  return {
    id,
    icon,
    current: Math.min(current, goal),
    goal,
    progress: Math.round((Math.min(current, goal) / goal) * 100),
    unlocked,
    unlockedAt: unlocked ? unlockedAt : null,
  };
}

/** Date (ISO) when a running total first reached `goal`, oldest first. */
function reachedAt<T>(items: T[], value: (item: T) => number, date: (item: T) => Date, goal: number) {
  let total = 0;
  for (const item of items) {
    total += value(item);
    if (total >= goal) return date(item).toISOString();
  }
  return null;
}

export async function getStudentInsights(studentId: string, timeZone: string): Promise<StudentInsights> {
  const now = appNowDate();
  const [past, words, studentAssignments] = await Promise.all([
    pastClassRows(studentId),
    db
      .select({ box: studentWords.box, dueAt: studentWords.dueAt })
      .from(studentWords)
      .where(eq(studentWords.studentId, studentId)),
    listAssignmentsForStudent(studentId),
  ]);

  const attended = past.filter(attendedRow);
  const oldestFirst = [...attended].reverse();
  const minutesInClass = attended.reduce((sum, row) => sum + minutesOf(row), 0);

  // Weeks with at least one class, and the current streak.
  const weeks = new Set(attended.map((row) => weekKey(dayKey(row.startsAt, timeZone))));
  const thisWeek = weekKey(dayKey(now, timeZone));
  let cursor = weeks.has(thisWeek) ? thisWeek : shiftWeek(thisWeek, -1);
  let weekStreak = 0;
  while (weeks.has(cursor)) {
    weekStreak += 1;
    cursor = shiftWeek(cursor, -1);
  }

  // Longest run of consecutive weeks, and when it first reached 4.
  let streakReachedAt: string | null = null;
  {
    let run = 0;
    let previous: string | null = null;
    for (const row of oldestFirst) {
      const week = weekKey(dayKey(row.startsAt, timeZone));
      if (week === previous) continue;
      run = previous && shiftWeek(previous, 1) === week ? run + 1 : 1;
      previous = week;
      if (run >= 4 && !streakReachedAt) streakReachedAt = row.startsAt.toISOString();
    }
  }

  const weeklyMinutes = Array.from({ length: 7 }, (_, index) => {
    const date = dayKey(new Date(now.getTime() - (6 - index) * DAY_MS), timeZone);
    const minutes = attended
      .filter((row) => dayKey(row.startsAt, timeZone) === date)
      .reduce((sum, row) => sum + minutesOf(row), 0);
    return { date, minutes };
  });
  const weeklyClasses = Array.from({ length: 8 }, (_, index) => {
    const weekStart = shiftWeek(thisWeek, index - 7);
    return {
      weekStart,
      classes: attended.filter((row) => weekKey(dayKey(row.startsAt, timeZone)) === weekStart).length,
    };
  });

  const wordsLearned = words.filter((word) => word.box >= LEARNED_BOX).length;
  const wordsDue = words.filter((word) => word.dueAt.getTime() <= now.getTime()).length;

  const submissions = studentAssignments
    .map((item) => item.mySubmission)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const graded = submissions.filter((item) => item.status === "graded" && item.maxScore > 0);
  const averageScore = graded.length
    ? Math.round(
        (graded.reduce((sum, item) => sum + (item.score ?? 0) / item.maxScore, 0) / graded.length) * 100,
      )
    : null;
  const firstSubmission = [...submissions].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0];

  const achievements = [
    achievement("firstClass", "star", attended.length, 1, oldestFirst[0]?.startsAt.toISOString() ?? null),
    achievement(
      "tenClasses",
      "medal",
      attended.length,
      10,
      oldestFirst[9]?.startsAt.toISOString() ?? null,
    ),
    achievement("fourWeeks", "flame", Math.max(weekStreak, streakReachedAt ? 4 : 0), 4, streakReachedAt),
    achievement(
      "tenHours",
      "trophy",
      Math.floor(minutesInClass / 60),
      10,
      reachedAt(oldestFirst, minutesOf, (row) => row.startsAt, 600),
    ),
    achievement("fiftyWords", "bolt", wordsLearned, 50, null),
    achievement("firstPractice", "target", submissions.length, 1, firstSubmission?.submittedAt ?? null),
  ];

  return {
    classesCompleted: attended.length,
    minutesInClass,
    weekStreak,
    wordsTotal: words.length,
    wordsLearned,
    wordsDue,
    assignmentsPending: studentAssignments.filter((item) => !item.mySubmission).length,
    assignmentsSubmitted: submissions.length,
    averageScore,
    weeklyMinutes,
    weeklyClasses,
    achievements,
  };
}
