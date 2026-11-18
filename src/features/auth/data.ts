export {
  authDemo,
  getCodeError,
  getEmailError,
  getNameError,
  getPasswordError,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth-validation";

import { getMessages } from "@/i18n/messages";
import { defaultDemoPassword, seedAccounts } from "@/lib/demo-accounts";
import type { RoleCode } from "@/lib/auth-roles";

/** Minimal translator shape for strings produced outside React components. */
export type DemoTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export type DemoAccount = {
  email: string;
  name: string;
  roles: string;
  note: string;
  password: string;
};

function describeRoles(roles: RoleCode[], t: DemoTranslator) {
  return roles
    .map((role) => t(`roles.${role}`))
    .join(" + ");
}

/**
 * One pre-verified account per role, listed on the login page. The seed
 * creates more (`src/lib/demo-accounts.ts`), all with the same password.
 */
export function getDemoAccounts(t: DemoTranslator): DemoAccount[] {
  return seedAccounts.filter((account) => account.featured).map((account) => ({
    email: account.email,
    name: account.name,
    roles: describeRoles(account.roles, t),
    note:
      account.roles.length === 1
        ? t("demo.noteStudent")
        : t("demo.noteRole", {
            role: t(`roles.${account.roles[account.roles.length - 1]!}`),
          }),
    password: defaultDemoPassword,
  }));
}

function readMessage(source: unknown, path: string): string | undefined {
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(message: string, values?: Record<string, string | number>) {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values?.[key];
    return value === undefined ? match : String(value);
  });
}

const englishMessages = getMessages("en");

const englishTranslator: DemoTranslator = (key, values) =>
  interpolate(readMessage(englishMessages, `shell.${key}`) ?? key, values);

/**
 * Legacy export kept for existing call sites. Use `getDemoAccounts(t)` with the
 * active locale translator so demo copy follows the selected language.
 */
export const demoAccounts: DemoAccount[] = getDemoAccounts(englishTranslator);
