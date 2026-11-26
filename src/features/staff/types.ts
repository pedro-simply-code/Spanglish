export type ManagerDashboardStat = {
  id: string;
  label: string;
  value: string;
  helper: string;
  href?: string;
};

/* ------------------------------------------------------------ manager home */

/** A class today (in the coordinator's time zone) or live right now. */
export type ManagerTodayClass = {
  id: string;
  topic: string;
  teacherName: string;
  students: string[];
  startsAt: string;
  endsAt: string;
  live: boolean;
  /** Live for more than 5 minutes and the teacher has not opened the room. */
  notOpened: boolean;
};

/** One line in the coordinator's to-do; the client words it (plurals, money). */
export type ManagerPendingItem =
  | { kind: "notOpened"; id: string; href: string; severity: "high"; topic: string; teacherName: string; minutes: number }
  | { kind: "applications"; id: string; href: string; severity: "high"; count: number }
  | { kind: "materials"; id: string; href: string; severity: "normal"; count: number }
  | {
      kind: "lowRating";
      id: string;
      href: string;
      severity: "normal";
      stars: number;
      teacherName: string;
      studentName: string;
      comment: string | null;
    }
  | { kind: "lateGrading"; id: string; href: string; severity: "normal"; teacherName: string; count: number }
  | { kind: "payouts"; id: string; href: string; severity: "normal"; amountCents: number; teachers: number }
  | { kind: "changeRequest"; id: string; href: string; severity: "low"; topic: string; newStartsAt: string }
  | { kind: "noAvailability"; id: string; href: string; severity: "low"; count: number }
  | { kind: "quietStudents"; id: string; href: string; severity: "low"; count: number };

export type ManagerTeacherFlag = "noAvailability" | "noUpcoming" | "toGrade" | "lowRating";

export type ManagerTeamRow = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  levelName: string;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  upcoming: number;
  toGrade: number;
  flags: ManagerTeacherFlag[];
};

export type ManagerStudentsSummary = {
  total: number;
  newThisWeek: number;
  active30: number;
  /** Took classes or bought before, now no credits and nothing booked. */
  outOfCredits: number;
  /** Credits left, nothing booked, no class in 14 days. */
  idleWithCredits: number;
  /** Took a trial class and never bought. */
  trialsNoPurchase: number;
};

export type ManagerMoney = {
  revenueThisMonthCents: number;
  revenueLastMonthCents: number;
  ordersThisMonth: number;
  creditsOutstanding: number;
  teacherEarnedThisMonthCents: number;
  teacherUnbatchedCents: number;
  unbatchedTeachers: number;
};

export type ManagerHome = {
  today: ManagerTodayClass[];
  classesThisWeek: number;
  pending: ManagerPendingItem[];
  team: ManagerTeamRow[];
  teacherCount: number;
  students: ManagerStudentsSummary;
  money: ManagerMoney;
};
