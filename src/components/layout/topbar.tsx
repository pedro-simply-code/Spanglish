"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { IconMenu2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { DashboardSwitcher } from "@/components/layout/topbar/dashboard-switcher";
import { LanguageMenu } from "@/components/layout/topbar/language-menu";
import { Navigation } from "@/components/layout/topbar/navigation";
import { NotificationsMenu } from "@/components/layout/topbar/notifications-menu";
import { ProfileMenu } from "@/components/layout/topbar/profile-menu";
import { SearchMenu } from "@/components/layout/topbar/search-dialog";
import type { AuthSession, DashboardOption } from "@/features/auth";
import type { InboxNotificationItem } from "@/server/messages/mailbox";

type TopbarProps = {
  actor: AuthSession;
  dashboardOptions: readonly DashboardOption[];
  inboxNotifications: InboxNotificationItem[];
  unreadInboxCount: number;
  onMenuClick: () => void;
};

export function Topbar({
  actor,
  dashboardOptions,
  inboxNotifications,
  unreadInboxCount,
  onMenuClick,
}: TopbarProps) {
  const t = useTranslations("shell");

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 70 }, px: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 1.5 } }}>
        <IconButton
          color="inherit"
          aria-label={t("topbar.toggleSidebar")}
          onClick={onMenuClick}
          edge="start"
        >
          <IconMenu2 size={20} />
        </IconButton>

        <SearchMenu activeRole={actor.activeRole} />

        <Box sx={{ display: { xs: "none", lg: "flex" } }}>
          <Navigation activeRole={actor.activeRole} />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <DashboardSwitcher
              options={dashboardOptions}
              activeRole={actor.activeRole}
            />
          </Box>
          <LanguageMenu />
          <NotificationsMenu inboxItems={inboxNotifications} unreadCount={unreadInboxCount} />
          <Divider orientation="vertical" flexItem sx={{ my: 1.75, mx: 0.5 }} />
          <ProfileMenu actor={actor} />
        </Stack>
      </Toolbar>

      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          alignItems: "center",
          gap: 1,
          px: 2,
          pb: 1.5,
          overflowX: "auto",
        }}
      >
        <DashboardSwitcher
          options={dashboardOptions}
          activeRole={actor.activeRole}
        />
      </Box>
    </Box>
  );
}
