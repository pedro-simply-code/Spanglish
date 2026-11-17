import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, or } from "drizzle-orm";
import type { LiveClass } from "@/features/classes";
import { demoNow } from "@/lib/demo-clock";
import { demoAccountDomain, seedAccounts, seedPairs } from "@/lib/demo-accounts";
import { replaceAvailability, type AvailabilityWindow } from "@/server/classes/availability";
import { saveTeacherProfile } from "@/server/classes/teachers";
import { changeCredits, pairHolder, userHolder } from "@/server/credits/credits";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  creditAccounts,
  orders,
  pricingPackages,
  studentPairs,
  users,
  type ClassType,
} from "@/server/db/schema";

/*
 * Demo academy for development: teacher profiles and weekly availability,
 * the two student pairs, credit packages for every demo student, and sample
 * classes (past, today, upcoming, canceled). Times are relative to the moment
 * the seed runs, so the dashboards always have something to show.
 * Re-running replaces the demo data.
 */

const at = (local: string) => `${local}@${demoAccountDomain}`;

type ClassTemplate = {
  id: string;
  ownerEmail: string;
  teacherEmail: string;
  item: Omit<
    LiveClass,
    "id" | "teacherId" | "teacherName" | "teacherAvatar" | "timeZone" | "meetingRoom"
  >;
};

const teacherProfiles: Record<string, { headline: string; country: string; bio: string; tags: string[] }> = {
  [at("teacher")]: {
    headline: "Conversation and pronunciation",
    country: "Madrid, Spain",
    bio: "Friendly, patient and focused on getting you talking from the first minute.",
    tags: ["Conversation", "Pronunciation", "Beginner friendly"],
  },
  [at("teacher2")]: {
    headline: "Grammar and exam preparation",
    country: "Mexico City, Mexico",
    bio: "Clear explanations and practical exercises that make grammar finally click.",
    tags: ["Grammar", "Exam prep", "Structured"],
  },
  [at("teacher3")]: {
    headline: "Business English",
    country: "Chicago, USA",
    bio: "Meetings, presentations and interviews with confidence.",
    tags: ["Business", "Interviews", "Presentations"],
  },
  [at("teacher4")]: {
    headline: "Paired classes and travel Spanish",
    country: "Bogotá, Colombia",
    bio: "Relaxed, practical classes for couples and friends learning together.",
    tags: ["Paired", "Travel", "Culture"],
  },
  [at("teacher5")]: {
    headline: "English for everyday life",
    country: "Austin, USA",
    bio: "Small talk, idioms and the English you hear every day.",
    tags: ["Conversation", "Idioms", "Listening"],
  },
};

/** Weekday mornings and evenings in each teacher's own time zone. */
const weekdayWindows: AvailabilityWindow[] = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, startMinute: 8 * 60, endMinute: 12 * 60 },
  { weekday, startMinute: 15 * 60, endMinute: 21 * 60 },
]);
const saturdayWindow: AvailabilityWindow = { weekday: 6, startMinute: 9 * 60, endMinute: 13 * 60 };

/** Credits each demo student (or pair) starts with: [classType, minutes, credits]. */
const studentCredits: Record<string, [ClassType, 25 | 50, number][]> = {
  [at("student")]: [["one-on-one", 25, 30], ["one-on-one", 50, 30]],
  [at("student2")]: [["one-on-one", 25, 30], ["one-on-one", 50, 30]],
  [at("student3")]: [["one-on-one", 25, 30]],
  [at("student4")]: [["one-on-one", 50, 30]],
  [at("student5")]: [["one-on-one", 50, 30]],
  [at("student6")]: [["one-on-one", 25, 60]],
};
const pairCredits: [ClassType, 25 | 50, number][] = [["paired", 50, 30], ["paired", 25, 30]];

