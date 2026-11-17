"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { IconMail } from "@tabler/icons-react";
import Link from "next/link";
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
  const href = buildAcademyComposeUrl({ to, recipientName, fromName, topic });
  return (
    <Tooltip title="Contact via email app">
      <IconButton
        component={Link}
        href={href}
        size="small"
        aria-label={ariaLabel ?? `Email ${recipientName}`}
      >
        <IconMail size={18} />
      </IconButton>
    </Tooltip>
  );
}