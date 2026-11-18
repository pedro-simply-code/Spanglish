"use client";

import { useTransition } from "react";
import Button from "@mui/material/Button";
import { useTranslations } from "next-intl";
import { switchDashboardAction } from "@/features/auth";
import type { RoleCode } from "@/features/auth";

type SwitchRoleButtonProps = {
  role: RoleCode;
  /** Optional override; by default the localized role dashboard label is used. */
  label?: string;
};

/**
 * Switches the active dashboard from a staff surface. The server action checks
 * that the account owns the role before redirecting.
 */
export function SwitchRoleButton({ role, label }: SwitchRoleButtonProps) {
  const t = useTranslations("educator.shell.roles");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="small"
      variant="outlined"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void switchDashboardAction(role);
        });
      }}
    >
      {label ?? t(`${role}Dashboard`)}
    </Button>
  );
}
