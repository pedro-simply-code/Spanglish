import { getRecordingStorageMode } from "@/server/storage/recordings";
import { connection } from "next/server";
import { and, count, desc, eq, gt, gte, isNotNull, ne, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import type {
  AdminAlert,
  AdminStat,
  EmailHealthRow,
  LedgerSnapshot,
  ManagerAccount,
  ManagerDashboardStat,
  PayoutBatch,
  TeacherRateTier,
} from "@/features/admin";
import { env } from "@/env";
import { roleCodes, type RoleCode } from "@/lib/auth-roles";
import { listAuditEvents, type AuditListEntry } from "@/server/audit/audit-log";
import { googleSignInEnabled } from "@/server/auth/auth";
import { stripeEnabled, stripeTestMode, stripeWebhookEnabled } from "@/server/payments/stripe";
import { db } from "@/server/db";
import { auditLogs, sessions, users } from "@/server/db/schema";
import type { Integration, IntegrationStatus, PersonAccount } from "@/features/management";
import {
  economicsToAdminStats,
  economicsToLedgerSnapshots,
  economicsToManagerStats,
  economicsToPayoutBatches,
  getAcademyEconomicsSnapshot,
} from "@/server/admin/class-economics";
import type { AdminTranslator } from "@/server/admin/translator";
import {
  countPricingPackages,
  listCommercePackagesFromDb,
  listPricingPackageRows,
  rowToAdminPackageDetail,
  rowToCommercePackage,
} from "@/server/pricing/packages";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  roles: RoleCode[];
  status: "Active" | "Invited" | "Suspended";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
};

