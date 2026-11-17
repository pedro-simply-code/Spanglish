import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  creditAccounts,
  creditTransactions,
  studentPairs,
  users,
  type ClassType,
  type CreditReason,
} from "@/server/db/schema";
import { getActivePairForUser } from "@/server/classes/pairs";

/*
 * Class credits. Each credit pays for one class of a given kind (type +
 * duration). One-on-one credits belong to the student; paired credits belong
 * to the pair, so either partner can spend them.
 *
 * Balance changes are single SQL statements (update + ledger row together),
 * so they stay consistent on the Neon HTTP driver, which has no interactive
 * transactions. `credit_accounts.balance >= 0` is a database check.
 */

export type ClassKind = { classType: ClassType; durationMinutes: number };

export const userHolder = (userId: string) => `user:${userId}`;
export const pairHolder = (pairId: string) => `pair:${pairId}`;

export function holderFor(input: { classType: ClassType; userId: string; pairId?: string | null }) {
  if (input.classType === "paired") {
    return input.pairId ? pairHolder(input.pairId) : null;
  }
  return userHolder(input.userId);
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits.");
  }
}

/**
 * Adds (or, with a negative delta, removes) credits and records the movement.
 * Creates the account on first use. Throws InsufficientCreditsError when a
 * removal would make the balance negative.
 */
export async function changeCredits(input: {
  holder: string;
  kind: ClassKind;
  delta: number;
  reason: CreditReason;
  actorUserId?: string | null;
  orderId?: string | null;
  sessionId?: string | null;
  note?: string | null;
  /** USD cents per credit when adding to the pool (updates weighted average). */
  unitValueCents?: number;
}) {
  const unitValueCents = Math.max(0, Math.round(input.unitValueCents ?? 0));
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new Error("Credit changes must be a non-zero whole number.");
  }

  const transactionId = randomUUID();
  const entry = sql`
    INSERT INTO credit_transactions (id, account_id, delta, reason, session_id, order_id, actor_user_id, note)
    SELECT ${transactionId}, account.id, ${input.delta}, ${input.reason}, ${input.sessionId ?? null},
           ${input.orderId ?? null}, ${input.actorUserId ?? null}, ${input.note ?? null}
    FROM account
    RETURNING id`;

  // Removals only touch an existing account with enough balance. (An upsert
  // cannot be used: Postgres checks the CHECK constraint on the proposed
  // insert row before resolving ON CONFLICT.)
  const result =
    input.delta < 0
      ? await db.execute(sql`
          WITH account AS (
            UPDATE credit_accounts
            SET balance = balance + ${input.delta}, updated_at = now()
            WHERE holder = ${input.holder}
              AND class_type = ${input.kind.classType}
              AND duration_minutes = ${input.kind.durationMinutes}
              AND balance + ${input.delta} >= 0
            RETURNING id, balance
          ), entry AS (${entry})
          SELECT account.id AS "accountId", account.balance AS balance FROM account
        `)
      : await db.execute(sql`
          WITH account AS (
            INSERT INTO credit_accounts (
              id, holder, class_type, duration_minutes, balance, avg_credit_value_cents, updated_at
            )
            VALUES (
              ${randomUUID()}, ${input.holder}, ${input.kind.classType}, ${input.kind.durationMinutes},
              ${input.delta}, ${unitValueCents}, now()
            )
            ON CONFLICT (holder, class_type, duration_minutes)
            DO UPDATE SET
              balance = credit_accounts.balance + EXCLUDED.balance,
              avg_credit_value_cents = CASE
                WHEN credit_accounts.balance + EXCLUDED.balance <= 0 THEN 0
                WHEN ${unitValueCents} > 0 THEN ROUND(
                  (
                    credit_accounts.balance::numeric * credit_accounts.avg_credit_value_cents
                    + EXCLUDED.balance::numeric * ${unitValueCents}
                  ) / (credit_accounts.balance + EXCLUDED.balance)
                )::int
                ELSE credit_accounts.avg_credit_value_cents
              END,
              updated_at = now()
            RETURNING id, balance
          ), entry AS (${entry})
          SELECT account.id AS "accountId", account.balance AS balance FROM account
        `);

  const row = rowsOf<{ accountId: string; balance: number }>(result)[0];
  if (!row) throw new InsufficientCreditsError();
  return { accountId: row.accountId, balance: Number(row.balance) };
}

export type CreditBalance = ClassKind & {
  accountId: string;
  holder: string;
  shared: boolean;
  balance: number;
};

