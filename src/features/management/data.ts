import type { RoleCode } from "@/lib/auth-roles";

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

type Translator = (key: string, values?: Record<string, string | number>) => string;

export const staffMembers = (t: Translator): StaffMember[] => [
  {
    id: "staff-maria",
    name: "María González",
    role: "Teacher",
    specialty: t("management.staff.specialty.pronunciation"),
    students: 18,
    utilization: 82,
    status: "Active",
  },
  {
    id: "staff-carlos",
    name: "Carlos Mendoza",
    role: "Teacher",
    specialty: t("management.staff.specialty.grammar"),
    students: 21,
    utilization: 76,
    status: "Active",
  },
  {
    id: "staff-lucia",
    name: "Lucía Fernández",
    role: "Teacher",
    specialty: t("management.staff.specialty.business"),
    students: 12,
    utilization: 64,
    status: "Active",
  },
  {
    id: "staff-diego",
    name: "Diego Ramírez",
    role: "Manager",
    specialty: t("management.staff.specialty.operations"),
    students: 0,
    utilization: 40,
    status: "Active",
  },
  {
    id: "staff-ana",
    name: "Ana Torres",
    role: "Teacher",
    specialty: t("management.staff.specialty.conversation"),
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

export const integrations = (t: Translator): Integration[] => [
  {
    id: "integration-meet",
    name: "LiveKit",
    description: t("management.integration.meet.description"),
    status: "action-needed",
    owner: t("management.integration.owner.platform"),
  },
  {
    id: "integration-email",
    name: t("management.integration.email.name"),
    description: t("management.integration.email.description"),
    status: "action-needed",
    owner: t("management.integration.owner.platform"),
  },
  {
    id: "integration-google",
    name: t("management.integration.google.name"),
    description: t("management.integration.google.description"),
    status: "not-configured",
    owner: t("management.integration.owner.platform"),
  },
  {
    id: "integration-storage",
    name: "Backblaze B2",
    description: t("management.integration.storage.description"),
    status: "not-configured",
    owner: t("management.integration.owner.platform"),
  },
  {
    id: "integration-billing",
    name: t("management.integration.billing.name"),
    description: t("management.integration.billing.description"),
    status: "not-configured",
    owner: t("management.integration.owner.finance"),
  },
];

export const auditLog = (t: Translator): AuditEntry[] => [
  {
    id: "audit-01",
    actor: "Lucía Fernández",
    action: t("management.audit.action.managerRoleGranted"),
    target: "Diego Ramírez",
    at: t("management.audit.at.today", { time: "09:12" }),
    severity: "warning",
  },
  {
    id: "audit-02",
    actor: "Lucía Fernández",
    action: t("management.audit.action.cancellationPolicyUpdated"),
    target: t("management.audit.target.academySettings"),
    at: t("management.audit.at.yesterday", { time: "16:40" }),
    severity: "critical",
  },
  {
    id: "audit-03",
    actor: t("management.audit.system"),
    action: t("management.audit.action.signingKeyRotated"),
    target: t("management.audit.target.meetingProvider"),
    at: t("management.audit.at.nov14", { time: "03:00" }),
    severity: "info",
  },
  {
    id: "audit-04",
    actor: "Diego Ramírez",
    action: t("management.audit.action.creditRefundIssued"),
    target: t("management.audit.target.invoice", { id: "inv-2037" }),
    at: t("management.audit.at.nov13", { time: "14:05" }),
    severity: "warning",
  },
  {
    id: "audit-05",
    actor: "Lucía Fernández",
    action: t("management.audit.action.teachersInvited"),
    target: "María González, Ana Torres",
    at: t("management.audit.at.nov13", { time: "11:25" }),
    severity: "info",
  },
  {
    id: "audit-06",
    actor: t("management.audit.system"),
    action: t("management.audit.action.lateCancelationRejected"),
    target: t("management.audit.target.class", { id: "class-1003" }),
    at: t("management.audit.at.nov12", { time: "20:44" }),
    severity: "info",
  },
  {
    id: "audit-07",
    actor: "Lucía Fernández",
    action: t("management.audit.action.accountSuspended"),
    target: "Ana Torres",
    at: t("management.audit.at.nov11", { time: "10:02" }),
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

export const roomStatusLabels = (t: Translator): Record<RoomStatus, string> => ({
  live: t("management.rooms.status.live"),
  ready: t("management.rooms.status.ready"),
  maintenance: t("management.rooms.status.maintenance"),
});