function formatInt(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function integrationStatus(ready: boolean, partial: boolean): IntegrationStatus {
  if (ready) return "connected";
  if (partial) return "action-needed";
  return "not-configured";
}

export async function buildIntegrationStatuses(): Promise<Integration[]> {
  const t = await getTranslations("admin");
  const liveKitReady = Boolean(
    env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET,
  );
  const liveKitPartial = Boolean(
    env.LIVEKIT_URL || env.LIVEKIT_API_KEY || env.LIVEKIT_API_SECRET,
  );

  const emailReady =
    Boolean(env.EMAIL_FROM) &&
    (env.EMAIL_PROVIDER === "postmark"
      ? Boolean(env.POSTMARK_SERVER_TOKEN)
      : Boolean(env.SMTP_USER && env.SMTP_PASS));
  const emailPartial = Boolean(env.EMAIL_FROM || env.SMTP_USER || env.POSTMARK_SERVER_TOKEN);

  const b2Ready =
    getRecordingStorageMode() === "cloud" &&
    Boolean(env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET_NAME && env.B2_S3_ENDPOINT);
  const b2Partial = Boolean(env.B2_KEY_ID || env.B2_BUCKET_NAME);

  const v = (name: string, value: unknown, optional = false) => ({ name, set: Boolean(value), optional });

  return [
    {
      id: "integration-meet",
      name: "LiveKit",
      description: t("integration.description.meet", { provider: env.MEETING_PROVIDER }),
      status: integrationStatus(liveKitReady, liveKitPartial),
      owner: t("integration.owner.platform"),
      variables: [
        v("LIVEKIT_URL", env.LIVEKIT_URL),
        v("LIVEKIT_API_KEY", env.LIVEKIT_API_KEY),
        v("LIVEKIT_API_SECRET", env.LIVEKIT_API_SECRET),
      ],
      docsUrl: "https://docs.livekit.io/home/get-started/intro-to-livekit/",
    },
    {
      id: "integration-email",
      name: env.EMAIL_PROVIDER === "postmark" ? "Postmark" : "Gmail SMTP",
      description: t("integration.description.email"),
      status: integrationStatus(emailReady, emailPartial),
      owner: t("integration.owner.platform"),
      variables:
        env.EMAIL_PROVIDER === "postmark"
          ? [v("EMAIL_FROM", env.EMAIL_FROM), v("POSTMARK_SERVER_TOKEN", env.POSTMARK_SERVER_TOKEN)]
          : [v("EMAIL_FROM", env.EMAIL_FROM), v("SMTP_USER", env.SMTP_USER), v("SMTP_PASS", env.SMTP_PASS)],
      docsUrl:
        env.EMAIL_PROVIDER === "postmark"
          ? "https://postmarkapp.com/developer"
          : "https://support.google.com/accounts/answer/185833",
    },
    {
      id: "integration-google",
      name: t("integration.name.googleSignIn"),
      description: t("integration.description.google"),
      status: googleSignInEnabled ? "connected" : "not-configured",
      owner: t("integration.owner.platform"),
      variables: [
        v("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID),
        v("GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET),
        v("GOOGLE_ANDROID_CLIENT_ID", env.GOOGLE_ANDROID_CLIENT_ID, true),
      ],
      docsUrl: "https://console.cloud.google.com/apis/credentials",
    },
    {
      id: "integration-storage",
      name: getRecordingStorageMode() === "cloud" ? "Backblaze B2" : t("integration.name.localRecordings"),
      description:
        getRecordingStorageMode() === "cloud"
          ? t("integration.description.storageCloud")
          : t("integration.description.storageLocal"),
      status:
        getRecordingStorageMode() === "local"
          ? "connected"
          : integrationStatus(b2Ready, b2Partial),
      owner: t("integration.owner.platform"),
      variables:
        getRecordingStorageMode() === "cloud"
          ? [
              v("B2_KEY_ID", env.B2_KEY_ID),
              v("B2_APPLICATION_KEY", env.B2_APPLICATION_KEY),
              v("B2_BUCKET_NAME", env.B2_BUCKET_NAME),
              v("B2_S3_ENDPOINT", env.B2_S3_ENDPOINT),
            ]
          : [v("RECORDING_STORAGE=cloud", false, true)],
      docsUrl: "https://www.backblaze.com/docs/cloud-storage-s3-compatible-api",
    },
    {
      id: "integration-billing",
      name: stripeTestMode ? t("integration.name.stripeTest") : "Stripe",
      description: t("integration.description.billing"),
      status: stripeWebhookEnabled ? "connected" : stripeEnabled || env.STRIPE_SECRET_KEY ? "action-needed" : "not-configured",
      owner: t("integration.owner.finance"),
      variables: [
        v("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
        v("STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET),
        v("STRIPE_CONNECT_COUNTRY", env.STRIPE_CONNECT_COUNTRY, true),
      ],
      docsUrl: "https://dashboard.stripe.com/test/apikeys",
    },
  ];
}

export async function listCommercePackagesPaginated(options: {
  offset: number;
  limit: number;
  activeOnly?: boolean;
}) {
  const rows = await listPricingPackageRows({
    offset: options.offset,
    limit: options.limit,
    activeOnly: options.activeOnly,
  });
  return rows.map(rowToCommercePackage);
}

export async function listAdminPackageDetailsPaginated(options: {
  offset: number;
  limit: number;
  classType?: "one-on-one" | "paired";
}) {
  const rows = await listPricingPackageRows({
    offset: options.offset,
    limit: options.limit,
    classType: options.classType,
  });
  return rows.map(rowToAdminPackageDetail);
}

export async function countCommercePackages(
  activeOnly?: boolean,
  classType?: "one-on-one" | "paired",
) {
  return countPricingPackages({ activeOnly, classType });
}

/** All packages for admin publish view (unpaginated). */
export async function listAllCommercePackages() {
  return listCommercePackagesFromDb();
}

export async function countUsersByRole(): Promise<Record<RoleCode, number>> {
  const counts = Object.fromEntries(roleCodes.map((role) => [role, 0])) as Record<
    RoleCode,
    number
  >;

  for (const role of roleCodes) {
    const [row] = await db
      .select({ value: count() })
      .from(users)
      .where(sql`${role} = ANY(${users.roles})`);
    counts[role] = row?.value ?? 0;
  }

  return counts;
}

export function toPersonAccounts(rows: AdminUserRow[]): PersonAccount[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles,
    status: row.status,
    twoFactorEnabled: row.twoFactorEnabled,
    createdAt: row.createdAt,
  }));
}

export type AdminUserListFilter = {
  role?: RoleCode;
  /** Case-insensitive match on name or email. */
  search?: string;
};

function sanitizeUserSearch(input: string) {
  return input.trim().replace(/[%_\\]/g, "").slice(0, 80);
}

function userListWhere(filter: AdminUserListFilter) {
  const clauses = [];
  if (filter.role) {
    clauses.push(sql`${filter.role} = ANY(${users.roles})`);
  }
  const search = filter.search ? sanitizeUserSearch(filter.search) : "";
  if (search) {
    const pattern = `%${search}%`;
    clauses.push(sql`(${users.name} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern})`);
  }
  return clauses.length ? and(...clauses) : undefined;
}

export async function countAllUsers() {
  const [row] = await db.select({ value: count() }).from(users);
  return row?.value ?? 0;
}

export async function countUsersForAdmin(filter: AdminUserListFilter = {}) {
  const where = userListWhere(filter);
  const base = db.select({ value: count() }).from(users);
  const [row] = where ? await base.where(where) : await base;
  return row?.value ?? 0;
}

export async function listUsersForAdmin(options: {
  offset: number;
  limit: number;
  role?: RoleCode;
  search?: string;
}): Promise<AdminUserRow[]> {
  const where = userListWhere({ role: options.role, search: options.search });
  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      emailBouncedAt: users.emailBouncedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .offset(options.offset)
    .limit(options.limit);
  const rows = where ? await base.where(where) : await base;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles,
    emailVerified: row.emailVerified,
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    createdAt: row.createdAt.toISOString(),
    status: row.emailBouncedAt
      ? "Suspended"
      : row.emailVerified
        ? "Active"
        : "Invited",
  }));
}

