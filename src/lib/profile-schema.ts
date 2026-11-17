import { z } from "zod";

/*
 * Profile validation shared by onboarding, Settings, and the /api/v1
 * endpoints (Android app). Error messages are codes; the UI translates them.
 */

export const profileLocales = ["en", "es"] as const;
export const learningLanguages = ["spanish", "english"] as const;
export const learningLevels = ["beginner", "intermediate", "advanced"] as const;

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const name = z
  .string()
  .trim()
  .min(2, { message: "NAME_TOO_SHORT" })
  .max(80, { message: "NAME_TOO_LONG" });

const timezone = z
  .string()
  .trim()
  .min(1, { message: "TIMEZONE_REQUIRED" })
  .refine(isValidTimeZone, { message: "TIMEZONE_INVALID" });

export const profileFields = {
  name,
  locale: z.enum(profileLocales, { message: "LOCALE_INVALID" }),
  timezone,
  learningLanguage: z.enum(learningLanguages, { message: "LEARNING_LANGUAGE_INVALID" }),
  level: z.enum(learningLevels, { message: "LEVEL_INVALID" }),
  goal: z.string().trim().max(500, { message: "GOAL_TOO_LONG" }),
};

/** First-login profile. Terms must be accepted. */
export const onboardingSchema = z.object({
  ...profileFields,
  goal: profileFields.goal.optional().default(""),
  acceptTerms: z.literal(true, { message: "TERMS_REQUIRED" }),
});

/** Later edits from Settings or the app: any subset of fields. */
export const profileUpdateSchema = z
  .object(profileFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "NOTHING_TO_UPDATE" });

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** First validation error as a code, e.g. "NAME_TOO_SHORT". */
export function firstIssueCode(error: z.ZodError) {
  return error.issues[0]?.message ?? "INVALID_INPUT";
}
