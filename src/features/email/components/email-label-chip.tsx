import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import type { EmailLabel } from "@/features/email/types";

const labelColor: Record<EmailLabel, "primary" | "secondary" | "success" | "default"> = {
  Academy: "default",
  Promotional: "primary",
  Social: "secondary",
  Health: "success",
};

type EmailLabelChipProps = Omit<ChipProps, "color" | "label"> & {
  label: EmailLabel;
};

export function EmailLabelChip({ label, ...rest }: EmailLabelChipProps) {
  return <Chip label={label} color={labelColor[label]} {...rest} />;
}