export async function listManagers(): Promise<ManagerAccount[]> {
  const locale = await getLocale();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailBouncedAt: users.emailBouncedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`'manager' = ANY(${users.roles})`)
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.emailBouncedAt ? "Suspended" : "Active",
    since: row.createdAt.toLocaleDateString(locale, { month: "short", year: "numeric" }),
  }));
}

export async function buildTeacherRateTiers(): Promise<TeacherRateTier[]> {
  const t = await getTranslations("admin");
  const groups = await countTeachersByLevel(t);
  return groups.map((group, index) => ({
    id: `level-${index}`,
    label: group.level,
    multiplier: 1,
    description: t("teacherRates.description"),
    teachers: group.teachers,
  }));
}

const teacherLevelKeys: Record<string, string> = {
  beginner: "teacherRates.level.beginner",
  intermediate: "teacherRates.level.intermediate",
  advanced: "teacherRates.level.advanced",
};

async function countTeachersByLevel(t: AdminTranslator): Promise<{ level: string; teachers: number }[]> {
  const rows = await db
    .select({
      level: users.level,
      value: count(),
    })
    .from(users)
    .where(sql`'teacher' = ANY(${users.roles})`)
    .groupBy(users.level);

  return rows.map((row) => {
    const levelKey = row.level ? teacherLevelKeys[row.level] : undefined;
    return {
      level: levelKey ? t(levelKey) : row.level ?? t("teacherRates.level.notSet"),
      teachers: row.value,
    };
  });
}

async function countTable(table: typeof users | typeof sessions) {
  const [row] = await db.select({ value: count() }).from(table);
  return row?.value ?? 0;
}

export async function getLedgerSnapshots(): Promise<LedgerSnapshot[]> {
  const [snapshot, t, locale] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    getTranslations("admin"),
    getLocale(),
  ]);
  return economicsToLedgerSnapshots(snapshot, t, locale);
}

export async function getOperationsStats(): Promise<AdminStat[]> {
  const [snapshot, t, locale] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    getTranslations("admin"),
    getLocale(),
  ]);
  return economicsToAdminStats(snapshot, t, locale);
}

export async function getManagerDashboardStats(): Promise<ManagerDashboardStat[]> {
  const [snapshot, roles, t, locale] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    countUsersByRole(),
    getTranslations("admin"),
    getLocale(),
  ]);
  return economicsToManagerStats(snapshot, roles.student, roles.teacher, t, locale);
}

export async function getAcademyEconomicsForDashboard() {
  return getAcademyEconomicsSnapshot();
}

export async function getEstimatedPayoutBatches(): Promise<PayoutBatch[]> {
  const [snapshot, t, locale] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    getTranslations("admin"),
    getLocale(),
  ]);
  return economicsToPayoutBatches(snapshot, t, locale);
}

export async function getEmailHealthRows(): Promise<EmailHealthRow[]> {
  await connection(); // live data, read the clock at request time
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, verified, bounced, recentSignIns] = await Promise.all([
    countTable(users),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.emailVerified, true))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(users)
      .where(isNotNull(users.emailBouncedAt))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, "auth.sign_in"), gte(auditLogs.createdAt, weekAgo)),
      )
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  const emailConfigured =
    Boolean(env.EMAIL_FROM) &&
    (env.EMAIL_PROVIDER === "postmark"
      ? Boolean(env.POSTMARK_SERVER_TOKEN)
      : Boolean(env.SMTP_USER && env.SMTP_PASS));

  const webhookOk =
    env.EMAIL_PROVIDER !== "postmark" || Boolean(env.POSTMARK_WEBHOOK_SECRET);

  return [
    {
      id: "accounts",
      metric: t("emailHealth.metric.accounts"),
      value: formatInt(totalUsers, locale),
      status: "ok",
    },
    {
      id: "verified",
      metric: t("emailHealth.metric.verified"),
      value: t("emailHealth.value.verified", {
        count: formatInt(verified, locale),
        percent: totalUsers ? Math.round((verified / totalUsers) * 100) : 0,
      }),
      status: verified === totalUsers ? "ok" : "watch",
    },
    {
      id: "bounced",
      metric: t("emailHealth.metric.bounced"),
      value: formatInt(bounced, locale),
      status: bounced === 0 ? "ok" : "action",
    },
    {
      id: "signins",
      metric: t("emailHealth.metric.signIns"),
      value: formatInt(recentSignIns, locale),
      status: "ok",
    },
    {
      id: "delivery",
      metric: t("emailHealth.metric.delivery"),
      value: emailConfigured ? t("common.yes") : t("common.no"),
      status: emailConfigured ? "ok" : "action",
    },
    {
      id: "webhook",
      metric: t("emailHealth.metric.webhook"),
      value: webhookOk ? t("emailHealth.value.configured") : t("emailHealth.value.missingSecret"),
      status: webhookOk ? "ok" : env.EMAIL_PROVIDER === "postmark" ? "action" : "watch",
    },
  ];
}

