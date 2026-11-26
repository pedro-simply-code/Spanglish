/**
 * Role and permission model.
 *
 * One account can hold many roles. Permissions are the additive union of every
 * role, while only one dashboard is visible at a time. The active dashboard is
 * resolved on the server from the last role the account used, falling back to
 * the highest-priority role. The switcher renders one button per owned role.
 * The admin role is exclusive: the admin account holds only `admin`, whose
 * permissions already include every other role's.
 */

export const roleCodes = ["student", "teacher", "manager", "admin"] as const;

export type RoleCode = (typeof roleCodes)[number];

export const defaultRole: RoleCode = "student";

export const permissions = [
  "classes:view-own",
  "classes:book",
  "classes:join-own",
  "classes:cancel-own",
  "classes:reschedule-own",
  "classes:view-roster",
  "classes:manage",
  "students:view",
  "materials:read",
  "ai:practice",
  "materials:write",
  "materials:share",
  "forms:grade",
  "recordings:manage",
  "progress:view-own",
  "billing:view-own",
  "billing:manage",
  "staff:view",
  "teachers:approve",
  "materials:moderate",
  "payouts:prepare",
  "payouts:approve",
  "roles:manage",
  "platform:manage",
] as const;

export type Permission = (typeof permissions)[number];

export type RoleDefinition = {
  code: RoleCode;
  name: string;
  description: string;
  /** Higher number wins when an account has several roles. */
  priority: number;
  permissions: readonly Permission[];
  /** Short label for badges in settings and staff surfaces. */
  badge: string;
};

const studentPermissions: readonly Permission[] = [
  "classes:view-own",
  "classes:book",
  "classes:join-own",
  "classes:cancel-own",
  "classes:reschedule-own",
  "materials:read",
  "ai:practice",
  "progress:view-own",
  "billing:view-own",
];

const teacherPermissions: readonly Permission[] = [
  // Practice with Luna is for students: it spends their credits and the API.
  ...studentPermissions.filter((permission) => permission !== "ai:practice"),
  "classes:view-roster",
  "classes:manage",
  "students:view",
  "materials:write",
  "materials:share",
  "forms:grade",
  "recordings:manage",
];

const managerPermissions: readonly Permission[] = [
  ...teacherPermissions,
  "billing:manage",
  "staff:view",
  "teachers:approve",
  "materials:moderate",
  "payouts:prepare",
];

const adminPermissions: readonly Permission[] = [
  ...managerPermissions,
  "payouts:approve",
  "roles:manage",
  "platform:manage",
];

export const roleDefinitions: Record<RoleCode, RoleDefinition> = {
  student: {
    code: "student",
    name: "Student",
    description:
      "Books live classes, joins the classroom, and follows learning material.",
    priority: 0,
    permissions: studentPermissions,
    badge: "Student",
  },
  teacher: {
    code: "teacher",
    name: "Teacher",
    description:
      "Teaches live classes, reviews rosters, and publishes materials, forms, and recordings.",
    priority: 1,
    permissions: teacherPermissions,
    badge: "Teacher",
  },
  manager: {
    code: "manager",
    name: "Manager",
    description:
      "Oversees teachers, classes, and billing without platform-wide access.",
    priority: 2,
    permissions: managerPermissions,
    badge: "Manager",
  },
  admin: {
    code: "admin",
    name: "Admin",
    description:
      "Full access, including role changes and platform configuration.",
    priority: 3,
    permissions: adminPermissions,
    badge: "Admin",
  },
};

export type DashboardDefinition = {
  key: RoleCode;
  label: string;
  path: string;
};

/**
 * One dashboard per role. The active dashboard is resolved server-side and is
 * always one of these routes; the switcher only offers roles the account has.
 */
export const dashboardByRole: Record<RoleCode, DashboardDefinition> = {
  student: { key: "student", label: "Student dashboard", path: "/home" },
  teacher: { key: "teacher", label: "Teacher dashboard", path: "/teacher" },
  manager: { key: "manager", label: "Manager dashboard", path: "/manager" },
  admin: { key: "admin", label: "Admin dashboard", path: "/admin" },
};

