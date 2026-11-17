import { randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import { hasRole } from "@/lib/auth-roles";
import type {
  TeacherApplicationCredential,
  TeacherApplicationTrack,
  TeacherFluencyLevel,
} from "@/lib/teacher-application";
import { credentialTypes } from "@/lib/teacher-application";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getActivePairForUser, endPair } from "@/server/classes/pairs";
import { saveTeacherProfile } from "@/server/classes/teachers";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  teacherApplications,
  users,
  type ApplicationStatus,
} from "@/server/db/schema";
import { notifyRole, notifyUsers } from "@/server/email/academy-notices";
import { markTeacherInvitationSubmitted } from "@/server/teaching/teacher-invites";

/*
 * "Teach with us": a student applies, a manager (or the admin) approves or
 * rejects. Approval turns the account into a teacher account (one role per
 * account) and creates the public teacher profile from the application.
 */

export type ApplicationInput = {
  track: TeacherApplicationTrack;
  fluency: TeacherFluencyLevel;
  fluencyNote?: string;
  yearsTeaching: number;
  taughtOnlineBefore: boolean;
  credentials?: TeacherApplicationCredential[];
  headline: string;
  bio: string;
  country: string;
  teaches: string[];
  experience: string;
  videoUrl?: string;
};

export type ApplicationView = {
  id: string;
  status: ApplicationStatus;
  track: TeacherApplicationTrack;
  fluency: TeacherFluencyLevel;
  fluencyNote: string;
  yearsTeaching: number;
  taughtOnlineBefore: boolean;
  credentials: TeacherApplicationCredential[];
  headline: string;
  bio: string;
  country: string;
  teaches: string[];
  experience: string;
  videoUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  applicant: { id: string; name: string; email: string };
};

const languages = ["spanish", "english"];
const credentialTypeIds = new Set<string>(credentialTypes.map((item) => item.id));

