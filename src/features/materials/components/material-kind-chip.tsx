import Chip from "@mui/material/Chip";
import { materialKindLabels } from "@/features/materials/data";
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
  return (
    <Chip
      label={materialKindLabels[kind]}
      color={kindColors[kind]}
      size={size}
      variant="outlined"
    />
  );
}

export function MaterialStatusChip({ status }: { status: MaterialStatus }) {
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={statusColors[status]}
      size="small"
      variant="outlined"
    />
  );
}
