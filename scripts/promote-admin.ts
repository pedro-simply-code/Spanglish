/**
 * Makes an existing, verified account the academy's only admin. Every other
 * account loses the admin role.
 *
 * Usage: npm run admin:promote -- you@example.com [--yes]
 * `--yes` is required when another account currently holds the role.
 *
 * With ADMIN_EMAIL set, the admin is that email: this command refuses any
 * other address, because the next sign-in would undo it.
 */
import { eq } from "drizzle-orm";
import { env } from "../src/env";
import { normalizeEmail } from "../src/lib/auth-validation";
import { listAdmins, transferAdminRole } from "../src/server/auth/admin-role";
import { db } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { sendSecurityNotice } from "../src/server/email/send-verification";
import { toEmailLocale } from "../src/server/email/templates";

async function main() {
  const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const confirmed = process.argv.includes("--yes");

  if (!email) {
    console.error("Usage: npm run admin:promote -- you@example.com [--yes]");
    process.exit(1);
  }

  const target = normalizeEmail(email);
  if (env.ADMIN_EMAIL && normalizeEmail(env.ADMIN_EMAIL) !== target) {
    console.error(
      `ADMIN_EMAIL is set to ${env.ADMIN_EMAIL}: that account is the admin. Change ADMIN_EMAIL instead.`,
    );
    process.exit(1);
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.email, target))
    .limit(1);

  if (!user) {
    console.error(`No account for ${target}. Sign up first, then run this again.`);
    process.exit(1);
  }
  if (!user.emailVerified) {
    console.error(`${target} has not verified its email yet. Verify it, then run this again.`);
    process.exit(1);
  }

  const others = (await listAdmins()).filter((admin) => admin.id !== user.id);
  if (others.length && !confirmed) {
    console.error(
      `The admin role will move from ${others.map((admin) => admin.email).join(", ")} to ${target}.`,
    );
    console.error("Re-run with --yes to confirm.");
    process.exit(1);
  }

  const result = await transferAdminRole(user.id, { reason: "admin:promote" });
  if (!result) throw new Error("Account disappeared while promoting it.");

  for (const admin of others) console.log(`Removed admin from ${admin.email}`);
  if (!result.granted) {
    console.log(`${target} was already the admin.`);
    return;
  }

  console.log(`${target} is now the only admin.`);
  await sendSecurityNotice({
    to: user.email,
    type: "admin-granted",
    locale: toEmailLocale(user.locale),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