function httpsOptional(url: string | undefined | null) {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!/^https:\/\/\S+$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeCredentials(input: TeacherApplicationCredential[] | undefined): TeacherApplicationCredential[] {
  if (!input?.length) return [];
  return input
    .slice(0, 5)
    .map((item) => ({
      type: credentialTypeIds.has(item.type) ? item.type : "other",
      label: (item.label ?? "").trim().slice(0, 200),
      year:
        item.year != null && Number.isFinite(Number(item.year))
          ? Math.min(2100, Math.max(1950, Math.round(Number(item.year))))
          : null,
      url: httpsOptional(item.url ?? undefined),
    }))
    .filter((item) => item.label.length >= 3);
}

export function validateApplication(input: ApplicationInput): string | null {
  if (input.track !== "conversation" && input.track !== "certified") {
    return "Choose an application track.";
  }
  if (!["native", "c2", "other"].includes(input.fluency)) {
    return "Choose your fluency level.";
  }
  if (input.fluency === "other" && (input.fluencyNote ?? "").trim().length < 10) {
    return "Explain your fluency (at least 10 characters).";
  }
  const years = Number(input.yearsTeaching);
  if (!Number.isFinite(years) || years < 0 || years > 60) {
    return "Years teaching must be between 0 and 60.";
  }
  if ((input.headline ?? "").trim().length < 5) return "Add a headline (at least 5 characters).";
  if ((input.bio ?? "").trim().length < 40) return "Tell us about yourself (at least 40 characters).";
  if ((input.country ?? "").trim().length < 2) return "Add where you live.";
  if ((input.experience ?? "").trim().length < 20) {
    return "Describe your teaching experience (at least 20 characters).";
  }
  if (!Array.isArray(input.teaches) || !input.teaches.some((item) => languages.includes(item))) {
    return "Choose the language you teach.";
  }

  const video = httpsOptional(input.videoUrl);
  if (input.track === "conversation" && !video) {
    return "Conversation track requires an intro video link (https://, e.g. YouTube or Loom).";
  }
  if (input.videoUrl?.trim() && !video) {
    return "The video link must start with https://.";
  }

  const credentials = normalizeCredentials(input.credentials);
  if (input.track === "certified" && credentials.length === 0) {
    return "Certified track requires at least one credential (type, name, optional link).";
  }
  for (const cred of credentials) {
    if (cred.url && !httpsOptional(cred.url)) {
      return "Credential links must start with https://.";
    }
  }

  return null;
}

function toView(
  row: typeof teacherApplications.$inferSelect,
  applicant: { id: string; name: string; email: string },
): ApplicationView {
  return {
    id: row.id,
    status: row.status,
    track: row.track,
    fluency: row.fluency,
    fluencyNote: row.fluencyNote,
    yearsTeaching: row.yearsTeaching,
    taughtOnlineBefore: row.taughtOnlineBefore,
    credentials: row.credentials ?? [],
    headline: row.headline,
    bio: row.bio,
    country: row.country,
    teaches: row.teaches,
    experience: row.experience,
    videoUrl: row.videoUrl,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    applicant,
  };
}

/** The actor's open application, or their latest one. */
export async function getMyApplication(actor: AuthSession) {
  const [row] = await db
    .select()
    .from(teacherApplications)
    .where(eq(teacherApplications.userId, actor.userId))
    .orderBy(desc(teacherApplications.createdAt))
    .limit(1);
  return row ? toView(row, { id: actor.userId, name: actor.name, email: actor.email }) : null;
}

export async function submitApplication(actor: AuthSession, input: ApplicationInput) {
  if (!hasRole(actor.roles, "student")) {
    return { ok: false as const, message: "Only student accounts can apply to teach." };
  }
  const error = validateApplication(input);
  if (error) return { ok: false as const, message: error };

  const credentials = normalizeCredentials(input.credentials);
  const video = httpsOptional(input.videoUrl);
  const id = randomUUID();
  try {
    await db.insert(teacherApplications).values({
      id,
      userId: actor.userId,
      track: input.track,
      fluency: input.fluency,
      fluencyNote: (input.fluencyNote ?? "").trim().slice(0, 500),
      yearsTeaching: Math.round(Number(input.yearsTeaching)),
      taughtOnlineBefore: Boolean(input.taughtOnlineBefore),
      credentials,
      headline: input.headline.trim().slice(0, 120),
      bio: input.bio.trim().slice(0, 2000),
      country: (input.country ?? "").trim().slice(0, 80),
      teaches: input.teaches.filter((item) => languages.includes(item)),
      experience: (input.experience ?? "").trim().slice(0, 2000),
      videoUrl: video,
    });
  } catch {
    return { ok: false as const, message: "You already have an application under review." };
  }

  await recordAuditEvent({
    action: "teacher.applied",
    actorUserId: actor.userId,
    targetType: "application",
    targetId: id,
    metadata: { track: input.track },
  });
  await markTeacherInvitationSubmitted(actor.email, id);
  notifyRole("application-received", "manager", { name: actor.name });
  return { ok: true as const, message: "Application sent. We will email you when it is reviewed." };
}

export async function withdrawApplication(actor: AuthSession) {
  const updated = await db
    .update(teacherApplications)
    .set({ status: "withdrawn", reviewedAt: new Date() })
    .where(and(eq(teacherApplications.userId, actor.userId), eq(teacherApplications.status, "submitted")))
    .returning({ id: teacherApplications.id });
  return updated.length > 0;
}

export async function listApplications(status?: ApplicationStatus): Promise<ApplicationView[]> {
  const rows = await db
    .select({ application: teacherApplications, name: users.name, email: users.email })
    .from(teacherApplications)
    .innerJoin(users, eq(users.id, teacherApplications.userId))
    .where(status ? eq(teacherApplications.status, status) : undefined)
    .orderBy(desc(teacherApplications.createdAt))
    .limit(100);
  return rows.map((row) =>
    toView(row.application, { id: row.application.userId, name: row.name, email: row.email }),
  );
}

export async function countPendingApplications() {
  const rows = await db
    .select({ id: teacherApplications.id })
    .from(teacherApplications)
    .where(eq(teacherApplications.status, "submitted"));
  return rows.length;
}

export async function reviewApplication(
  actor: AuthSession,
  input: { applicationId: string; approve: boolean; note?: string },
) {
  const [row] = await db
    .select()
    .from(teacherApplications)
    .where(and(eq(teacherApplications.id, input.applicationId), eq(teacherApplications.status, "submitted")))
    .limit(1);
  if (!row) return { ok: false as const, message: "This application was already reviewed." };
  const note = input.note?.trim().slice(0, 1000) || null;

  if (input.approve) {
    // A teacher account cannot also attend classes as a student.
    const upcoming = await db
      .select({ id: classSessions.id })
      .from(classParticipants)
      .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
      .where(
        and(
          eq(classParticipants.userId, row.userId),
          eq(classSessions.status, "scheduled"),
          gt(classSessions.endsAt, new Date()),
        ),
      )
      .limit(1);
    if (upcoming.length) {
      return {
        ok: false as const,
        message: "The applicant still has upcoming classes as a student. Approve after those classes (or cancel them).",
      };
    }

    const pair = await getActivePairForUser(row.userId);
    if (pair) await endPair(pair.id, actor.userId);

    await db.update(users).set({ roles: ["teacher"], updatedAt: new Date() }).where(eq(users.id, row.userId));
    await saveTeacherProfile(row.userId, {
      headline: row.headline,
      bio: row.bio,
      country: row.country,
      tags: row.teaches.map((item) => (item === "spanish" ? "Spanish" : "English")),
    });
  }

  await db
    .update(teacherApplications)
    .set({
      status: input.approve ? "approved" : "rejected",
      reviewerUserId: actor.userId,
      reviewNote: note,
      reviewedAt: new Date(),
    })
    .where(eq(teacherApplications.id, row.id));

  await recordAuditEvent({
    action: input.approve ? "teacher.approved" : "teacher.rejected",
    severity: input.approve ? "warning" : "info",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: row.userId,
    metadata: { applicationId: row.id, note, track: row.track },
  });
  notifyUsers(input.approve ? "application-approved" : "application-rejected", [row.userId], {
    note: note ?? undefined,
  });

  return {
    ok: true as const,
    message: input.approve
      ? "Approved. The account is now a teacher account."
      : "Application rejected. The applicant was notified.",
  };
}