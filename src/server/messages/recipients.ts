import "server-only";

import { and, asc, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { getPrimaryRole, type RoleCode } from "@/lib/auth-roles";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export type MessageRecipient = {
  email: string;
  name: string;
  role: RoleCode;
  bounced: boolean;
};

export async function searchMessageRecipients(
  viewerUserId: string,
  query: string,
): Promise<MessageRecipient[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const pattern = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;

  const rows = await db
    .select({
      name: users.name,
      email: users.email,
      roles: users.roles,
      emailBouncedAt: users.emailBouncedAt,
    })
    .from(users)
    .where(
      and(
        ne(users.id, viewerUserId),
        or(ilike(users.email, pattern), ilike(users.name, pattern)),
      ),
    )
    .orderBy(users.name)
    .limit(12);

  return rows.map((row) => ({
    email: row.email,
    name: row.name,
    role: getPrimaryRole(row.roles),
    bounced: Boolean(row.emailBouncedAt),
  }));
}

export async function verifyMessageRecipient(
  viewerUserId: string,
  email: string,
): Promise<{ found: boolean; recipient: MessageRecipient | null }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return { found: false, recipient: null };
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
      emailBouncedAt: users.emailBouncedAt,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  const row = rows[0];
  if (!row || row.id === viewerUserId) {
    return { found: false, recipient: null };
  }

  return {
    found: true,
    recipient: {
      email: row.email,
      name: row.name,
      role: getPrimaryRole(row.roles),
      bounced: Boolean(row.emailBouncedAt),
    },
  };
}
/**
 * Who students write to about their classes (e.g. a change outside the
 * window): the academy's first manager, or the admin when there is none.
 */
export async function getAcademySupportContact(): Promise<{ email: string; name: string } | null> {
  for (const role of ["manager", "admin"] as const) {
    const [row] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(and(sql`${role} = any(${users.roles})`, isNull(users.emailBouncedAt)))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (row) return row;
  }
  return null;
}