/** A student's spendable credits: their own plus their pair's. */
export async function listBalancesForStudent(userId: string): Promise<CreditBalance[]> {
  const pair = await getActivePairForUser(userId);
  const holders = [userHolder(userId), ...(pair ? [pairHolder(pair.id)] : [])];

  const rows = await db
    .select()
    .from(creditAccounts)
    .where(inArray(creditAccounts.holder, holders));

  return rows
    .map((row) => ({
      accountId: row.id,
      holder: row.holder,
      shared: row.holder.startsWith("pair:"),
      classType: row.classType,
      durationMinutes: row.durationMinutes,
      balance: row.balance,
    }))
    .sort(
      (a, b) =>
        a.classType.localeCompare(b.classType) || a.durationMinutes - b.durationMinutes,
    );
}

export async function getBalance(holder: string, kind: ClassKind) {
  const [row] = await db
    .select({ balance: creditAccounts.balance })
    .from(creditAccounts)
    .where(
      and(
        eq(creditAccounts.holder, holder),
        eq(creditAccounts.classType, kind.classType),
        eq(creditAccounts.durationMinutes, kind.durationMinutes),
      ),
    )
    .limit(1);
  return row?.balance ?? 0;
}

export type CreditHistoryEntry = {
  id: string;
  delta: number;
  reason: CreditReason;
  classType: ClassType;
  durationMinutes: number;
  shared: boolean;
  note: string | null;
  sessionId: string | null;
  createdAt: string;
};

export async function listCreditHistoryForStudent(userId: string, limit = 50) {
  const balances = await listBalancesForStudent(userId);
  if (!balances.length) return [];
  const accounts = new Map(balances.map((item) => [item.accountId, item]));

  const rows = await db
    .select()
    .from(creditTransactions)
    .where(inArray(creditTransactions.accountId, [...accounts.keys()]))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);

  return rows.map((row): CreditHistoryEntry => {
    const account = accounts.get(row.accountId)!;
    return {
      id: row.id,
      delta: row.delta,
      reason: row.reason,
      classType: account.classType,
      durationMinutes: account.durationMinutes,
      shared: account.shared,
      note: row.note,
      sessionId: row.sessionId,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

/* Driver helpers: neon-http returns { rows }, node-postgres too. */

export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown[] } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function errorChain(error: unknown) {
  const chain: Record<string, unknown>[] = [];
  let current: unknown = error;
  while (current && typeof current === "object" && chain.length < 5) {
    chain.push(current as Record<string, unknown>);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

export function isCheckViolation(error: unknown, constraint: string) {
  return errorChain(error).some(
    (item) =>
      item.code === "23514" &&
      (item.constraint === constraint || String(item.message ?? "").includes(constraint)),
  );
}

export function isExclusionViolation(error: unknown, constraint?: string) {
  return errorChain(error).some(
    (item) =>
      item.code === "23P01" &&
      (!constraint ||
        item.constraint === constraint ||
        String(item.message ?? "").includes(constraint)),
  );
}

export type StudentCreditRow = {
  id: string;
  name: string;
  email: string;
  partnerName: string | null;
  balances: { classType: ClassType; durationMinutes: number; balance: number; shared: boolean }[];
};

/** Every student with their own and shared balances (staff screens). */
export async function listStudentsWithBalances(): Promise<StudentCreditRow[]> {
  const [students, pairs, accounts] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`'student' = ANY(${users.roles})`)
      .orderBy(users.name),
    db.select().from(studentPairs).where(eq(studentPairs.active, true)),
    db.select().from(creditAccounts),
  ]);

  const nameById = new Map(students.map((student) => [student.id, student.name]));
  const pairByUser = new Map<string, { pairId: string; partnerId: string }>();
  for (const pair of pairs) {
    pairByUser.set(pair.studentAId, { pairId: pair.id, partnerId: pair.studentBId });
    pairByUser.set(pair.studentBId, { pairId: pair.id, partnerId: pair.studentAId });
  }

  return students.map((student) => {
    const pair = pairByUser.get(student.id);
    const holders = new Set([userHolder(student.id), ...(pair ? [pairHolder(pair.pairId)] : [])]);
    return {
      ...student,
      partnerName: pair ? (nameById.get(pair.partnerId) ?? null) : null,
      balances: accounts
        .filter((account) => holders.has(account.holder))
        .map((account) => ({
          classType: account.classType,
          durationMinutes: account.durationMinutes,
          balance: account.balance,
          shared: account.holder.startsWith("pair:"),
        })),
    };
  });
}
