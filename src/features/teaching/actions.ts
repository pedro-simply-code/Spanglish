"use server";

import { revalidatePath } from "next/cache";
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

const errorMessages = {
  WINDOW_INVALID: "Each window needs a start before its end and at least 25 minutes.",
  WINDOW_OVERLAP: "Two windows on the same day overlap. Merge or move them.",
} as const;

/** Replaces the teacher's weekly availability. Booked classes are not touched. */
export async function saveAvailabilityAction(windows: AvailabilityWindow[]): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("classes:manage");
  if (!actor) return { ok: false, message: "Only teachers can set availability." };
  if (!Array.isArray(windows) || windows.length > 70) {
    return { ok: false, message: "Too many windows." };
  }

  const clean = windows.map((window) => ({
    weekday: Number(window.weekday),
    startMinute: Number(window.startMinute),
    endMinute: Number(window.endMinute),
  }));
  const result = await replaceAvailability(actor.userId, clean);
  if (!result.ok) return { ok: false, message: errorMessages[result.code] };

  await recordAuditEvent({
    action: "availability.updated",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: actor.userId,
    metadata: { windows: clean.length },
  });
  revalidatePath("/teacher/availability");
  revalidatePath("/schedule");
  return { ok: true, message: "Availability saved. Students see the new times right away." };
}

export async function saveTeacherProfileAction(input: TeacherProfileInput): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("classes:manage");
  if (!actor) return { ok: false, message: "Only teachers have a public profile." };
  await saveTeacherProfile(actor.userId, {
    headline: String(input.headline ?? ""),
    bio: String(input.bio ?? ""),
    country: String(input.country ?? ""),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
  });
  revalidatePath("/teacher/availability");
  revalidatePath("/schedule");
  return { ok: true, message: "Profile saved." };
}

/* Teacher applications */

export async function submitApplicationAction(input: ApplicationInput): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { ok: false, message: "Sign in with a student account to apply." };
  const result = await submitApplication(actor, input);
  if (result.ok) revalidatePath("/apply");
  return result;
}

export async function withdrawApplicationAction(): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { ok: false, message: "Sign in to manage your application." };
  const done = await withdrawApplication(actor);
  revalidatePath("/apply");
  return done
    ? { ok: true, message: "Application withdrawn." }
    : { ok: false, message: "There is no open application." };
}

export async function reviewApplicationAction(input: {
  applicationId: string;
  approve: boolean;
  note?: string;
}): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: "Only managers and the admin review applications." };
  const result = await reviewApplication(actor, input);
  revalidatePath("/manager/applications");
  revalidatePath("/admin/organization/applications");
  return result;
}

export async function inviteTeacherApplicantAction(input: { email: string; note?: string }): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: "Only managers and the admin can invite teachers." };
  const result = await inviteTeacherApplicant(actor, input);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
  }
  return result;
}

export async function revokeTeacherInvitationAction(invitationId: string): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("teachers:approve");
  if (!actor) return { ok: false, message: "Only managers and the admin can revoke invitations." };
  const result = await revokeTeacherInvitation(actor, invitationId);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
  }
  return result;
}

export async function promoteTeacherByEmailAction(email: string): Promise<TeachingActionResult> {
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false, message: "Only the admin can promote a user directly to teacher." };
  const result = await promoteUserToTeacherByEmail(actor, email);
  if (result.ok) {
    revalidatePath("/manager/applications");
    revalidatePath("/admin/organization/applications");
    revalidatePath("/schedule");
  }
  return result;
}
