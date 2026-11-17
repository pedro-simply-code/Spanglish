"use client";

import { useCallback } from "react";
import { useSnackbar } from "notistack";

type ToastInput = {
  title?: string;
  message: string;
};

export function useAppToast() {
  const { enqueueSnackbar } = useSnackbar();

  const showSuccess = useCallback(
    ({ title, message }: ToastInput) => {
      const text = title ? `${title}: ${message}` : message;
      enqueueSnackbar(text, { variant: "success" });
    },
    [enqueueSnackbar],
  );

  const showError = useCallback(
    ({ title, message }: ToastInput) => {
      const text = title ? `${title}: ${message}` : message;
      enqueueSnackbar(text, { variant: "error" });
    },
    [enqueueSnackbar],
  );

  const showInfo = useCallback(
    ({ title, message }: ToastInput) => {
      const text = title ? `${title}: ${message}` : message;
      enqueueSnackbar(text, { variant: "info" });
    },
    [enqueueSnackbar],
  );

  return { showSuccess, showError, showInfo };
}