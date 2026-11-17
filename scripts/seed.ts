/**
 * Demo users for testing: 10 students (two pairs), teachers, managers;
 * pricing packages and sample live classes (upcoming, in progress, completed).
 * 5 teachers and 2 managers, all with the same password. There is no demo
 * admin: the admin comes from ADMIN_EMAIL or `npm run admin:promote`.
 * Refuses to run with NODE_ENV=production.
 *
 * Usage: npm run db:seed
 */
import { seedPhase3Demo } from "@/server/teaching/seed-phase3";
import { classTimeZone } from "../src/features/classes/data";
import { eq } from "drizzle-orm";
import {
  defaultDemoPassword,
  retiredDemoAdminEmail,
  seedAccounts,
  seedPairs,
} from "../src/lib/demo-accounts";
import { env } from "../src/env";
import { listAdmins } from "../src/server/auth/admin-role";
import { upsertSeedUser } from "../src/server/auth/user-repository";
import { db } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { seedDemoLiveClasses } from "../src/server/classes/seed-demo-classes";
import { seedPricingPackagesFromDefaults } from "../src/server/pricing/packages";

async function main() {
  if (env.NODE_ENV === "production") {
    console.error(
      "Refusing to seed with NODE_ENV=production: demo accounts share a public password.",
    );
    process.exit(1);
  }

  // Earlier seeds created a demo admin; remove it (sessions and accounts
  // cascade, audit entries keep their history without the user).
  const removed = await db
    .delete(users)
    .where(eq(users.email, retiredDemoAdminEmail))
    .returning({ id: users.id });
  if (removed.length) console.log(`Removed the old demo admin ${retiredDemoAdminEmail}`);

  for (const account of seedAccounts) {
    const row = await upsertSeedUser({
      email: account.email,
      name: account.name,
      password: defaultDemoPassword,
      roles: account.roles,
      timezone: classTimeZone,
      locale: account.locale,
      learningLanguage: account.learningLanguage,
      level: account.level,
      goal: account.goal ?? null,
    });

    if (!row) {
      throw new Error(`Failed to seed ${account.email}`);
    }

    console.log(`Seeded ${account.email} (${account.roles.join(", ")})`);
  }

  for (const [first, second] of seedPairs) {
    console.log(`Pair: ${first} + ${second} (stored once paired classes land)`);
  }

  await seedPricingPackagesFromDefaults();
  console.log("Synced pricing_packages from the academy catalog.");

  await seedDemoLiveClasses();
  await seedPhase3Demo();

  console.log(`Demo password for all accounts: ${defaultDemoPassword}`);

  if (!(await listAdmins()).length) {
    console.log(
      env.ADMIN_EMAIL
        ? `No admin yet: sign up or sign in with ${env.ADMIN_EMAIL} (verified email) to become the admin.`
        : "No admin yet: set ADMIN_EMAIL, or run npm run admin:promote -- you@example.com",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });