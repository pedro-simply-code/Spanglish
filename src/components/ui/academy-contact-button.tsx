"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { IconMail } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buildAcademyComposeUrl, type AcademyContactInput } from "@/lib/academy-contact";

type AcademyContactButtonProps = AcademyContactInput & {
  "aria-label"?: string;
};

export function AcademyContactButton({
  to,
  recipientName,
  fromName,
  topic,
  "aria-label": ariaLabel,
}: AcademyContactButtonProps) {
  const t = useTranslations("shell");
  const href = buildAcademyComposeUrl({ to, recipientName, fromName, topic });
  return (
    <Tooltip title={t("contact.tooltip")}>
      <IconButton
        component={Link}
        href={href}
        size="small"
        aria-label={ariaLabel ?? t("contact.ariaLabel", { name: recipientName })}
      >
        <IconMail size={18} />
      </IconButton>
    </Tooltip>
  );
}