export async function getExecutiveStats(): Promise<AdminStat[]> {
  const [t, locale, integrations] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    buildIntegrationStatuses(),
  ]);
  const connected = integrations.filter((item) => item.status === "connected").length;

  await connection(); // live data, read the clock at request time
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeSessions, securityAlerts] = await Promise.all([
    countTable(users),
    db
      .select({ value: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, weekAgo),
          ne(auditLogs.severity, "info"),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  return [
    {
      id: "accounts",
      label: t("executiveStat.accounts.label"),
      value: formatInt(totalUsers, locale),
      helper: t("executiveStat.accounts.helper"),
      href: "/admin/organization/users",
    },
    {
      id: "sessions",
      label: t("executiveStat.sessions.label"),
      value: formatInt(activeSessions, locale),
      helper: t("executiveStat.sessions.helper"),
      href: "/admin/organization/users",
    },
    {
      id: "security",
      label: t("executiveStat.security.label"),
      value: formatInt(securityAlerts, locale),
      helper: t("executiveStat.security.helper"),
      href: "/admin/audit",
    },
    {
      id: "integrations",
      label: t("executiveStat.integrations.label"),
      value: `${connected} / ${integrations.length}`,
      helper: t("executiveStat.integrations.helper"),
      href: "/admin/platform/integrations",
    },
  ];
}

export async function getPlatformHealthAlerts(): Promise<AdminAlert[]> {
  const t = await getTranslations("admin");
  const alerts: AdminAlert[] = [];

  const integrations = await buildIntegrationStatuses();
  for (const item of integrations.filter((row) => row.status !== "connected")) {
    alerts.push({
      id: `integration-${item.id}`,
      title: t("alert.integrationNotReady", { name: item.name }),
      detail: item.description,
      severity: item.status === "not-configured" ? "warning" : "info",
      href: "/admin/platform/integrations",
    });
  }

  const managersWithout2Fa = await db
    .select({ value: count() })
    .from(users)
    .where(
      and(
        sql`'manager' = ANY(${users.roles})`,
        sql`COALESCE(${users.twoFactorEnabled}, false) = false`,
      ),
    )
    .then((rows) => rows[0]?.value ?? 0);

  if (managersWithout2Fa > 0) {
    alerts.push({
      id: "manager-2fa",
      title: t("alert.managerWithout2Fa", { count: managersWithout2Fa }),
      detail: t("alert.managerWithout2FaDetail"),
      severity: "warning",
      href: "/admin/platform/security",
    });
  }

  const bounced = await db
    .select({ value: count() })
    .from(users)
    .where(isNotNull(users.emailBouncedAt))
    .then((rows) => rows[0]?.value ?? 0);

  if (bounced > 0) {
    alerts.push({
      id: "email-bounce",
      title: t("alert.emailBounce", { count: bounced }),
      detail: t("alert.emailBounceDetail"),
      severity: "warning",
      href: "/admin/platform/email",
    });
  }

  if (!env.EMAIL_FROM) {
    alerts.push({
      id: "email-from",
      title: t("alert.emailFromMissing"),
      detail: t("alert.emailFromMissingDetail"),
      severity: "critical",
      href: "/admin/platform/email",
    });
  }

  if (env.NODE_ENV === "production" && env.CLASS_RELAX_JOIN_WINDOW) {
    alerts.push({
      id: "join-window",
      title: t("alert.joinWindowOn"),
      detail: t("alert.joinWindowOnDetail"),
      severity: "critical",
      href: "/admin/platform/rooms",
    });
  }

  return alerts.slice(0, 8);
}

export async function getRecentAuditForDashboard(limit = 6): Promise<AuditListEntry[]> {
  return listAuditEvents({ limit });
}

export async function formatAuditActivity(entry: AuditListEntry) {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const when = new Date(entry.createdAt);
  const at = when.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const actor = entry.actorName || entry.actorEmail || t("audit.unknownAccount");
  return {
    id: entry.id,
    actor,
    action: entry.action,
    at,
    severity: entry.severity,
  };
}
