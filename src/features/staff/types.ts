export type ManagerDashboardStat = {
  id: string;
  label: string;
  value: string;
  helper: string;
  href?: string;
};

export type ManagerTeamMember = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  levelName: string;
};

export type ManagerAttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "high" | "normal" | "low";
};

export type ManagerClassOperations = {
  classesThisWeek: number;
  upcoming: number;
  liveNow: number;
  deliveredThisWeek: number;
  pendingChangeRequests: number;
};

export type ManagerBillingSnapshot = {
  revenueCents: number;
  paidOrders: number;
  creditsOutstanding: number;
  deferredRevenueCents: number;
  teacherUnbatchedCents: number;
  teacherEarnedThisMonthCents: number;
};

export type ManagerDashboardSnapshot = {
  stats: ManagerDashboardStat[];
  team: ManagerTeamMember[];
  attention: ManagerAttentionItem[];
  operations: ManagerClassOperations;
  billing: ManagerBillingSnapshot;
  teacherCount: number;
};