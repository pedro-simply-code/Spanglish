import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { normalizeRoles } from "@/lib/auth-roles";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { studentPairs, users } from "@/server/db/schema";

/*
 * Student pairs: two students who book paired classes together and share one
 * credit pool. Managers create and end pairs.
 */

export type ActivePair = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
};

export async function getActivePairForUser(userId: string): Promise<ActivePair | null> {
  const t = await getTranslations("ops.pairs");
  const [pair] = await db
    .select()
    .from(studentPairs)
    .where(
      and(
        eq(studentPairs.active, true),
        or(eq(studentPairs.studentAId, userId), eq(studentPairs.studentBId, userId)),
      ),
    )
    .limit(1);
  if (!pair) return null;

  const partnerId = pair.studentAId === userId ? pair.studentBId : pair.studentAId;
  const [partner] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, partnerId))
    .limit(1);

  return {
    id: pair.id,
    partnerId,
    partnerName: partner?.name ?? t("partnerFallback"),
    partnerEmail: partner?.email ?? "",
  };
}

export async function getPairMembers(pairId: string) {
  const [pair] = await db.select().from(studentPairs).where(eq(studentPairs.id, pairId)).limit(1);
  return pair ? [pair.studentAId, pair.studentBId] : [];
}

export type PairListEntry = {
  id: string;
  active: boolean;
  createdAt: string;
  students: { id: string; name: string; email: string }[];
};

export async function listPairs(): Promise<PairListEntry[]> {
  const pairs = await db.select().from(studentPairs).where(eq(studentPairs.active, true));
  if (!pairs.length) return [];
  const ids = [...new Set(pairs.flatMap((pair) => [pair.studentAId, pair.studentBId]))];
  const people = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));
  const byId = new Map(people.map((person) => [person.id, person]));

  return pairs.map((pair) => ({
    id: pair.id,
    active: pair.active,
    createdAt: pair.createdAt.toISOString(),
    students: [pair.studentAId, pair.studentBId]
      .map((id) => byId.get(id))
      .filter((person) => person !== undefined),
  }));
}

export type PairErrorCode =
  | "STUDENT_NOT_FOUND"
  | "NOT_A_STUDENT"
  | "SAME_STUDENT"
  | "ALREADY_PAIRED";

export async function createPair(input: {
  studentAEmail: string;
  studentBEmail: string;
  actorUserId: string;
}): Promise<{ ok: true; pairId: string } | { ok: false; code: PairErrorCode; message: string }> {
  const t = await getTranslations("ops.pairs");
  const emails = [input.studentAEmail, input.studentBEmail].map((email) =>
    email.trim().toLowerCase(),
  );
  if (emails[0] === emails[1]) {
    return { ok: false, code: "SAME_STUDENT", message: t("sameStudent") };
  }

  const found = await db
    .select({ id: users.id, email: users.email, roles: users.roles })
    .from(users)
    .where(inArray(users.email, emails));
  const students = emails.map((email) => found.find((row) => row.email === email));
  if (students.some((row) => !row)) {
    return { ok: false, code: "STUDENT_NOT_FOUND", message: t("studentNotFound") };
  }
  if (students.some((row) => !normalizeRoles(row!.roles).includes("student"))) {
    return { ok: false, code: "NOT_A_STUDENT", message: t("notAStudent") };
  }
  for (const student of students) {
    if (await getActivePairForUser(student!.id)) {
      return {
        ok: false,
        code: "ALREADY_PAIRED",
        message: t("alreadyPaired", { email: student!.email }),
      };
    }
  }

  const pairId = randomUUID();
  try {
    await db.insert(studentPairs).values({
      id: pairId,
      studentAId: students[0]!.id,
      studentBId: students[1]!.id,
      createdByUserId: input.actorUserId,
    });
  } catch {
    // A concurrent request paired one of them (partial unique index).
    return { ok: false, code: "ALREADY_PAIRED", message: t("justPaired") };
  }

  await recordAuditEvent({
    action: "pair.created",
    actorUserId: input.actorUserId,
    targetType: "pair",
    targetId: pairId,
    metadata: { students: emails },
  });
  return { ok: true, pairId };
}

export async function endPair(pairId: string, actorUserId: string) {
  const ended = await db
    .update(studentPairs)
    .set({ active: false, endedAt: new Date() })
    .where(and(eq(studentPairs.id, pairId), eq(studentPairs.active, true)))
    .returning({ id: studentPairs.id });

  if (ended.length) {
    await recordAuditEvent({
      action: "pair.ended",
      actorUserId,
      targetType: "pair",
      targetId: pairId,
    });
  }
  return ended.length > 0;
}
