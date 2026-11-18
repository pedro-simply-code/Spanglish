"use client";

import type { ReactNode } from "react";
import { SnackbarProvider, closeSnackbar } from "notistack";
import IconButton from "@mui/material/IconButton";
import { IconX } from "@tabler/icons-react";

type AppSnackbarProviderProps = {
  children: ReactNode;
  /** Rendered above every LocaleProvider, so the label defaults to English. */
  dismissLabel?: string;
};

export function AppSnackbarProvider({
  children,
  dismissLabel = "Dismiss notification",
}: AppSnackbarProviderProps) {
  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={4500}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      action={(snackbarId) => (
        <IconButton
          size="small"
          aria-label={dismissLabel}
          onClick={() => closeSnackbar(snackbarId)}
          sx={{ color: "inherit" }}
        >
          <IconX size={16} />
        </IconButton>
      )}
    >
      {children}
    </SnackbarProvider>
  );
}
