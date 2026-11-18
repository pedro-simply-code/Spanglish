"use client";

import type { ComponentType } from "react";
import { useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import CircularProgress from "@mui/material/CircularProgress";
import {
  IconChalkboard,
  IconSchool,
  IconShield,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { switchDashboardAction } from "@/features/auth";
import type { DashboardOption, RoleCode } from "@/features/auth";

const roleIcons: Record<RoleCode, ComponentType<{ size?: number }>> = {
  student: IconSchool,
  teacher: IconChalkboard,
  manager: IconUsersGroup,
  admin: IconShield,
};

type DashboardSwitcherProps = {
  options: readonly DashboardOption[];
  activeRole: RoleCode;
};

/**
 * One button per role the account owns. The server action validates the role,
 * persists it in the session and in the dashboard preference cookie, then
 * redirects to that role's dashboard. Only one dashboard is ever visible.
 */
export function DashboardSwitcher({
  options,
  activeRole,
}: DashboardSwitcherProps) {
  const t = useTranslations("shell");
  const [pending, startTransition] = useTransition();

  return (
    <ButtonGroup
      size="small"
      variant="outlined"
      aria-label={t("topbar.switchDashboard")}
      sx={{ flexShrink: 0 }}
    >
      {options.map((option) => {
        const Icon = roleIcons[option.role];
        const active = option.role === activeRole;

        return (
          <Button
            key={option.role}
            variant={active ? "contained" : "outlined"}
            aria-pressed={active}
            title={t(`dashboards.${option.role}`)}
            disabled={pending}
            onClick={() => {
              if (active) return;

              startTransition(() => {
                void switchDashboardAction(option.role);
              });
            }}
            startIcon={
              pending && !active ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Icon size={16} />
              )
            }
            sx={{ px: { xs: 1, sm: 1.5 }, minWidth: 0 }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              {t(`roles.${option.role}`)}
            </Box>
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
