/** Static product rules (not stored in the database yet). */

type Translator = (key: string, values?: Record<string, string | number>) => string;

export const individualRules = (t: Translator) => [
  {
    id: "credits",
    title: t("commerce.rules.individual.credits.title"),
    detail: t("commerce.rules.individual.credits.detail"),
  },
  {
    id: "booking",
    title: t("commerce.rules.individual.booking.title"),
    detail: t("commerce.rules.individual.booking.detail"),
  },
  {
    id: "payout",
    title: t("commerce.rules.payout.title"),
    detail: t("commerce.rules.payout.detail"),
  },
];

export const pairedRules = (t: Translator) => [
  {
    id: "credits",
    title: t("commerce.rules.paired.credits.title"),
    detail: t("commerce.rules.paired.credits.detail"),
  },
  {
    id: "booking",
    title: t("commerce.rules.paired.booking.title"),
    detail: t("commerce.rules.paired.booking.detail"),
  },
  {
    id: "payout",
    title: t("commerce.rules.payout.title"),
    detail: t("commerce.rules.paired.payout.detail"),
  },
];

export const adminQuickActions = (t: Translator) => [
  {
    id: "commerce-packages",
    title: t("common.quickActions.editPackages"),
    href: "/admin/commerce/packages",
    section: t("common.section.commerce"),
  },
  {
    id: "finance-payouts",
    title: t("common.quickActions.approvePayouts"),
    href: "/admin/finance/payouts",
    section: t("common.section.finance"),
  },
  {
    id: "org-users",
    title: t("common.quickActions.reviewUsers"),
    href: "/admin/organization/users",
    section: t("common.section.organization"),
  },
  {
    id: "finance-ledger",
    title: t("common.page.ledger"),
    href: "/admin/finance/ledger",
    section: t("common.section.finance"),
  },
  {
    id: "platform-security",
    title: t("common.page.security"),
    href: "/admin/platform/security",
    section: t("common.section.platform"),
  },
  {
    id: "audit-log",
    title: t("common.page.audit"),
    href: "/admin/audit",
    section: t("common.section.compliance"),
  },
];
