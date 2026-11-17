import type { RoleCode } from "@/lib/auth-roles";

/** Ways to sign in or sign up. */
export type AuthMethod = "password" | "email-code" | "google";

export type AuthSession = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  roles: RoleCode[];
  activeRole: RoleCode;
  /** UI and email language from the profile. */
  locale: "en" | "es";
  /** Onboarding finished (name, language, time zone, learning goal, terms). */
  profileComplete: boolean;
  twoFactorEnabled: boolean;
  issuedAt: string;
  expiresAt: string;
};
