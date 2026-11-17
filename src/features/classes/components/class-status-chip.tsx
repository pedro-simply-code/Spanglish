import Chip from "@mui/material/Chip";
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
  { label: string; color: ChipColor; variant: "filled" | "outlined" }
> = {
  upcoming: { label: "Upcoming", color: "primary", variant: "outlined" },
  "in-progress": { label: "In progress", color: "success", variant: "filled" },
  completed: { label: "Completed", color: "default", variant: "outlined" },
  canceled: { label: "Canceled", color: "error", variant: "outlined" },
};

export function ClassStatusChip({ status }: { status: LiveClassStatus }) {
  const meta = statusMeta[status];

  return (
    <Chip
      label={meta.label}
      color={meta.color}
      variant={meta.variant}
      size="small"
    />
  );
}
