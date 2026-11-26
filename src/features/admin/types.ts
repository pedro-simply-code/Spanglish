export type AdminStat = {
  id: string;
  label: string;
  value: string;
  helper: string;
  href?: string;
};

export type AdminAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href?: string;
};

export type CommercePackageRow = {
  id: string;
  name: string;
  classType: "Individual" | "Paired";
  duration: "25 min" | "50 min";
  credits: number;
  priceUsd: number;
  active: boolean;
  publishedAt: string | null;
};

/** Full row for admin create/edit dialogs. */
export type AdminPackageDetail = CommercePackageRow & {
  classTypeCode: "one-on-one" | "paired";
  durationMinutes: 25 | 50;
  label: string;
  description: string;
  pricePerClassUsd: number;
  totalUsd: number;
  savingsPercent: number;
  sortOrder: number;
};

export type TeacherRateTier = {
  id: string;
  label: string;
  multiplier: number;
  description: string;
  teachers: number;
};

export type PayoutBatch = {
  id: string;
  period: string;
  manager: string;
  totalUsd: string;
  teachers: number;
  status: "draft" | "awaiting-approval" | "paid";
};

export type PaymentProvider = {
  id: string;
  name: string;
  role: string;
  status: "connected" | "setup-needed" | "not-configured" | "disabled";
  note: string;
  enabled: boolean;
  envReady: boolean;
  canToggle: boolean;
  revenueLabel: string;
};

export type LedgerSnapshot = {
  id: string;
  label: string;
  value: string;
  trend: string;
};

export type ManagerAccount = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Suspended";
  since: string;
};

export type EmailHealthRow = {
  id: string;
  metric: string;
  value: string;
  status: "ok" | "watch" | "action";
};

export type DashboardAuditRow = {
  id: string;
  actor: string;
  action: string;
  at: string;
  severity: "info" | "warning" | "critical";
};

export type TeacherEarningsRow = {
  teacherName: string;
  classesTaught: number;
  grossUsd: number;
  payoutUsd: number;
};

export type AcademyEconomicsSnapshot = {
  nowIso: string;
  totalBookings: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  canceled: number;
  classesTaught: number;
  classesThisWeek: number;
  attendedCompleted: number;
  attendanceRatePct: number;
  creditsBooked: number;
  creditsDelivered: number;
  grossDeliveredUsd: number;
  teacherPayoutUsd: number;
  academyMarginUsd: number;
  pipelineRevenueUsd: number;
  oneOnOneSharePct: number;
  pairedSharePct: number;
  teachers: TeacherEarningsRow[];
};

export type ManagerDashboardStat = {
  id: string;
  label: string;
  value: string;
  helper: string;
};

export type AdminDaySeries = {
  categories: string[];
  values: number[];
};

export type AdminDashboardCharts = {
  classStatus: { label: string; value: number }[];
  classesByDay: AdminDaySeries;
  classTypeMix: { oneOnOne: number; paired: number };
  paidRevenueByDay: AdminDaySeries;
  teacherEarningsByDay: AdminDaySeries;
  paidOrdersByDay: AdminDaySeries;
  classesDeliveredByDay: AdminDaySeries;
  auditEventsByDay: AdminDaySeries;
  financeTotalsUsd: {
    revenue: number;
    earned: number;
    paid: number;
    unbatched: number;
  };
};
/* -------------------------------------------------------------- admin home */

/** One day of the 30-day chart (amounts in cents). */
export type AdminHomeDay = {
  /** YYYY-MM-DD in the admin's time zone. */
  date: string;
  revenueCents: number;
  teacherCents: number;
  aiCents: number;
  classes: number;
  canceled: number;
};

export type AdminHome = {
  /** Things only the admin can unblock, most severe first. */
  actions: AdminAlert[];
  business: {
    /** Class packs + AI credit packs paid this month. */
    revenueThisMonthCents: number;
    revenueLastMonthCents: number;
    /** Revenue − card fees − teacher pay − AI cost, this month. */
    marginCents: number;
    feeCents: number;
    teacherCents: number;
    aiCents: number;
    /** Paid for and not taught yet (what the academy owes in classes). */
    deferredCents: number;
    creditsOutstanding: number;
    /** Distinct buyers with a paid order this month, and how many bought for the first time. */
    payingStudents: number;
    firstTimeBuyers: number;
  };
  days: AdminHomeDay[];
  growth: {
    newThisMonth: number;
    newLastMonth: number;
    active30: number;
    total: number;
    outOfCredits: number;
    /** Students who took a trial and of them, how many bought. */
    trials: number;
    trialsConverted: number;
  };
  operations: {
    today: number;
    live: number;
    notOpened: number;
    coordinatorPending: number;
    coordinatorUrgent: number;
  };
  health: {
    integrations: { id: string; name: string; status: "connected" | "action-needed" | "not-configured" }[];
    securityEvents7d: number;
    bouncedEmails: number;
    staffWithout2Fa: number;
  };
  activity: DashboardAuditRow[];
};
