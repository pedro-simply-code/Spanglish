import type { NavTranslator as HeaderTranslator } from "@/components/layout/nav-data";
import type { RoleCode } from "@/lib/auth-roles";

export type LanguageOption = {
  label: string;
  icon: string;
  value: string;
};

const languageDefinitions = [
  {
    labelKey: "language.en",
    icon: "/images/flag/icon-flag-us.svg",
    value: "en",
  },
  {
    labelKey: "language.es",
    icon: "/images/flag/icon-flag-gt.svg",
    value: "es",
  },
] as const;

export function getDefaultLanguage(t: HeaderTranslator): LanguageOption {
  const definition = languageDefinitions[0]!;
  return {
    label: t(definition.labelKey),
    icon: definition.icon,
    value: definition.value,
  };
}

/** UI languages (see src/i18n). */
export function getLanguages(t: HeaderTranslator): LanguageOption[] {
  return languageDefinitions.map((definition) => ({
    label: t(definition.labelKey),
    icon: definition.icon,
    value: definition.value,
  }));
}

export type NotificationIcon =
  | "trophy"
  | "flame"
  | "cards"
  | "book"
  | "target"
  | "calendar";

export type NotificationItem = {
  icon: NotificationIcon;
  title: string;
  subtitle: string;
};

type NotificationDefinition = {
  icon: NotificationIcon;
  titleKey: string;
  subtitleKey: string;
  values?: Record<string, string | number>;
};

const notificationDefinitions: NotificationDefinition[] = [
  {
    icon: "calendar",
    titleKey: "notifications.classReminder.title",
    subtitleKey: "notifications.classReminder.subtitle",
  },
  {
    icon: "trophy",
    titleKey: "notifications.badge.title",
    subtitleKey: "notifications.badge.subtitle",
  },
  {
    icon: "flame",
    titleKey: "notifications.streak.title",
    subtitleKey: "notifications.streak.subtitle",
    values: { days: 12 },
  },
  {
    icon: "target",
    titleKey: "notifications.dailyGoal.title",
    subtitleKey: "notifications.dailyGoal.subtitle",
    values: { minutes: 2 },
  },
  {
    icon: "cards",
    titleKey: "notifications.vocabulary.title",
    subtitleKey: "notifications.vocabulary.subtitle",
    values: { count: 14 },
  },
  {
    icon: "book",
    titleKey: "notifications.lesson.title",
    subtitleKey: "notifications.lesson.subtitle",
    values: { percent: 65 },
  },
];

export function getHeaderNotifications(t: HeaderTranslator): NotificationItem[] {
  return notificationDefinitions.map((definition) => ({
    icon: definition.icon,
    title: t(definition.titleKey, definition.values),
    subtitle: t(definition.subtitleKey, definition.values),
  }));
}

export type ProfileLinkIcon = "account" | "calendar" | "inbox" | "tasks";

export type ProfileLink = {
  href: string;
  title: string;
  subtitle: string;
  icon: ProfileLinkIcon;
};

type ProfileLinkDefinition = Omit<ProfileLink, "title" | "subtitle"> & {
  titleKey: string;
  subtitleKey: string;
};

const profileLinkDefinitions = {
  profile: {
    href: "/settings",
    titleKey: "profileMenu.links.profileTitle",
    subtitleKey: "profileMenu.links.profileSubtitle",
    icon: "account",
  },
  messages: {
    href: "/apps/email",
    titleKey: "profileMenu.links.messagesTitle",
    subtitleKey: "profileMenu.links.messagesSubtitle",
    icon: "inbox",
  },
} satisfies Record<string, ProfileLinkDefinition>;

/** Profile menu links for the active dashboard: only pages that role uses. */
const profileLinksDefinitionByRole: Record<RoleCode, ProfileLinkDefinition[]> = {
  student: [
    profileLinkDefinitions.profile,
    profileLinkDefinitions.messages,
    {
      href: "/apply",
      titleKey: "nav.teachWithUs",
      subtitleKey: "profileMenu.links.teachSubtitle",
      icon: "tasks",
    },
  ],
  teacher: [
    profileLinkDefinitions.profile,
    profileLinkDefinitions.messages,
    {
      href: "/classes",
      titleKey: "nav.myClasses",
      subtitleKey: "profileMenu.links.classesTeacherSubtitle",
      icon: "calendar",
    },
    {
      href: "/teacher/earnings",
      titleKey: "nav.earnings",
      subtitleKey: "profileMenu.links.earningsSubtitle",
      icon: "tasks",
    },
  ],
  manager: [
    profileLinkDefinitions.profile,
    profileLinkDefinitions.messages,
    {
      href: "/apps/calendar",
      titleKey: "nav.academySchedule",
      subtitleKey: "profileMenu.links.academyScheduleSubtitle",
      icon: "calendar",
    },
    {
      href: "/manager/payouts",
      titleKey: "nav.teacherPayouts",
      subtitleKey: "profileMenu.links.payoutsSubtitle",
      icon: "tasks",
    },
  ],
  admin: [
    profileLinkDefinitions.profile,
    {
      href: "/admin/finance/payouts",
      titleKey: "nav.payoutApprovals",
      subtitleKey: "profileMenu.links.payoutApprovalsSubtitle",
      icon: "tasks",
    },
    {
      href: "/admin/audit",
      titleKey: "nav.auditLog",
      subtitleKey: "profileMenu.links.auditSubtitle",
      icon: "inbox",
    },
    {
      href: "/admin/platform/integrations",
      titleKey: "nav.integrations",
      subtitleKey: "profileMenu.links.integrationsSubtitle",
      icon: "calendar",
    },
  ],
};

export function getProfileLinksByRole(
  role: RoleCode,
  t: HeaderTranslator,
): ProfileLink[] {
  return profileLinksDefinitionByRole[role].map((definition) => ({
    href: definition.href,
    icon: definition.icon,
    title: t(definition.titleKey),
    subtitle: t(definition.subtitleKey),
  }));
}
