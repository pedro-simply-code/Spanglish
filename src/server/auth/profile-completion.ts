import type { ProfileCompletion } from "@/features/auth";
import type { AuthSession } from "@/lib/auth-types";
import { getUserProfile, userHasPassword } from "@/server/auth/user-repository";

/** Optional profile details for the "Complete your profile" card. */
export async function getProfileCompletion(actor: AuthSession): Promise<ProfileCompletion> {
  const [profile, hasPassword] = await Promise.all([
    getUserProfile(actor.userId),
    userHasPassword(actor.userId),
  ]);

  return {
    hasGoal: Boolean(profile?.goal?.trim()),
    hasPhoto: Boolean(profile?.image),
    twoFactorEnabled: actor.twoFactorEnabled,
    hasPassword,
  };
}
