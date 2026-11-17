import type { RoleCode } from "@/lib/auth-roles";

export type LanguageOption = {
  label: string;
  icon: string;
  value: string;
};

export const defaultLanguage: LanguageOption = {
  label: "English",
  icon: "/images/flag/icon-flag-us.svg",
  value: "en",
};

/** UI languages (see src/i18n). */
export const languages: LanguageOption[] = [
  defaultLanguage,
  {
    label: "Español",
    icon: "/images/flag/icon-flag-gt.svg",
    value: "es",
  },
];

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

export const notifications: NotificationItem[] = [
  {
    icon: "calendar",
    title: "Class reminder",
    subtitle: "María González tomorrow at 18:00",
  },
  {
    icon: "trophy",
    title: "New badge unlocked",
    subtitle: "You earned Word Collector",
  },
  {
    icon: "flame",
    title: "12-day streak",
    subtitle: "Keep it alive with a quick review",
  },
  {
    icon: "target",
    title: "Daily goal almost there",
    subtitle: "2 minutes left to hit your goal",
  },
  {
    icon: "cards",
    title: "Vocabulary review ready",
    subtitle: "14 words are due today",
  },
  {
    icon: "book",
    title: "Lesson in progress",
    subtitle: "Everyday Spanglish Phrases is 65% done",
  },
];

export type ProfileLink = {
  href: string;
  title: string;
  subtitle: string;
  icon: string;
};

const profileLink = {
  profile: {
    href: "/settings",
    title: "My Profile",
    subtitle: "Account settings",
    icon: "/images/svgs/icon-account.svg",
  },
  messages: {
    href: "/apps/email",
    title: "Messages",
    subtitle: "Your inbox",
    icon: "/images/svgs/icon-inbox.svg",
  },
} satisfies Record<string, ProfileLink>;

/** Profile menu links for the active dashboard: only pages that role uses. */
export const profileLinksByRole: Record<RoleCode, ProfileLink[]> = {
  student: [
    profileLink.profile,
    profileLink.messages,
    {
      href: "/progress",
      title: "My Progress",
      subtitle: "Streaks and milestones",
      icon: "/images/svgs/icon-tasks.svg",
    },
    {
      href: "/classes",
      title: "My classes",
      subtitle: "Join and manage live classes",
      icon: "/images/svgs/icon-dd-date.svg",
    },
  ],
  teacher: [
    profileLink.profile,
    profileLink.messages,
    {
      href: "/classes",
      title: "My classes",
      subtitle: "Your schedule and classrooms",
      icon: "/images/svgs/icon-dd-date.svg",
    },
    {
      href: "/teacher/earnings",
      title: "Earnings",
      subtitle: "Pay per class and payouts",
      icon: "/images/svgs/icon-tasks.svg",
    },
  ],
  manager: [
    profileLink.profile,
    profileLink.messages,
    {
      href: "/apps/calendar",
      title: "Academy schedule",
      subtitle: "Filter by teacher — not your personal classes",
      icon: "/images/svgs/icon-dd-date.svg",
    },
    {
      href: "/manager/payouts",
      title: "Teacher payouts",
      subtitle: "Prepare monthly payouts",
      icon: "/images/svgs/icon-tasks.svg",
    },
  ],
  admin: [
    profileLink.profile,
    {
      href: "/admin/finance/payouts",
      title: "Payout approvals",
      subtitle: "Approve and send teacher pay",
      icon: "/images/svgs/icon-tasks.svg",
    },
    {
      href: "/admin/audit",
      title: "Audit log",
      subtitle: "Security and governance events",
      icon: "/images/svgs/icon-inbox.svg",
    },
    {
      href: "/admin/platform/integrations",
      title: "Integrations",
      subtitle: "Email, Google, Stripe, LiveKit",
      icon: "/images/svgs/icon-dd-date.svg",
    },
  ],
};

