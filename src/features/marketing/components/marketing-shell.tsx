"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingHeader } from "@/features/marketing/components/marketing-header";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <MarketingHeader />
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      <MarketingFooter />
    </Box>
  );
}