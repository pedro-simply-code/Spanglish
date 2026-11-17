import type { RoleCode } from "@/lib/auth-roles";

export type InvoiceStatus = "paid" | "due" | "refunded";

export type Invoice = {
  id: string;
  student: string;
  plan: string;
  amount: string;
  status: InvoiceStatus;
  issuedAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: "Teacher" | "Manager";
  specialty: string;
  students: number;
  utilization: number;
  status: "Active" | "On leave";
};

export type RoomStatus = "live" | "ready" | "maintenance";

export type ClassroomSessionStatus = "upcoming" | "in-progress" | "completed" | "canceled";

export type ManagerClassroomStudent = {
  name: string;
  joined: boolean;
};

export type ManagerClassroomRow = {
  id: string;
  topic: string;
  classType: "one-on-one" | "paired";
  classTypeLabel: string;
  startsAt: string;
  timeLabel: string;
  scheduleLabel: string;
  timeRangeLabel: string;
  durationMinutes: number;
  teacherName: string;
  students: ManagerClassroomStudent[];
  sessionStatus: ClassroomSessionStatus;
  /** Env: students wait until the teacher starts the call. */
  teacherStartsRequired: boolean;
  /** Teacher clicked “start live session” and has not ended it. */
  teacherSessionActive: boolean;
  /** Broadcast is live (in schedule window, and teacher started when required). */
  isLive: boolean;
  canEnter: boolean;
  joinMessage: string;
  provider: string;
  roomHref: string;
  meetingRoom: string;
  description: string;
  agenda: string[];
  outcomes: string[];
};

/** @deprecated Use {@link ManagerClassroomRow}. */
export type AcademyRoom = ManagerClassroomRow;

export type PersonAccount = {
  id: string;
  name: string;
  email: string;
  roles: RoleCode[];
  status: "Active" | "Invited" | "Suspended";
  twoFactorEnabled: boolean;
  createdAt: string;
};

export type IntegrationStatus =
  | "connected"
  | "action-needed"
  | "not-configured";

export type Integration = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  owner: string;
  /** Environment variables it needs and whether each one is set (never the value). */
  variables?: { name: string; set: boolean; optional?: boolean }[];
  /** Provider documentation or console. */
  docsUrl?: string;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  severity: "info" | "warning" | "critical";
};

export const invoices: Invoice[] = [
  {
    id: "inv-2041",
    student: "Priya Shah",
    plan: "Individual · 50 min · 30 classes",
    amount: "$510.00",
    status: "paid",
    issuedAt: "Nov 15, 2026",
  },
  {
    id: "inv-2040",
    student: "Alex Rivera",
    plan: "Individual · 25 min · 60 classes",
    amount: "$720.00",
    status: "paid",
    issuedAt: "Nov 14, 2026",
  },
  {
    id: "inv-2039",
    student: "Mateo Silva",
    plan: "Paired · 50 min · 30 classes",
    amount: "$510.00",
    status: "due",
    issuedAt: "Nov 13, 2026",
  },
  {
    id: "inv-2038",
    student: "Hannah Kim",
    plan: "Individual · 50 min · 60 classes",
    amount: "$1,020.00",
    status: "due",
    issuedAt: "Nov 12, 2026",
  },
  {
    id: "inv-2037",
    student: "Diego Torres",
    plan: "Paired · 25 min · 90 classes",
    amount: "$1,440.00",
    status: "refunded",
    issuedAt: "Nov 10, 2026",
  },
];

export const billingStats = [
  { id: "mrr", label: "Monthly recurring revenue", value: "$12,480", helper: "+8.4% vs. October" },
  { id: "open", label: "Open invoices", value: "$1,530", helper: "2 awaiting payment" },
  { id: "renewal", label: "Renewal rate", value: "81%", helper: "Target is 80%" },
  { id: "refunds", label: "Refunds this month", value: "$340", helper: "3 credited classes" },
];

export const staffMembers: StaffMember[] = [
  {
    id: "staff-maria",
    name: "María González",
    role: "Teacher",
    specialty: "Pronunciation and travel Spanish",
    students: 18,
    utilization: 82,
    status: "Active",
  },
  {
    id: "staff-carlos",
    name: "Carlos Mendoza",
    role: "Teacher",
    specialty: "Grammar and exam preparation",
    students: 21,
    utilization: 76,
    status: "Active",
  },
  {
    id: "staff-lucia",
    name: "Lucía Fernández",
    role: "Teacher",
    specialty: "Business and interview Spanish",
    students: 12,
    utilization: 64,
    status: "Active",
  },
  {
    id: "staff-diego",
    name: "Diego Ramírez",
    role: "Manager",
    specialty: "Academy operations and billing",
    students: 0,
    utilization: 40,
    status: "Active",
  },
  {
    id: "staff-ana",
    name: "Ana Torres",
    role: "Teacher",
    specialty: "Beginner conversation",
    students: 9,
    utilization: 28,
    status: "On leave",
  },
];

