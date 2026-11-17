"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

/** Matches AppShell layout footprint during SessionShell suspense (no i18n). */
export function DashboardShellFallback() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          display: { xs: "none", lg: "block" },
          width: 270,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          p: 3,
        }}
      >
        <Skeleton variant="rounded" width={38} height={38} />
        <Skeleton variant="rounded" height={220} sx={{ mt: 4 }} />
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Skeleton variant="rectangular" height={64} sx={{ flexShrink: 0 }} />
        <Box sx={{ flexGrow: 1, px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
          <Skeleton variant="rounded" height={140} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={320} />
        </Box>
        <Box sx={{ px: 3, py: 2, textAlign: "center" }}>
          <Skeleton variant="text" width={280} sx={{ mx: "auto" }} />
        </Box>
      </Box>
    </Box>
  );
}