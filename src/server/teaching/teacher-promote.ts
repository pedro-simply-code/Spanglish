import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { canChangeRole, hasRole, type RoleCode } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { getActivePairForUser, endPair } from "@/server/classes/pairs";
import { saveTeacherProfile } from "@/server/classes/teachers";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  teacherApplications,
  teacherInvitations,
  users,
} from "@/server/db/schema";
import { notifyUsers } from "@/server/email/academy-notices";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

async function assertCanBecomeTeacher(userId: string) {
  const t = await getTranslations("ops.teaching");
  const upcoming = await db
    .select({ id: classSessions.id })
    .from(classParticipants)
    .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
    .where(
      and(
        eq(classParticipants.userId, userId),
        eq(classSessions.status, "scheduled"),
        gt(classSessions.endsAt, new Date()),
      ),
    )
    .limit(1);
  if (upcoming.length) {
    return {
      ok: false as const,
      message: t("promoteUpcomingClasses"),
    };
  }
  return { ok: true as const };
}

export async function promoteUserToTeacherByEmail(actor: AuthSession, email: string) {
  const t = await getTranslations("ops.teaching");
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: t("promoteAdminOnly") };
  }

  const user = await findUserByEmail(email);
  if (!user) return { ok: false as const, message: t("promoteNoAccount") };
  if (!user.emailVerified) {
    return { ok: false as const, message: t("promoteVerifyEmail") };
  }

  const targetRoles = user.roles as RoleCode[];
  if (hasRole(targetRoles, "teacher")) {
    return { ok: false as const, message: t("promoteAlreadyTeacher") };
  }
  if (hasRole(targetRoles, "admin") || hasRole(targetRoles, "manager")) {
    return { ok: false as const, message: t("promoteStaffCannot") };
  }
  if (!hasRole(targetRoles, "student")) {
    return { ok: false as const, message: t("promoteStudentsOnly") };
  }

  const decision = canChangeRole(actor.roles, targetRoles, { role: "teacher", action: "grant" });
  if (!decision.allowed) return { ok: false as const, message: decision.reason };

  const ready = await assertCanBecomeTeacher(user.id);
  if (!ready.ok) return ready;

  const pair = await getActivePairForUser(user.id);
  if (pair) await endPair(pair.id, actor.userId);

  await db.update(users).set({ roles: ["teacher"], updatedAt: new Date() }).where(eq(users.id, user.id));

  const headline = user.name?.trim()
    ? t("promoteHeadline", { name: user.name.trim() })
    : t("promoteHeadlineNoName");
  await saveTeacherProfile(user.id, {
    headline: headline.slice(0, 120),
    bio: "",
    country: "",
    tags: [],
  });

  await db
    .update(teacherApplications)
    .set({
      status: "approved",
      reviewerUserId: actor.userId,
      reviewNote: t("promoteReviewNote"),
      reviewedAt: new Date(),
    })
    .where(and(eq(teacherApplications.userId, user.id), eq(teacherApplications.status, "submitted")));

  await db
    .update(teacherInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(teacherInvitations.status, "pending"),
        sql`lower(${teacherInvitations.email}) = ${normalizeEmail(user.email)}`,
      ),
    );

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "teacher.approved",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: user.id,
    metadata: { method: "direct_promote", email: user.email },
    ...ctx,
  });
  notifyUsers("application-approved", [user.id]);

  return {
    ok: true as const,
    message: t("promoteSuccess"),
  };
}