import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

/** Cached admin user id for automated platform notifications (academy / class notices). */
let cachedAdminId: string | null | undefined;

export async function getAcademySystemSenderUserId(): Promise<string | null> {
  if (cachedAdminId !== undefined) return cachedAdminId;
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`'admin' = ANY(${users.roles})`)
    .limit(1);
  cachedAdminId = row[0]?.id ?? null;
  return cachedAdminId;
}