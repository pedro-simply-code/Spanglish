import type { ComponentType } from "react";
import {
  IconBook,
  IconBuildingStore,
  IconCalendarEvent,
  IconCalendarTime,
  IconCards,
  IconChartLine,
  IconClipboardList,
  IconCoin,
  IconCreditCard,
  IconFileText,
  IconHome2,
  IconMail,
  IconMovie,
  IconPencil,
  IconPlugConnected,
  IconReceipt2,
  IconScale,
  IconSchool,
  IconCash,
  IconChecklist,
  IconServer,
  IconSettings,
  IconShieldCheck,
  IconTrophy,
  IconUserShield,
  IconUsers,
  IconUsersGroup,
  IconVideo,
  IconWallet,
} from "@tabler/icons-react";
import type { RoleCode } from "@/lib/auth-roles";

type NavIcon = ComponentType<{ size?: number | string; stroke?: number | string }>;

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  chip?: string;
  chipColor?: "secondary";
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

/**
 * The sidebar follows the active dashboard, not the union of every role. Each
 * role gets the same four-section rhythm: Dashboard, Academy, the role
 * workspace, and Insights.
 */
const navigationByRole: Record<RoleCode, NavSection[]> = {
  student: [
    {
      label: "Dashboard",
      items: [{ title: "Overview", href: "/home", icon: IconHome2 }],
    },
    {
      label: "Academy",
      items: [
        { title: "My classes", href: "/classes", icon: IconVideo },
        { title: "Book a class", href: "/schedule", icon: IconCalendarEvent },
        { title: "Pricing", href: "/pricing", icon: IconCreditCard },
      ],
    },
    {
      label: "Learning",
      items: [
        { title: "Lessons", href: "/lessons", icon: IconBook },
        { title: "Practice", href: "/practice", icon: IconPencil },
        { title: "Vocabulary", href: "/vocabulary", icon: IconCards },
        { title: "Materials", href: "/materials", icon: IconFileText },
      ],
    },
    {
      label: "Insights",
      items: [
        { title: "Progress", href: "/progress", icon: IconChartLine },
        { title: "Achievements", href: "/achievements", icon: IconTrophy },
        { title: "Teach with us", href: "/apply", icon: IconSchool },
        { title: "Settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
  teacher: [
    {
      label: "Dashboard",
      items: [{ title: "Overview", href: "/teacher", icon: IconHome2 }],
    },
    {
      label: "Academy",
      items: [
        { title: "My classes", href: "/classes", icon: IconVideo },
        { title: "Availability", href: "/teacher/availability", icon: IconCalendarTime },
        { title: "Earnings", href: "/teacher/earnings", icon: IconCash },
      ],
    },
    {
      label: "Teaching",
      items: [
        { title: "Materials", href: "/teacher/materials", icon: IconFileText },
        { title: "Assignments", href: "/teacher/assignments", icon: IconClipboardList },
        { title: "Recordings", href: "/teacher/recordings", icon: IconMovie },
      ],
    },
    {
      label: "Insights",
      items: [
        { title: "Students", href: "/teacher/students", icon: IconUsers },
        { title: "Settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
  manager: [
    {
      label: "Dashboard",
      items: [{ title: "Overview", href: "/manager", icon: IconHome2 }],
    },
    {
      label: "Operations",
      items: [
        { title: "Academy schedule", href: "/apps/calendar", icon: IconCalendarEvent },
        { title: "Students & credits", href: "/manager/students", icon: IconCards },
        { title: "Teacher applications", href: "/manager/applications", icon: IconSchool },
        { title: "Material review", href: "/manager/materials", icon: IconChecklist },
        { title: "Teacher payouts", href: "/manager/payouts", icon: IconCash },
        { title: "Billing", href: "/manager/billing", icon: IconReceipt2 },
        { title: "Staff", href: "/manager/staff", icon: IconUsers },
        { title: "Rooms", href: "/manager/rooms", icon: IconVideo },
      ],
    },
    {
      label: "Account",
      items: [{ title: "Settings", href: "/settings", icon: IconSettings }],
    },
  ],
  admin: [
    {
      label: "Dashboard",
      items: [{ title: "Overview", href: "/admin", icon: IconHome2 }],
    },
    {
      label: "Commerce",
      items: [{ title: "Packages", href: "/admin/commerce/packages", icon: IconBuildingStore }],
    },
    {
      label: "Finance",
      items: [
        { title: "Teacher pay rates", href: "/admin/finance/teacher-rates", icon: IconCoin },
        { title: "Payout approvals", href: "/admin/finance/payouts", icon: IconReceipt2 },
        { title: "Payment providers", href: "/admin/finance/providers", icon: IconWallet },
        { title: "Credit ledger", href: "/admin/finance/ledger", icon: IconScale },
      ],
    },
    {
      label: "Organization",
      items: [
        { title: "Users", href: "/admin/organization/users", icon: IconUsers },
        { title: "Students & credits", href: "/admin/organization/students", icon: IconCards },
        { title: "Teacher applications", href: "/admin/organization/applications", icon: IconSchool },
        { title: "Managers", href: "/admin/organization/managers", icon: IconUsersGroup },
        { title: "Roles", href: "/admin/organization/roles", icon: IconUserShield },
      ],
    },
    {
      label: "Platform",
      items: [
        { title: "Integrations", href: "/admin/platform/integrations", icon: IconPlugConnected },
        { title: "Security policy", href: "/admin/platform/security", icon: IconShieldCheck },
        { title: "Email deliverability", href: "/admin/platform/email", icon: IconMail },
        { title: "Classroom defaults", href: "/admin/platform/rooms", icon: IconServer },
      ],
    },
    {
      label: "Compliance",
      items: [
        { title: "Audit log", href: "/admin/audit", icon: IconShieldCheck },
        { title: "Settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
};

export function getNavSections(role: RoleCode): NavSection[] {
  return navigationByRole[role];
}

/** Student navigation doubles as the fallback for global search. */
export const navSections = navigationByRole.student;
