"use client";

import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppSnackbarProvider } from "@/components/ui/app-snackbar";
import { theme } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppSnackbarProvider>{children}</AppSnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
