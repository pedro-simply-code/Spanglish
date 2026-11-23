import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { Material } from "@/features/materials";
import type { AuthSession } from "@/lib/auth-types";
import { hasPermission, hasRole } from "@/lib/auth-roles";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  materials,
  users,
  type MaterialRow,
  type MaterialVisibility,
} from "@/server/db/schema";
import { notifyUsers } from "@/server/email/academy-notices";
import { questionsFromPayload } from "@/server/learning/assignments";

/*
 * The teaching library in the database.
 * - private: only the author.
 * - shared: every teacher and staff member can see and use it.
 * - global: students see it too, once a manager approves it.
 * Students also see materials attached to classes they take.
 */

type Payload = Partial<
  Pick<Material, "fileName" | "fileSize" | "duration" | "classId" | "questionCount" | "estimatedMinutes" | "transcriptReady">
> & { items?: Material["practiceItems"] };

function toMaterial(row: MaterialRow, ownerName: string): Material {
  const payload = (row.payload ?? {}) as Payload;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind as Material["kind"],
    status: row.status,
    level: row.level as Material["level"],
    tags: row.tags,
    ownerId: row.authorUserId,
    ownerName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    href: row.href ?? undefined,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    duration: payload.duration,
    classId: payload.classId,
    questionCount: payload.questionCount,
    estimatedMinutes: payload.estimatedMinutes,
    transcriptReady: payload.transcriptReady,
    practiceItems: row.kind === "practice" ? (payload.items ?? []) : undefined,
    visibility: row.visibility,
    moderation: row.moderation,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

async function withOwners(rows: MaterialRow[]) {
  const t = await getTranslations("ops.materials");
  const ids = [...new Set(rows.map((row) => row.authorUserId))];
  const owners = ids.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids))
    : [];
  const names = new Map(owners.map((owner) => [owner.id, owner.name]));
  return rows.map((row) => toMaterial(row, names.get(row.authorUserId) ?? t("teacherFallback")));
}

const isStaff = (actor: AuthSession) => hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin");
const globalApproved = and(eq(materials.visibility, "global"), eq(materials.moderation, "approved"));

/** Teachers: their own plus what colleagues shared. Staff: everything. */
export async function listLibraryForStaffOrTeacher(actor: AuthSession) {
  const rows = await db
    .select()
    .from(materials)
    .where(
      isStaff(actor)
        ? undefined
        : or(
            eq(materials.authorUserId, actor.userId),
            and(ne(materials.visibility, "private"), eq(materials.status, "published")),
          ),
    )
    .orderBy(desc(materials.updatedAt))
    .limit(500);
  return withOwners(rows);
}

async function classMaterialIds(studentId: string) {
  const rows = await db
    .select({ ids: classSessions.materialIds })
    .from(classSessions)
    .innerJoin(classParticipants, eq(classParticipants.sessionId, classSessions.id))
    .where(eq(classParticipants.userId, studentId));
  return [...new Set(rows.flatMap((row) => row.ids))];
}

/** Students: approved global materials and those attached to their classes. */
export async function listMaterialsForStudent(studentId: string) {
  const attached = await classMaterialIds(studentId);
  const rows = await db
    .select()
    .from(materials)
    .where(
      and(
        eq(materials.status, "published"),
        attached.length ? or(globalApproved, inArray(materials.id, attached)) : globalApproved,
      ),
    )
    .orderBy(desc(materials.updatedAt))
    .limit(500);
  return withOwners(rows);
}

export async function getMaterialForViewer(actor: AuthSession, id: string) {
  const [row] = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  if (!row) return null;

  let allowed = row.authorUserId === actor.userId || isStaff(actor);
  if (!allowed && hasRole(actor.roles, "teacher")) {
    allowed = row.visibility !== "private" && row.status === "published";
  }
  if (!allowed && hasRole(actor.roles, "student")) {
    allowed =
      row.status === "published" &&
      ((row.visibility === "global" && row.moderation === "approved") ||
        (await classMaterialIds(actor.userId)).includes(row.id));
  }
  if (!allowed) return null;
  const [material] = await withOwners([row]);
  return material ?? null;
}