/** Timestamps align with demoNow (2026-11-16 10:00 EST) for reproducible statuses. */
const templates: ClassTemplate[] = [
  {
    id: "class-1003",
    ownerEmail: at("student"),
    teacherEmail: at("teacher"),
    item: {
      topic: "Travel Spanish warm-up",
      description: "Airport, hotel, and restaurant vocabulary before your trip.",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-16T20:00:00-05:00",
      creditCost: 1,
      agenda: ["Warm-up questions", "Hotel check-in role-play", "Pronunciation fixes"],
      outcomes: ["Polite requests", "Ask for clarification"],
      materials: [{ title: "Travel deck", description: "Phrases", href: "/vocabulary" }],
      teacherNote: "Bring one real travel scenario to role-play.",
    },
  },
  {
    id: "class-1004",
    ownerEmail: at("student"),
    teacherEmail: at("teacher3"),
    item: {
      topic: "Business introductions",
      description: "Introduce yourself and your role in a professional setting.",
      type: "one-on-one",
      duration: 50,
      startsAt: "2026-11-16T09:50:00-05:00",
      creditCost: 1,
      agenda: ["60-second intro", "Formal vs. informal", "Meeting opening"],
      outcomes: ["Confident self-intro", "Hand over the floor"],
      materials: [{ title: "Business intro", description: "Lesson", href: "/lessons" }],
      teacherNote: "Class is in progress — join from My classes.",
    },
  },
  {
    id: "class-1001",
    ownerEmail: at("student"),
    teacherEmail: at("teacher"),
    item: {
      topic: "Everyday conversation",
      description: "Relaxed chat about your week with targeted corrections.",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-17T18:00:00-05:00",
      creditCost: 1,
      agenda: ["Your week", "Past tense stories", "Goal for next class"],
      outcomes: ["Short past-tense story", "Natural connectors"],
      materials: [{ title: "Everyday phrases", description: "Lesson", href: "/lessons" }],
    },
  },
  {
    id: "class-0901",
    ownerEmail: at("student"),
    teacherEmail: at("teacher2"),
    item: {
      topic: "Ordering food with confidence",
      description: "Restaurant vocabulary and polite requests (completed).",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-12T18:00:00-05:00",
      creditCost: 1,
      agenda: ["Menu vocab", "Ordering role-play", "Recap"],
      outcomes: ["Order a full meal", "Handle a mistake calmly"],
      materials: [{ title: "Restaurant vocab", description: "Review", href: "/vocabulary" }],
      attended: true,
      recap: "Strong polite requests — keep practicing pedir vs. preguntar.",
      homework: "Record a 60-second order and listen back.",
    },
  },
  {
    id: "class-0902",
    ownerEmail: at("student"),
    teacherEmail: at("teacher"),
    item: {
      topic: "Pronunciation clinic",
      description: "Vowels, rhythm, and shadowing (completed).",
      type: "one-on-one",
      duration: 50,
      startsAt: "2026-11-10T08:00:00-05:00",
      creditCost: 1,
      agenda: ["Vowel warm-up", "Word stress", "Shadowing"],
      outcomes: ["Cleaner vowels", "Steadier rhythm"],
      materials: [{ title: "Pronunciation notes", description: "Drills", href: "/lessons" }],
      attended: true,
      recordingUrl: "https://recordings.spanglish.app/class-0902",
      recap: "Rhythm improved — shadow five minutes before the next class.",
    },
  },
  {
    id: "class-0801",
    ownerEmail: at("student"),
    teacherEmail: at("teacher5"),
    item: {
      topic: "Travel culture and slang",
      description: "Canceled — credit refunded.",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-14T18:00:00-05:00",
      creditCost: 1,
      agenda: ["Regional expressions", "Travel story", "Safe slang"],
      outcomes: ["Recognize rioplatense expressions"],
      materials: [{ title: "Travel notes", description: "Optional", href: "/lessons" }],
      statusOverride: "canceled",
      cancellation: {
        by: "student",
        reason: "Schedule conflict",
        at: "2026-11-13T10:12:00-05:00",
        creditRefunded: true,
      },
    },
  },
  {
    id: "class-2001",
    ownerEmail: at("student2"),
    teacherEmail: at("teacher"),
    item: {
      topic: "Present tense refresh",
      description: "Upcoming grammar and conversation mix.",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-18T11:00:00-05:00",
      creditCost: 1,
      agenda: ["Present tense review", "Mini conversation", "Homework"],
      outcomes: ["Conjugate common verbs", "Ask follow-up questions"],
      materials: [{ title: "Present tense", description: "Drill", href: "/practice" }],
    },
  },
  {
    id: "class-2002",
    ownerEmail: at("student2"),
    teacherEmail: at("teacher2"),
    item: {
      topic: "Interview Spanish",
      description: "Completed mock interview block.",
      type: "one-on-one",
      duration: 50,
      startsAt: "2026-11-08T14:00:00-05:00",
      creditCost: 1,
      agenda: ["STAR method", "Mock interview", "Feedback"],
      outcomes: ["Structure answers", "Describe experience clearly"],
      materials: [{ title: "Interview bank", description: "Questions", href: "/practice" }],
      attended: true,
      recap: "STAR answers are clearer — practice the opening 30 seconds.",
    },
  },
  {
    id: "class-3001",
    ownerEmail: at("student5"),
    teacherEmail: at("teacher3"),
    item: {
      topic: "Advanced reading club",
      description: "Upcoming discussion of a short news article.",
      type: "one-on-one",
      duration: 50,
      startsAt: "2026-11-19T16:00:00-05:00",
      creditCost: 1,
      agenda: ["Vocabulary preview", "Guided reading", "Debate"],
      outcomes: ["Summarize an article", "Express an opinion"],
      materials: [{ title: "Article", description: "Pre-read", href: "/materials" }],
    },
  },
  {
    id: "class-pair-01",
    ownerEmail: at("student7"),
    teacherEmail: at("teacher4"),
    item: {
      topic: "Paired conversation practice",
      description: "Shared credit class for Daniel and Olivia.",
      type: "paired",
      duration: 50,
      startsAt: "2026-11-20T19:00:00-05:00",
      creditCost: 1,
      agenda: ["Partner check-in", "Turn-taking", "Debate topic"],
      outcomes: ["Switch speakers naturally", "Support your partner"],
      materials: [{ title: "Paired prompts", description: "Deck", href: "/vocabulary" }],
      teacherNote: "Both partners should join from their own accounts.",
    },
  },
  {
    id: "class-pair-01",
    ownerEmail: at("student8"),
    teacherEmail: at("teacher4"),
    item: {
      topic: "Paired conversation practice",
      description: "Shared credit class for Daniel and Olivia.",
      type: "paired",
      duration: 50,
      startsAt: "2026-11-20T19:00:00-05:00",
      creditCost: 1,
      agenda: ["Partner check-in", "Turn-taking", "Debate topic"],
      outcomes: ["Switch speakers naturally", "Support your partner"],
      materials: [{ title: "Paired prompts", description: "Deck", href: "/vocabulary" }],
      teacherNote: "Both partners should join from their own accounts.",
    },
  },
  {
    id: "class-t-101",
    ownerEmail: at("student3"),
    teacherEmail: at("teacher"),
    item: {
      topic: "Beginner listening",
      description: "Short dialogues with repetition.",
      type: "one-on-one",
      duration: 25,
      startsAt: "2026-11-21T09:00:00-05:00",
      creditCost: 1,
      agenda: ["Listen twice", "Repeat", "Q&A"],
      outcomes: ["Catch key words", "Respond with short answers"],
      materials: [{ title: "Listening pack", description: "Audio", href: "/practice" }],
    },
  },
  {
    id: "class-t-102",
    ownerEmail: at("student4"),
    teacherEmail: at("teacher2"),
    item: {
      topic: "Subjunctive introduction",
      description: "Completed intro to present subjunctive.",
      type: "one-on-one",
      duration: 50,
      startsAt: "2026-11-07T17:00:00-05:00",
      creditCost: 1,
      agenda: ["Triggers", "Examples", "Controlled practice"],
      outcomes: ["Spot trigger phrases", "Form regular subjunctive"],
      materials: [{ title: "Subjunctive sheet", description: "Grammar", href: "/lessons" }],
      attended: true,
      recap: "Good accuracy on regular forms — watch irregular stems next.",
    },
  },
];


