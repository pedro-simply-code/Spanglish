export {
  authDemo,
  getCodeError,
  getEmailError,
  getNameError,
  getPasswordError,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth-validation";

import { defaultDemoPassword, seedAccounts } from "@/lib/demo-accounts";
import type { RoleCode } from "@/lib/auth-roles";
import { roleDefinitions } from "@/lib/auth-roles";

export type DemoAccount = {
  email: string;
  name: string;
  roles: string;
  note: string;
  password: string;
};

function describeRoles(roles: RoleCode[]) {
  return roles
    .map((role) => roleDefinitions[role].name)
    .join(" + ");
}

/**
 * One pre-verified account per role, listed on the login page. The seed
 * creates more (`src/lib/demo-accounts.ts`), all with the same password.
 */
export const demoAccounts: DemoAccount[] = seedAccounts.filter((account) => account.featured).map((account) => ({
  email: account.email,
  name: account.name,
  roles: describeRoles(account.roles),
  note:
    account.roles.length === 1
      ? "Student dashboard: classes, materials, and progress."
      : `Active dashboard: ${roleDefinitions[account.roles[account.roles.length - 1]!].name}.`,
  password: defaultDemoPassword,
}));