"use client";

import { useTransition } from "react";
import Button from "@mui/material/Button";
import { switchDashboardAction } from "@/features/auth";
import type { RoleCode } from "@/features/auth";

type SwitchRoleButtonProps = {
  role: RoleCode;
  label: string;
};

/**
 * Switches the active dashboard from a staff surface. The server action checks
 * that the account owns the role before redirecting.
 */
export function SwitchRoleButton({ role, label }: SwitchRoleButtonProps) {
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
      {label}
    </Button>
  );
}
