"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getActorWithPermission } from "@/server/auth/session";
import { replaceAvailability, type AvailabilityWindow } from "@/server/classes/availability";
import { saveTeacherProfile, type TeacherProfileInput } from "@/server/classes/teachers";
import {
  reviewApplication,
  submitApplication,
  withdrawApplication,
  type ApplicationInput,
} from "@/server/teaching/applications";
import {
  inviteTeacherApplicant,
  revokeTeacherInvitation,
} from "@/server/teaching/teacher-invites";
import { promoteUserToTeacherByEmail } from "@/server/teaching/teacher-promote";

export type TeachingActionResult = { ok: boolean; message: string };

/** Replaces the teacher's weekly availability. Booked classes are not touched. */
export async function saveAvailabilityAction(windows: AvailabilityWindow[]): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("classes:manage");
  if (!actor) return { ok: false, message: t("onlyTeachersAvailability") };
  if (!Array.isArray(windows) || windows.length > 70) {
    return { ok: false, message: t("tooManyWindows") };
  }

  const clean = windows.map((window) => ({
    weekday: Number(window.weekday),
    startMinute: Number(window.startMinute),
    endMinute: Number(window.endMinute),
  }));
  const result = await replaceAvailability(actor.userId, clean);
  if (!result.ok) return { ok: false, message: t(result.code === "WINDOW_OVERLAP" ? "windowOverlap" : "windowInvalid") };

  await recordAuditEvent({
    action: "availability.updated",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: actor.userId,
    metadata: { windows: clean.length },
  });
  revalidatePath("/teacher/availability");
  revalidatePath("/schedule");
  return { ok: true, message: t("availabilitySaved") };
}

export async function saveTeacherProfileAction(input: TeacherProfileInput): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("classes:manage");
  if (!actor) return { ok: false, message: t("onlyTeachersProfile") };
  await saveTeacherProfile(actor.userId, {
    headline: String(input.headline ?? ""),
    bio: String(input.bio ?? ""),
    country: String(input.country ?? ""),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
  });
  revalidatePath("/teacher/availability");
  revalidatePath("/schedule");
  return { ok: true, message: t("profileSaved") };
}

/* Teacher applications */

export async function submitApplicationAction(input: ApplicationInput): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { ok: false, message: t("signInStudentToApply") };
  const result = await submitApplication(actor, input);
  if (result.ok) revalidatePath("/apply");
  return result;
}

export async function withdrawApplicationAction(): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { ok: false, message: t("signInManageApplication") };
  const done = await withdrawApplication(actor);
  revalidatePath("/apply");
  return done
    ? { ok: true, message: t("applicationWithdrawn") }
    : { ok: false, message: t("noOpenApplication") };
}

export async function reviewApplicationAction(input: {
  applicationId: string;
  approve: boolean;
  note?: string;
}): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: t("onlyManagersReview") };
  const result = await reviewApplication(actor, input);
  revalidatePath("/manager/applications");
  revalidatePath("/admin/organization/applications");
  return result;
}

export async function inviteTeacherApplicantAction(input: { email: string; note?: string }): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: t("onlyManagersInvite") };
  const result = await inviteTeacherApplicant(actor, input);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
  }
  return result;
}

export async function revokeTeacherInvitationAction(invitationId: string): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: t("onlyManagersRevoke") };
  const result = await revokeTeacherInvitation(actor, invitationId);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
  }
  return result;
}

export async function promoteTeacherByEmailAction(email: string): Promise<TeachingActionResult> {
  const t = await getTranslations("educator.teachingActions");
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false, message: t("onlyAdminPromote") };
  const result = await promoteUserToTeacherByEmail(actor, email);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
    revalidatePath("/schedule");
  }
  return result;
}
