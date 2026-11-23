"use client";

import Chip from "@mui/material/Chip";
import { useTranslations } from "next-intl";
import type { MaterialKind, MaterialStatus } from "@/features/materials/types";

const kindColors: Record<
  MaterialKind,
  "default" | "primary" | "secondary" | "info" | "success" | "warning"
> = {
  document: "default",
  link: "info",
  video: "secondary",
  audio: "success",
  form: "warning",
  recording: "primary",
  practice: "success",
};

const statusColors: Record<
  MaterialStatus,
  "default" | "success" | "warning"
> = {
  draft: "warning",
  published: "success",
  archived: "default",
};

type MaterialKindChipProps = {
  kind: MaterialKind;
  size?: "small" | "medium";
};

export function MaterialKindChip({ kind, size = "small" }: MaterialKindChipProps) {
  const t = useTranslations("educator.materials");
  return (
    <Chip
      label={t(`kind.${kind}`)}
      color={kindColors[kind]}
      size={size}
      variant="outlined"
    />
  );
}

export function MaterialStatusChip({ status }: { status: MaterialStatus }) {
  const t = useTranslations("educator.materials");
  return (
    <Chip
      label={t(`status.${status}`)}
      color={statusColors[status]}
      size="small"
      variant="outlined"
    />
  );
}
