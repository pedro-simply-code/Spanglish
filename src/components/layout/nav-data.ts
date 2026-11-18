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

/** Minimal translator shape used by data helpers that live outside components. */
export type NavTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

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

type NavItemDefinition = Omit<NavItem, "title"> & { titleKey: string };

type NavSectionDefinition = {
  labelKey: string;
  items: NavItemDefinition[];
};

/**
 * The sidebar follows the active dashboard, not the union of every role. Each
 * role gets the same four-section rhythm: Dashboard, Academy, the role
 * workspace, and Insights. Labels are translation keys resolved by the caller.
 */
const navigationByRole: Record<RoleCode, NavSectionDefinition[]> = {
  student: [
    {
      labelKey: "nav.dashboard",
      items: [{ titleKey: "nav.overview", href: "/home", icon: IconHome2 }],
    },
    {
      labelKey: "nav.academy",
      items: [
        { titleKey: "nav.myClasses", href: "/classes", icon: IconVideo },
        { titleKey: "nav.bookAClass", href: "/schedule", icon: IconCalendarEvent },
        { titleKey: "nav.pricing", href: "/pricing", icon: IconCreditCard },
        { titleKey: "nav.myCredits", href: "/credits", icon: IconWallet },
      ],
    },
    {
      labelKey: "nav.learning",
      items: [
        { titleKey: "nav.lessons", href: "/lessons", icon: IconBook },
        { titleKey: "nav.practice", href: "/practice", icon: IconPencil },
        { titleKey: "nav.vocabulary", href: "/vocabulary", icon: IconCards },
        { titleKey: "nav.materials", href: "/materials", icon: IconFileText },
      ],
    },
    {
      labelKey: "nav.insights",
      items: [
        { titleKey: "nav.progress", href: "/progress", icon: IconChartLine },
        { titleKey: "nav.achievements", href: "/achievements", icon: IconTrophy },
        { titleKey: "nav.teachWithUs", href: "/apply", icon: IconSchool },
        { titleKey: "nav.settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
  teacher: [
    {
      labelKey: "nav.dashboard",
      items: [{ titleKey: "nav.overview", href: "/teacher", icon: IconHome2 }],
    },
    {
      labelKey: "nav.academy",
      items: [
        { titleKey: "nav.myClasses", href: "/classes", icon: IconVideo },
        { titleKey: "nav.availability", href: "/teacher/availability", icon: IconCalendarTime },
        { titleKey: "nav.earnings", href: "/teacher/earnings", icon: IconCash },
      ],
    },
    {
      labelKey: "nav.teaching",
      items: [
        { titleKey: "nav.materials", href: "/teacher/materials", icon: IconFileText },
        { titleKey: "nav.assignments", href: "/teacher/assignments", icon: IconClipboardList },
        { titleKey: "nav.recordings", href: "/teacher/recordings", icon: IconMovie },
      ],
    },
    {
      labelKey: "nav.insights",
      items: [
        { titleKey: "nav.students", href: "/teacher/students", icon: IconUsers },
        { titleKey: "nav.settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
  manager: [
    {
      labelKey: "nav.dashboard",
      items: [{ titleKey: "nav.overview", href: "/manager", icon: IconHome2 }],
    },
    {
      labelKey: "nav.operations",
      items: [
        { titleKey: "nav.academySchedule", href: "/apps/calendar", icon: IconCalendarEvent },
        { titleKey: "nav.studentsAndCredits", href: "/manager/students", icon: IconCards },
        { titleKey: "nav.teacherApplications", href: "/manager/applications", icon: IconSchool },
        { titleKey: "nav.materialReview", href: "/manager/materials", icon: IconChecklist },
        { titleKey: "nav.teacherPayouts", href: "/manager/payouts", icon: IconCash },
        { titleKey: "nav.billing", href: "/manager/billing", icon: IconReceipt2 },
        { titleKey: "nav.staff", href: "/manager/staff", icon: IconUsers },
        { titleKey: "nav.rooms", href: "/manager/rooms", icon: IconVideo },
      ],
    },
    {
      labelKey: "nav.account",
      items: [{ titleKey: "nav.settings", href: "/settings", icon: IconSettings }],
    },
  ],
  admin: [
    {
      labelKey: "nav.dashboard",
      items: [{ titleKey: "nav.overview", href: "/admin", icon: IconHome2 }],
    },
    {
      labelKey: "nav.commerce",
      items: [{ titleKey: "nav.packages", href: "/admin/commerce/packages", icon: IconBuildingStore }],
    },
    {
      labelKey: "nav.finance",
      items: [
        { titleKey: "nav.teacherPayRates", href: "/admin/finance/teacher-rates", icon: IconCoin },
        { titleKey: "nav.payoutApprovals", href: "/admin/finance/payouts", icon: IconReceipt2 },
        { titleKey: "nav.paymentProviders", href: "/admin/finance/providers", icon: IconWallet },
        { titleKey: "nav.creditLedger", href: "/admin/finance/ledger", icon: IconScale },
      ],
    },
    {
      labelKey: "nav.organization",
      items: [
        { titleKey: "nav.users", href: "/admin/organization/users", icon: IconUsers },
        { titleKey: "nav.studentsAndCredits", href: "/admin/organization/students", icon: IconCards },
        { titleKey: "nav.teacherApplications", href: "/admin/organization/applications", icon: IconSchool },
        { titleKey: "nav.managers", href: "/admin/organization/managers", icon: IconUsersGroup },
        { titleKey: "nav.roles", href: "/admin/organization/roles", icon: IconUserShield },
      ],
    },
    {
      labelKey: "nav.platform",
      items: [
        { titleKey: "nav.integrations", href: "/admin/platform/integrations", icon: IconPlugConnected },
        { titleKey: "nav.securityPolicy", href: "/admin/platform/security", icon: IconShieldCheck },
        { titleKey: "nav.emailDeliverability", href: "/admin/platform/email", icon: IconMail },
        { titleKey: "nav.classroomDefaults", href: "/admin/platform/rooms", icon: IconServer },
      ],
    },
    {
      labelKey: "nav.compliance",
      items: [
        { titleKey: "nav.auditLog", href: "/admin/audit", icon: IconShieldCheck },
        { titleKey: "nav.settings", href: "/settings", icon: IconSettings },
      ],
    },
  ],
};

export function getNavSections(role: RoleCode, t: NavTranslator): NavSection[] {
  return navigationByRole[role].map((section) => ({
    label: t(section.labelKey),
    items: section.items.map(({ titleKey, ...item }) => ({
      ...item,
      title: t(titleKey),
    })),
  }));
}

/** Student navigation doubles as the fallback for global search. */
export const navSections = (t: NavTranslator): NavSection[] =>
  getNavSections("student", t);
