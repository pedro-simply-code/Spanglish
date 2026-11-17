export type { AuthMethod, AuthSession } from "@/lib/auth-types";

export type AuthActionResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
  /** Stable error code (translated by the UI), e.g. "NAME_TOO_SHORT". */
  code?: string;
  /** Field-level error key used by the forms. */
  field?: "email" | "password" | "code" | "name";
};
