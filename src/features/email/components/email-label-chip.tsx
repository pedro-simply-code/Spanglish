"use client";

import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("apps");
  const labels: Record<EmailLabel, string> = {
    Academy: t("email.labels.academy"),
    Promotional: t("email.labels.promotional"),
    Social: t("email.labels.social"),
    Health: t("email.labels.health"),
  };
  return <Chip label={labels[label]} color={labelColor[label]} {...rest} />;
}
