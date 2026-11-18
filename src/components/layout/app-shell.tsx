"use client";

import Link from "next/link";
import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { AuthSession, DashboardOption } from "@/features/auth";
import type { InboxNotificationItem } from "@/server/messages/mailbox";

type AppShellProps = {
  actor: AuthSession;
  dashboardOptions: readonly DashboardOption[];
  inboxNotifications: InboxNotificationItem[];
  unreadInboxCount: number;
  children: React.ReactNode;
};

export function AppShell({
  actor,
  dashboardOptions,
  inboxNotifications,
  unreadInboxCount,
  children,
}: AppShellProps) {
  const t = useTranslations("shell");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const handleMenuClick = () => {
    if (isDesktop) {
      setCollapsed((value) => !value);
      return;
    }

    setMobileOpen(true);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        actor={actor}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Topbar
          actor={actor}
          dashboardOptions={dashboardOptions}
          inboxNotifications={inboxNotifications}
          unreadInboxCount={unreadInboxCount}
          onMenuClick={handleMenuClick}
        />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3 } }}>
            {children}
          </Container>
        </Box>
        <Box
          component="footer"
          sx={{
            px: 3,
            py: 2,
            textAlign: "center",
            fontSize: 13,
            color: "text.secondary",
          }}
        >
          <Link href="/">Spanglish</Link> · {t("footer.tagline")}
        </Box>
      </Box>
    </Box>
  );
}
