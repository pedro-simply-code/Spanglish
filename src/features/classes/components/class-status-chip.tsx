"use client";

import Chip from "@mui/material/Chip";
import { useTranslations } from "next-intl";
import type { LiveClassStatus } from "@/features/classes/types";

type ChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

const statusMeta: Record<
  LiveClassStatus,
  { color: ChipColor; variant: "filled" | "outlined" }
> = {
  upcoming: { color: "primary", variant: "outlined" },
  "in-progress": { color: "success", variant: "filled" },
  completed: { color: "default", variant: "outlined" },
  canceled: { color: "error", variant: "outlined" },
};

export function ClassStatusChip({ status }: { status: LiveClassStatus }) {
  const t = useTranslations("student");
  const meta = statusMeta[status];
  const labels: Record<LiveClassStatus, string> = {
    upcoming: t("status.upcoming"),
    "in-progress": t("status.inProgress"),
    completed: t("status.completed"),
    canceled: t("status.canceled"),
  };

  return (
    <Chip
      label={labels[status]}
      color={meta.color}
      variant={meta.variant}
      size="small"
    />
  );
}