export function isRoleCode(value: string): value is RoleCode {
  return (roleCodes as readonly string[]).includes(value);
}

/**
 * Validates and reduces roles to a single dashboard role per account (plus
 * admin-only). Permissions still follow `roleDefinitions` for that role
 * (teacher and manager include student capabilities without a separate
 * `student` entry). Student-only accounts keep `student`.
 */
export function normalizeRoles(input: readonly string[]): RoleCode[] {
  const valid = new Set<RoleCode>();

  for (const value of input) {
    if (isRoleCode(value)) {
      valid.add(value);
    }
  }

  if (valid.has("admin")) return ["admin"];

  if (valid.size === 0) return [defaultRole];

  const primary = getPrimaryRole([...valid]);
  if (primary !== defaultRole || !valid.has(defaultRole)) {
    return [primary];
  }

  return [defaultRole];
}

export function getPrimaryRole(roles: readonly RoleCode[]): RoleCode {
  return roles.reduce<RoleCode>(
    (active, role) =>
      roleDefinitions[role].priority > roleDefinitions[active].priority
        ? role
        : active,
    defaultRole,
  );
}

export function getDashboardForRole(role: RoleCode): DashboardDefinition {
  return dashboardByRole[role];
}

/**
 * Resolves exactly one dashboard. A stored role is honored only when the
 * account still has it; otherwise the highest-priority role wins.
 */
export function getActiveDashboard(
  roles: readonly RoleCode[],
  requestedRole?: string,
) {
  const activeRole =
    requestedRole && isRoleCode(requestedRole) && roles.includes(requestedRole)
      ? requestedRole
      : getPrimaryRole(roles);

  return { ...dashboardByRole[activeRole], activeRole };
}

export type DashboardOption = DashboardDefinition & { role: RoleCode };

export function getDashboardOptions(
  roles: readonly RoleCode[],
): DashboardOption[] {
  return roleCodes
    .filter((role) => roles.includes(role))
    .map((role) => ({ ...dashboardByRole[role], role }));
}

export function hasRole(
  roles: readonly RoleCode[],
  role: RoleCode,
): boolean {
  return roles.includes(role);
}

export function hasAnyRole(
  roles: readonly RoleCode[],
  allowed: readonly RoleCode[],
): boolean {
  return roles.some((role) => allowed.includes(role));
}

export function getPermissions(roles: readonly RoleCode[]): Permission[] {
  const granted = new Set<Permission>();

  for (const role of roles) {
    for (const permission of roleDefinitions[role].permissions) {
      granted.add(permission);
    }
  }

  return [...granted];
}

export function hasPermission(
  roles: readonly RoleCode[],
  permission: Permission,
): boolean {
  return roles.some((role) =>
    roleDefinitions[role].permissions.includes(permission),
  );
}

export function hasAllPermissions(
  roles: readonly RoleCode[],
  required: readonly Permission[],
): boolean {
  return required.every((permission) => hasPermission(roles, permission));
}

export type RoleChange = {
  role: RoleCode;
  action: "grant" | "revoke";
};

export type RoleChangeDecision = {
  allowed: boolean;
  reason: string;
};

/**
 * Rules for future role-management screens. Authorization must still run on
 * the server before persisting a change.
 */
export function canChangeRole(
  actorRoles: readonly RoleCode[],
  targetRoles: readonly RoleCode[],
  change: RoleChange,
): RoleChangeDecision {
  if (!hasPermission(actorRoles, "roles:manage")) {
    return {
      allowed: false,
      reason: "Only administrators can change roles.",
    };
  }

  if (change.action === "revoke" && change.role === defaultRole) {
    return {
      allowed: false,
      reason: "The student role is the account default and cannot be removed.",
    };
  }

  if (change.role === "admin") {
    return {
      allowed: false,
      reason:
        "The academy has a single admin, set with ADMIN_EMAIL or `pnpm admin:promote`; it cannot be changed from the app.",
    };
  }

  return { allowed: true, reason: "Role change allowed." };
}
