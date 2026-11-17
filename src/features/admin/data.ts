/** Static product rules (not stored in the database yet). */

export const individualRules = [
  {
    id: "credits",
    title: "Personal credit wallet",
    detail: "Credits belong to the student; each booked class spends one credit from their balance.",
  },
  {
    id: "booking",
    title: "Student books alone",
    detail: "Only that student is on the class roster. Reschedules apply immediately.",
  },
  {
    id: "payout",
    title: "Teacher pay (revenue share)",
    detail:
      "Per delivered class: credit purchase value × teacher share for their level. Platform take % falls as they level up — edit under Finance → Teacher pay rates. Trials use a reference credit value and trial %.",
  },
];

export const pairedRules = [
  {
    id: "credits",
    title: "Shared credit pool",
    detail: "One package pays for the pair; each booked class spends one credit from the pool.",
  },
  {
    id: "booking",
    title: "Either partner may book",
    detail: "The other receives email; reschedules need accept or 24h timeout keeps the slot.",
  },
  {
    id: "payout",
    title: "Teacher pay (revenue share)",
    detail:
      "One credit leaves the shared pool per paired class delivered. Pay = that credit’s average purchase value × the teacher’s share by level — same platform-take table as individual (Finance → Teacher pay rates). No separate paired multiplier.",
  },
];

export const adminQuickActions = [
  { id: "commerce-packages", title: "Edit packages", href: "/admin/commerce/packages", section: "Commerce" },
  { id: "finance-payouts", title: "Approve payouts", href: "/admin/finance/payouts", section: "Finance" },
  { id: "org-users", title: "Review users", href: "/admin/organization/users", section: "Organization" },
  { id: "finance-ledger", title: "Credit ledger", href: "/admin/finance/ledger", section: "Finance" },
  { id: "platform-security", title: "Security policy", href: "/admin/platform/security", section: "Platform" },
  { id: "audit-log", title: "Audit log", href: "/admin/audit", section: "Compliance" },
];