const HALF_HOUR = 30 * 60_000;

/** Moves a template time (relative to demoNow) to the same offset from now. */
function shiftFromDemo(iso: string, base: number) {
  return new Date(base + (new Date(iso).getTime() - new Date(demoNow).getTime()));
}

async function buyDemoPackage(input: {
  buyerUserId: string;
  pairId: string | null;
  holder: string;
  classType: ClassType;
  durationMinutes: 25 | 50;
  credits: number;
}) {
  const [pkg] = await db
    .select()
    .from(pricingPackages)
    .where(
      and(
        eq(pricingPackages.classType, input.classType),
        eq(pricingPackages.durationMinutes, input.durationMinutes),
        eq(pricingPackages.credits, input.credits),
      ),
    )
    .limit(1);
  const orderId = randomUUID();
  await db.insert(orders).values({
    id: orderId,
    buyerUserId: input.buyerUserId,
    pairId: input.pairId,
    packageId: pkg?.id ?? null,
    classType: input.classType,
    durationMinutes: input.durationMinutes,
    credits: input.credits,
    totalCents: pkg?.totalCents ?? 0,
    provider: "demo",
    status: "paid",
  });
  await changeCredits({
    holder: input.holder,
    kind: { classType: input.classType, durationMinutes: input.durationMinutes },
    delta: input.credits,
    reason: "purchase",
    orderId,
    actorUserId: input.buyerUserId,
    note: pkg?.name ?? "Demo package",
  });
}