/** Moderation state for a new visibility (managers publish globally at once). */
function moderationFor(actor: AuthSession, visibility: MaterialVisibility) {
  if (visibility !== "global") return "none" as const;
  return hasPermission(actor.roles, "materials:moderate") ? ("approved" as const) : ("pending" as const);
}

export async function insertMaterial(
  actor: AuthSession,
  input: {
    id: string;
    title: string;
    kind: string;
    description: string;
    level: string;
    visibility: MaterialVisibility;
    payload: Record<string, unknown>;
  },
) {
  const moderation = moderationFor(actor, input.visibility);
  await db.insert(materials).values({
    id: input.id,
    authorUserId: actor.userId,
    title: input.title,
    kind: input.kind,
    description: input.description,
    level: input.level,
    visibility: input.visibility,
    moderation,
    payload: input.payload,
  });
  if (moderation === "pending") {
    await recordAuditEvent({
      action: "material.submitted",
      actorUserId: actor.userId,
      targetType: "material",
      targetId: input.id,
    });
  }
  return moderation;
}

export async function setMaterialVisibility(actor: AuthSession, id: string, visibility: MaterialVisibility) {
  const t = await getTranslations("ops.materials");
  const [row] = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  if (!row || (row.authorUserId !== actor.userId && !isStaff(actor))) {
    return { ok: false as const, message: t("authorOnly") };
  }
  if (!["private", "shared", "global"].includes(visibility)) {
    return { ok: false as const, message: t("chooseVisibility") };
  }
  // An already approved global material stays approved; anything else re-enters review.
  const moderation =
    visibility === "global" && row.visibility === "global" && row.moderation === "approved"
      ? "approved"
      : moderationFor(actor, visibility);
  await db
    .update(materials)
    .set({ visibility, moderation, reviewNote: null, updatedAt: new Date() })
    .where(eq(materials.id, id));
  if (moderation === "pending") {
    await recordAuditEvent({ action: "material.submitted", actorUserId: actor.userId, targetType: "material", targetId: id });
  }
  return {
    ok: true as const,
    message:
      moderation === "pending" ? t("sentForReview") : t("visibilityUpdated"),
  };
}

export async function listModerationQueue() {
  const rows = await db
    .select()
    .from(materials)
    .where(
      and(
        eq(materials.visibility, "global"),
        inArray(materials.moderation, ["pending", "approved", "rejected"]),
      ),
    )
    .orderBy(desc(materials.updatedAt))
    .limit(200);
  return withOwners(rows);
}

export async function reviewMaterial(actor: AuthSession, input: { id: string; approve: boolean; note?: string }) {
  const t = await getTranslations("ops.materials");
  const note = input.note?.trim().slice(0, 500) || null;
  const [row] = await db
    .update(materials)
    .set({
      moderation: input.approve ? "approved" : "rejected",
      ...(input.approve ? { status: "published" as const } : {}),
      reviewNote: note,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(materials.id, input.id), eq(materials.moderation, "pending")))
    .returning();
  if (!row) return { ok: false as const, message: t("notWaitingForReview") };

  await recordAuditEvent({
    action: input.approve ? "material.approved" : "material.rejected",
    actorUserId: actor.userId,
    targetType: "material",
    targetId: row.id,
    metadata: { note },
  });
  notifyUsers(input.approve ? "material-approved" : "material-rejected", [row.authorUserId], {
    title: row.title,
    note: note ?? undefined,
  });
  return {
    ok: true as const,
    message: input.approve ? t("publishedMessage") : t("rejectedMessage"),
  };
}

export async function countPendingMaterials() {
  const rows = await db
    .select({ id: materials.id })
    .from(materials)
    .where(eq(materials.moderation, "pending"));
  return rows.length;
}

/** Materials by id, in the given order (missing ids are skipped). */
export async function listMaterialsByIds(ids: readonly string[]) {
  if (!ids.length) return [];
  const rows = await db.select().from(materials).where(inArray(materials.id, [...ids]));
  const found = await withOwners(rows);
  const byId = new Map(found.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is Material => Boolean(item));
}

/** Questions of a form material, from its stored payload. */
export async function getMaterialQuestions(id: string) {
  const [row] = await db.select({ payload: materials.payload }).from(materials).where(eq(materials.id, id)).limit(1);
  return row ? questionsFromPayload(row.payload) : [];
}
