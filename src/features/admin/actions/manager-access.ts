"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActor, getActorWithPermission } from "@/server/auth/session";
import {
  acceptManagerInvitation,
  inviteManager,
  promoteUserToManagerByEmail,
  revokeManagerInvitation,
  revokeManagerRole,
} from "@/server/admin/manager-access";

export async function inviteManagerAction(input: { email: string; note?: string }) {
  const t = await getTranslations("admin");
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false as const, message: t("actions.managers.notAllowed") };
  const result = await inviteManager(actor, input);
  if (result.ok) revalidatePath("/admin/organization/managers");
  return result;
}

export async function promoteManagerByEmailAction(email: string) {
  const t = await getTranslations("admin");
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false as const, message: t("actions.managers.notAllowed") };
  const result = await promoteUserToManagerByEmail(actor, email);
  if (result.ok) revalidatePath("/admin/organization/managers");
  return result;
}

export async function revokeManagerInvitationAction(invitationId: string) {
  const t = await getTranslations("admin");
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false as const, message: t("actions.managers.notAllowed") };
  const result = await revokeManagerInvitation(actor, invitationId);
  if (result.ok) revalidatePath("/admin/organization/managers");
  return result;
}

export async function revokeManagerRoleAction(userId: string) {
  const t = await getTranslations("admin");
  const actor = await getActorWithPermission("roles:manage");
  if (!actor) return { ok: false as const, message: t("actions.managers.notAllowed") };
  const result = await revokeManagerRole(actor, userId);
  if (result.ok) revalidatePath("/admin/organization/managers");
  return result;
}

export async function acceptManagerInvitationAction(input: { token: string; experienceNote: string }) {
  const actor = await getActor();
  const result = await acceptManagerInvitation(actor, input);
  if (result.ok) revalidatePath("/manager");
  return result;
}
