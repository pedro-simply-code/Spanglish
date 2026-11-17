"use client";

import type { ReactNode } from "react";
import { SnackbarProvider, closeSnackbar } from "notistack";
import IconButton from "@mui/material/IconButton";
import { IconX } from "@tabler/icons-react";

export function AppSnackbarProvider({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={4500}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      action={(snackbarId) => (
        <IconButton
          size="small"
          aria-label="Dismiss notification"
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