import { and, eq, inArray, isNotNull, like, lt, sql } from "drizzle-orm";
// The seed runs outside Next.js: import the data module directly, because the
// feature barrel pulls in server actions that import "server-only".
// eslint-disable-next-line no-restricted-imports
import { materials as mockMaterials } from "@/features/materials/data";
import { seedAccounts } from "@/lib/demo-accounts";
import { db } from "@/server/db";
import {
  classParticipants,
  classRatings,
  classSessions,
  materials,
  payoutSettings,
  teacherApplications,
  users,
  type MaterialVisibility,
} from "@/server/db/schema";
import { rowsOf } from "@/server/credits/credits";
import { accrueEarnings, defaultPayoutSettings, seedTeacherPayoutRequest } from "@/server/teaching/earnings";
import { teacherProfiles } from "@/server/db/schema";

const at = (local: string) => seedAccounts.find((account) => account.email.startsWith(`${local}@`))?.email ?? "";

/** Mock authors → seeded teachers. */
const authorEmail: Record<string, string> = {
  "María González": at("teacher"),
  "Carlos Mendoza": at("teacher2"),
};

/** Visibility for the demo library; anything not listed is an approved global item. */
const demoVisibility: Record<string, { visibility: MaterialVisibility; moderation: "none" | "pending" | "approved" }> = {
  "mat-interview-frames": { visibility: "private", moderation: "none" },
  "mat-pronunciation-notes": { visibility: "shared", moderation: "none" },
  "mat-business-intro": { visibility: "shared", moderation: "none" },
  "mat-travel-quiz": { visibility: "global", moderation: "pending" },
};

const ratingComments = [
  "Great class, very clear explanations.",
  "Loved the conversation practice.",
  null,
  "Helpful corrections, thank you!",
  null,
];

/**
 * Phase 3 demo data: payout rates, the materials library, ratings for past
 * classes, earnings for them and one open teacher application.
 * Runs after seedDemoLiveClasses().
 */