export async function seedDemoLiveClasses() {
  const emails = seedAccounts.map((account) => account.email);
  const people = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails));
  const idByEmail = new Map(people.map((row) => [row.email, row.id]));
  const teacherIds = Object.keys(teacherProfiles)
    .map((email) => idByEmail.get(email))
    .filter((id): id is string => Boolean(id));
  const studentIds = seedAccounts
    .filter((account) => account.roles.includes("student"))
    .map((account) => idByEmail.get(account.email))
    .filter((id): id is string => Boolean(id));

  // 1. Teachers: profile and weekly availability.
  for (const [email, profile] of Object.entries(teacherProfiles)) {
    const id = idByEmail.get(email);
    if (!id) continue;
    await saveTeacherProfile(id, profile);
    const windows = email === at("teacher") || email === at("teacher4")
      ? [...weekdayWindows, saturdayWindow]
      : weekdayWindows;
    await replaceAvailability(id, windows);
  }

  // 2. Reset demo classes, pairs, credits and orders.
  if (teacherIds.length) {
    await db.delete(classSessions).where(inArray(classSessions.teacherId, teacherIds));
  }
  if (studentIds.length) {
    const oldPairs = await db
      .select({ id: studentPairs.id })
      .from(studentPairs)
      .where(or(inArray(studentPairs.studentAId, studentIds), inArray(studentPairs.studentBId, studentIds)));
    const holders = [
      ...studentIds.map(userHolder),
      ...oldPairs.map((pair) => pairHolder(pair.id)),
    ];
    await db.delete(creditAccounts).where(inArray(creditAccounts.holder, holders));
    await db.delete(orders).where(inArray(orders.buyerUserId, studentIds));
    if (oldPairs.length) {
      await db.delete(studentPairs).where(inArray(studentPairs.id, oldPairs.map((pair) => pair.id)));
    }
  }
  // Classes booked by demo students with other teachers.
  await db.delete(classSessions).where(like(classSessions.id, "demo-%"));

  // 3. Pairs and credits.
  const pairIdByEmail = new Map<string, string>();
  for (const [first, second] of seedPairs) {
    const a = idByEmail.get(first);
    const b = idByEmail.get(second);
    if (!a || !b) continue;
    const pairId = randomUUID();
    await db.insert(studentPairs).values({ id: pairId, studentAId: a, studentBId: b });
    pairIdByEmail.set(first, pairId);
    pairIdByEmail.set(second, pairId);
    for (const [classType, durationMinutes, credits] of pairCredits) {
      await buyDemoPackage({ buyerUserId: a, pairId, holder: pairHolder(pairId), classType, durationMinutes, credits });
    }
  }
  for (const [email, packages] of Object.entries(studentCredits)) {
    const id = idByEmail.get(email);
    if (!id) continue;
    for (const [classType, durationMinutes, credits] of packages) {
      await buyDemoPackage({ buyerUserId: id, pairId: null, holder: userHolder(id), classType, durationMinutes, credits });
    }
  }

  // 4. Sample classes (one row per class; paired classes include both partners).
  const base = Math.floor(Date.now() / HALF_HOUR) * HALF_HOUR;
  const seen = new Set<string>();
  let inserted = 0;
  for (const template of templates) {
    if (seen.has(template.id)) continue;
    seen.add(template.id);

    const teacherId = idByEmail.get(template.teacherEmail);
    const ownerId = idByEmail.get(template.ownerEmail);
    if (!teacherId || !ownerId) continue;

    const item = template.item;
    const pairId = item.type === "paired" ? pairIdByEmail.get(template.ownerEmail) ?? null : null;
    const participantIds = pairId
      ? [...pairIdByEmail.entries()]
          .filter(([, id]) => id === pairId)
          .map(([email]) => idByEmail.get(email)!)
      : [ownerId];
    const holder = pairId ? pairHolder(pairId) : userHolder(ownerId);
    const startsAt = shiftFromDemo(item.startsAt, base);
    const endsAt = new Date(startsAt.getTime() + item.duration * 60_000);
    const canceled = item.statusOverride === "canceled";
    const sessionId = `demo-${template.id}`;

    const kind = { classType: item.type, durationMinutes: item.duration };
    let accountId: string | null = null;
    try {
      const debit = await changeCredits({
        holder,
        kind,
        delta: -1,
        reason: "booking",
        sessionId,
        actorUserId: ownerId,
      });
      accountId = debit.accountId;
    } catch {
      console.warn(`[seed] Skip ${template.id}: no ${item.duration}-minute ${item.type} credits.`);
      continue;
    }

    try {
      await db.insert(classSessions).values({
        id: sessionId,
        teacherId,
        classType: item.type,
        durationMinutes: item.duration,
        startsAt,
        endsAt,
        status: canceled ? "canceled" : "scheduled",
        pairId,
        bookedByUserId: ownerId,
        creditAccountId: accountId,
        topic: item.topic,
        description: item.description,
        agenda: item.agenda,
        outcomes: item.outcomes,
        materials: item.materials,
        materialIds: item.materialIds ?? [],
        assignmentIds: item.assignmentIds ?? [],
        recap: item.recap ?? null,
        teacherNote: item.teacherNote ?? null,
        homework: item.homework ?? null,
        cancellation: item.cancellation
          ? {
              by: item.cancellation.by,
              byUserId: item.cancellation.by === "teacher" ? teacherId : ownerId,
              reason: item.cancellation.reason,
              at: shiftFromDemo(item.cancellation.at, base).toISOString(),
              creditRefunded: item.cancellation.creditRefunded,
            }
          : null,
        rescheduledFrom: item.rescheduledFrom ? shiftFromDemo(item.rescheduledFrom, base) : null,
      });
    } catch (error) {
      console.warn(`[seed] Skip ${template.id}: ${(error as Error).message}`);
      await changeCredits({ holder, kind, delta: 1, reason: "refund", actorUserId: ownerId, note: "Seed rollback" });
      continue;
    }

    const attended = item.attended && endsAt.getTime() < Date.now();
    await db.insert(classParticipants).values(
      participantIds.map((userId) => ({
        sessionId,
        userId,
        firstJoinedAt: attended ? new Date(startsAt.getTime() + 2 * 60_000) : null,
        secondsPresent: attended ? (item.duration - 4) * 60 : 0,
      })),
    );

    if (canceled && item.cancellation?.creditRefunded) {
      await changeCredits({ holder, kind, delta: 1, reason: "refund", sessionId, actorUserId: ownerId });
    }
    inserted += 1;
  }

  console.log(
    `Seeded ${teacherIds.length} teacher profiles with availability, ${seedPairs.length} pairs, credits, and ${inserted} sample classes.`,
  );
}
