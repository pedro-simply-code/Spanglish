"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { bookClassForActor, bookTrialClassForActor, studentTrialLessonAvailable } from "@/features/classes";
import { getActorWithPermission } from "@/server/auth/session";
import { listFreeSlots } from "@/server/classes/availability";
import { getActivePairForUser } from "@/server/classes/pairs";
import { purchasePackage } from "@/server/credits/orders";
import type { ClassType } from "@/server/db/schema";

export type BookClassResult = {
  ok: boolean;
  title: string;
  message: string;
  code?: string;
  classId?: string;
};

type KindInput = { classType: ClassType; durationMinutes: number };

function validKind(input: KindInput) {
  return (
    (input.classType === "one-on-one" || input.classType === "paired") &&
    (input.durationMinutes === 25 || input.durationMinutes === 50)
  );
}

/** Free slots with a teacher for the student (and partner, for paired). */
export async function listBookingSlotsAction(input: KindInput & { teacherId: string }): Promise<string[]> {
  const actor = await getActorWithPermission("classes:book");
  if (!actor || !validKind(input)) return [];

  const studentIds = [actor.userId];
  if (input.classType === "paired") {
    const pair = await getActivePairForUser(actor.userId);
    if (!pair) return [];
    studentIds.push(pair.partnerId);
  }

  return listFreeSlots({
    teacherId: input.teacherId,
    durationMinutes: input.durationMinutes,
    studentIds,
  });
}

export async function getTrialLessonAvailabilityAction(): Promise<{ eligible: boolean }> {
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { eligible: false };
  const eligible = await studentTrialLessonAvailable(actor.userId);
  return { eligible };
}

export async function bookTrialClassAction(
  input: { teacherId: string; startsAt: string; durationMinutes: 25 | 50; topic: string },
): Promise<BookClassResult> {
  const [actor, t] = await Promise.all([
    getActorWithPermission("classes:book"),
    getTranslations("ops.academy"),
  ]);
  if (!actor) {
    return { ok: false, title: t("notAllowedTitle"), message: t("notAllowedTrial") };
  }
  const result = await bookTrialClassForActor(actor, input);
  if (!result.ok) {
    return { ok: false, title: result.title, message: result.message, code: result.code };
  }
  revalidatePath("/classes");
  revalidatePath("/home");
  revalidatePath("/schedule");
  return { ok: true, title: result.title, message: result.message, classId: result.liveClass.id };
}

export async function bookClassAction(
  input: KindInput & { teacherId: string; startsAt: string; topic: string },
): Promise<BookClassResult> {
  const [actor, t] = await Promise.all([
    getActorWithPermission("classes:book"),
    getTranslations("ops.academy"),
  ]);
  if (!actor) {
    return { ok: false, title: t("notAllowedTitle"), message: t("notAllowedClass") };
  }
  if (!validKind(input)) {
    return { ok: false, title: t("chooseClassTypeTitle"), message: t("chooseClassType") };
  }

  const result = await bookClassForActor(actor, {
    teacherId: input.teacherId,
    startsAt: input.startsAt,
    topic: input.topic,
    kind: { classType: input.classType, durationMinutes: input.durationMinutes },
  });

  if (!result.ok) {
    return { ok: false, title: result.title, message: result.message, code: result.code };
  }

  revalidatePath("/classes");
  revalidatePath("/home");
  revalidatePath("/schedule");
  return { ok: true, title: result.title, message: result.message, classId: result.liveClass.id };
}

export type PurchaseActionResult = {
  ok: boolean;
  message: string;
  credits?: number;
  balance?: number;
  shared?: boolean;
  /** Stripe Checkout page to send the browser to. */
  redirectUrl?: string;
};

/** Buys a package: Stripe Checkout when configured, otherwise a demo purchase. */
export async function purchasePackageAction(packageId: string): Promise<PurchaseActionResult> {
  const [actor, t] = await Promise.all([
    getActorWithPermission("classes:book"),
    getTranslations("ops.academy"),
  ]);
  if (!actor) return { ok: false, message: t("notAllowedPackage") };

  let result;
  try {
    result = await purchasePackage(actor, packageId);
  } catch (error) {
    console.error("[checkout]", error);
    return { ok: false, message: t("paymentOpenFailed") };
  }
  if (!result.ok) return { ok: false, message: result.message };
  if ("redirectUrl" in result) return { ok: true, message: t("redirectingToStripe"), redirectUrl: result.redirectUrl };

  revalidatePath("/schedule");
  revalidatePath("/home");
  revalidatePath("/classes");
  return {
    ok: true,
    message: t("creditsAdded", { count: result.credits }),
    credits: result.credits,
    balance: result.balance,
    shared: result.shared,
  };
}