export async function seedPhase3Demo() {
  const people = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, seedAccounts.map((account) => account.email)));
  const idByEmail = new Map(people.map((row) => [row.email, row.id]));

  // 1. Teacher rates.
  await db
    .insert(payoutSettings)
    .values({
      id: "default",
      rate25Cents: 800,
      rate50Cents: 1_400,
      pairedPercent: 140,
      ...defaultPayoutSettings,
    })
    .onConflictDoNothing();

  // 2. Materials library.
  await db.delete(materials).where(inArray(materials.id, mockMaterials.map((material) => material.id)));
  let materialCount = 0;
  for (const material of mockMaterials) {
    const authorUserId = idByEmail.get(authorEmail[material.ownerName] ?? at("teacher"));
    if (!authorUserId) continue;
    const state = demoVisibility[material.id] ?? { visibility: "global" as const, moderation: "approved" as const };
    await db.insert(materials).values({
      id: material.id,
      authorUserId,
      title: material.title,
      kind: material.kind,
      description: material.description,
      level: material.level,
      tags: material.tags,
      href: material.href ?? null,
      status: material.status === "draft" ? "draft" : "published",
      visibility: state.visibility,
      moderation: material.status === "draft" ? "none" : state.moderation,
      payload: {
        fileName: material.fileName,
        fileSize: material.fileSize,
        duration: material.duration,
        classId: material.classId,
        questionCount: material.questionCount,
        estimatedMinutes: material.estimatedMinutes,
        transcriptReady: material.transcriptReady,
      },
      createdAt: new Date(material.createdAt),
      updatedAt: new Date(material.updatedAt),
    });
    materialCount += 1;
  }

  // 3. Last month's delivered classes, so a payout batch can be prepared
  //    right away (a batch only covers a period that has ended).
  const now = new Date();
  const lastMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const history: [string, string, number, "one-on-one" | "paired"][] = [
    [at("teacher"), at("student"), 50, "one-on-one"],
    [at("teacher"), at("student2"), 25, "one-on-one"],
    [at("teacher"), at("student5"), 50, "one-on-one"],
    [at("teacher"), at("student3"), 50, "one-on-one"],
    [at("teacher"), at("student4"), 50, "one-on-one"],
    [at("teacher2"), at("student3"), 50, "one-on-one"],
    [at("teacher2"), at("student7"), 50, "one-on-one"],
    [at("teacher2"), at("student8"), 50, "one-on-one"],
    [at("teacher2"), at("student9"), 50, "one-on-one"],
    [at("teacher3"), at("student"), 25, "one-on-one"],
  ];
  await db.delete(classSessions).where(like(classSessions.id, "demo-history-%"));
  for (const [index, [teacherEmail, studentEmail, duration, classType]] of history.entries()) {
    const teacherId = idByEmail.get(teacherEmail);
    const studentId = idByEmail.get(studentEmail);
    if (!teacherId || !studentId) continue;
    const startsAt = new Date(lastMonth + (8 + index * 3) * 86_400_000 + 15 * 3_600_000);
    const sessionId = `demo-history-${index + 1}`;
    await db.insert(classSessions).values({
      id: sessionId,
      teacherId,
      classType,
      durationMinutes: duration,
      startsAt,
      endsAt: new Date(startsAt.getTime() + duration * 60_000),
      status: "scheduled",
      bookedByUserId: studentId,
      topic: "Conversation practice",
      description: "Delivered last month (demo history).",
    });
    await db.insert(classParticipants).values({
      sessionId,
      userId: studentId,
      firstJoinedAt: new Date(startsAt.getTime() + 60_000),
      secondsPresent: (duration - 3) * 60,
    });
  }

  // 4. Ratings for delivered demo classes.
  const attended = await db
    .select({
      sessionId: classSessions.id,
      teacherId: classSessions.teacherId,
      studentId: classParticipants.userId,
    })
    .from(classSessions)
    .innerJoin(classParticipants, eq(classParticipants.sessionId, classSessions.id))
    .where(
      and(
        like(classSessions.id, "demo-%"),
        sql`${classSessions.id} not like 'demo-history-%'`,
        eq(classSessions.status, "scheduled"),
        lt(classSessions.endsAt, new Date()),
        isNotNull(classParticipants.firstJoinedAt),
      ),
    );
  let ratingCount = 0;
  for (const [index, row] of attended.entries()) {
    // Leave one class unrated so the "Rate this class" card shows in the demo.
    if (index === 0) continue;
    await db
      .insert(classRatings)
      .values({ ...row, stars: index % 4 === 0 ? 4 : 5, comment: ratingComments[index % ratingComments.length] })
      .onConflictDoNothing();
    ratingCount += 1;
  }

  // 5. Earnings for those classes (unpaid, ready for a payout batch).
  await accrueEarnings();

  // 5b. Demo payout method + two individual teacher requests for admin/manager review.
  const demoPayoutTeachers = [at("teacher"), at("teacher2")];
  for (const email of demoPayoutTeachers) {
    const userId = idByEmail.get(email);
    if (!userId) continue;
    await db
      .insert(teacherProfiles)
      .values({
        userId,
        stripeAccountId: `acct_demo_${userId.slice(0, 8)}`,
        stripeReady: true,
      })
      .onConflictDoUpdate({
        target: teacherProfiles.userId,
        set: { stripeAccountId: `acct_demo_${userId.slice(0, 8)}`, stripeReady: true },
      });
    await seedTeacherPayoutRequest(userId);
  }

  // 6. One open application from a student who wants to teach (no upcoming
  //    student classes, so a manager can approve it).
  const applicantId = idByEmail.get(at("student6"));
  if (applicantId) {
    await db.delete(teacherApplications).where(eq(teacherApplications.userId, applicantId));
    await db.insert(teacherApplications).values({
      id: `demo-application-${applicantId}`,
      userId: applicantId,
      track: "conversation",
      fluency: "native",
      fluencyNote: "",
      yearsTeaching: 3,
      taughtOnlineBefore: true,
      credentials: [],
      headline: "Bilingual English–Spanish tutor",
      bio: "I grew up speaking both languages and have tutored classmates for three years.",
      country: "Mexico City, Mexico",
      teaches: ["english", "spanish"],
      experience: "Volunteer tutor at my university language exchange; informal conversation groups on campus.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  }

  const [earned] = rowsOf<{ count: number }>(
    await db.execute(sql`select count(*)::int as count from teacher_earnings`),
  );
  console.log(
    `Seeded ${materialCount} library materials, ${ratingCount} class ratings, ${earned?.count ?? 0} teacher earnings and 1 teacher application.`,
  );
}