export const academyRooms: AcademyRoom[] = [];

export const peopleAccounts: PersonAccount[] = [
  {
    id: "person-alex",
    name: "Alex Rivera",
    email: "alex@spanglish.app",
    roles: ["student"],
    status: "Active",
    twoFactorEnabled: false,
    createdAt: "2025-06-01T12:00:00.000Z",
  },
  {
    id: "person-maria",
    name: "María González",
    email: "teacher@spanglish.app",
    roles: ["student", "teacher"],
    status: "Active",
    twoFactorEnabled: true,
    createdAt: "2025-05-15T12:00:00.000Z",
  },
  {
    id: "person-diego",
    name: "Diego Ramírez",
    email: "manager@spanglish.app",
    roles: ["student", "teacher", "manager"],
    status: "Active",
    twoFactorEnabled: false,
    createdAt: "2025-04-20T12:00:00.000Z",
  },
  {
    id: "person-lucia",
    name: "Lucía Fernández",
    email: "admin@spanglish.app",
    roles: ["student", "teacher", "manager", "admin"],
    status: "Active",
    twoFactorEnabled: true,
    createdAt: "2025-01-10T12:00:00.000Z",
  },
  {
    id: "person-hannah",
    name: "Hannah Kim",
    email: "hannah.kim@example.com",
    roles: ["student"],
    status: "Invited",
    twoFactorEnabled: false,
    createdAt: "2025-11-01T12:00:00.000Z",
  },
  {
    id: "person-ana",
    name: "Ana Torres",
    email: "ana.torres@spanglish.app",
    roles: ["student", "teacher"],
    status: "Suspended",
    twoFactorEnabled: false,
    createdAt: "2025-03-08T12:00:00.000Z",
  },
];

export const integrations: Integration[] = [
  {
    id: "integration-meet",
    name: "LiveKit",
    description:
      "In-app video, screen share, and room tokens. Configure LIVEKIT_* in the environment.",
    status: "action-needed",
    owner: "Platform",
  },
  {
    id: "integration-email",
    name: "Transactional email",
    description:
      "Verification codes and notifications via Gmail SMTP (default) or Postmark (EMAIL_PROVIDER).",
    status: "action-needed",
    owner: "Platform",
  },
  {
    id: "integration-google",
    name: "Google sign-in",
    description:
      "OAuth client for one-tap sign-in. Falls back to the sample session until keys exist.",
    status: "not-configured",
    owner: "Platform",
  },
  {
    id: "integration-storage",
    name: "Backblaze B2",
    description:
      "S3-compatible bucket for class recordings and large material files (B2_* env vars).",
    status: "not-configured",
    owner: "Platform",
  },
  {
    id: "integration-billing",
    name: "Payments",
    description:
      "Checkout is a static demo. Connect the provider before charging real cards.",
    status: "not-configured",
    owner: "Finance",
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: "audit-01",
    actor: "Lucía Fernández",
    action: "Granted the Manager role",
    target: "Diego Ramírez",
    at: "Today · 09:12",
    severity: "warning",
  },
  {
    id: "audit-02",
    actor: "Lucía Fernández",
    action: "Updated the cancellation policy",
    target: "Academy settings · 24-hour cutoff",
    at: "Yesterday · 16:40",
    severity: "critical",
  },
  {
    id: "audit-03",
    actor: "System",
    action: "Rotated the meeting provider signing key",
    target: "Meeting provider",
    at: "Nov 14 · 03:00",
    severity: "info",
  },
  {
    id: "audit-04",
    actor: "Diego Ramírez",
    action: "Issued a credit refund",
    target: "Invoice inv-2037",
    at: "Nov 13 · 14:05",
    severity: "warning",
  },
  {
    id: "audit-05",
    actor: "Lucía Fernández",
    action: "Invited two teachers",
    target: "María González, Ana Torres",
    at: "Nov 13 · 11:25",
    severity: "info",
  },
  {
    id: "audit-06",
    actor: "System",
    action: "Rejected a late cancellation",
    target: "Class class-1003",
    at: "Nov 12 · 20:44",
    severity: "info",
  },
  {
    id: "audit-07",
    actor: "Lucía Fernández",
    action: "Suspended an account",
    target: "Ana Torres",
    at: "Nov 11 · 10:02",
    severity: "critical",
  },
];

export const roleAccountCounts: Record<RoleCode, string> = {
  student: "1,284",
  teacher: "42",
  manager: "9",
  admin: "4",
};

export const auditSeverityColor: Record<
  AuditEntry["severity"],
  "default" | "warning" | "error"
> = {
  info: "default",
  warning: "warning",
  critical: "error",
};

export const roomStatusLabels: Record<RoomStatus, string> = {
  live: "Live now",
  ready: "Ready",
  maintenance: "Maintenance",
};
