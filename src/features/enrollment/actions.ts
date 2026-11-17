"use server";

import { revalidatePath } from "next/cache";
import { getActorWithPermission } from "@/server/auth/session";
import { createPair, endPair } from "@/server/classes/pairs";
import { grantCredits } from "@/server/credits/orders";
import type { ClassType } from "@/server/db/schema";

export type EnrollmentActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/manager/students");
  revalidatePath("/admin/organization/students");
}

export async function createPairAction(input: {
  studentAEmail: string;
  studentBEmail: string;
}): Promise<EnrollmentActionResult> {
  const actor = await getActorWithPermission("billing:manage");
  if (!actor) return { ok: false, message: "Only managers and the admin can pair students." };
  const result = await createPair({ ...input, actorUserId: actor.userId });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true, message: "Students paired. They can now buy and book paired classes." };
}

export async function endPairAction(pairId: string): Promise<EnrollmentActionResult> {
  const actor = await getActorWithPermission("billing:manage");
  if (!actor) return { ok: false, message: "Only managers and the admin can end pairs." };
  const ended = await endPair(pairId, actor.userId);
  refresh();
  return ended
    ? { ok: true, message: "Pair ended. Their shared credits stay with the old pair until moved by hand." }
    : { ok: false, message: "That pair was already ended." };
}

export async function grantCreditsAction(input: {
  studentEmail: string;
  classType: ClassType;
  durationMinutes: number;
  amount: number;
  note: string;
}): Promise<EnrollmentActionResult> {
  const actor = await getActorWithPermission("billing:manage");
  if (!actor) return { ok: false, message: "Only managers and the admin can change credits." };
  if (
    (input.classType !== "one-on-one" && input.classType !== "paired") ||
    (input.durationMinutes !== 25 && input.durationMinutes !== 50)
  ) {
    return { ok: false, message: "Pick a class type and length." };
  }
  const result = await grantCredits({
    actor,
    studentEmail: input.studentEmail,
    kind: { classType: input.classType, durationMinutes: input.durationMinutes },
    amount: Number(input.amount),
    note: input.note,
  });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true, message: `Done. New balance: ${result.balance}.` };
}
