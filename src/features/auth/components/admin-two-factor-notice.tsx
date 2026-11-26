"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

const noopSubscribe = () => () => undefined;

const skipStorageKey = (userId: string) => `spanglish.admin.2fa-skip.${userId}`;

type AdminTwoFactorNoticeProps = {
  userId: string;
};

/** Shown on the admin dashboard until the admin turns on two-factor. */
export function AdminTwoFactorNotice({ userId }: AdminTwoFactorNoticeProps) {
  const t = useTranslations("adminSecurity");
  const storageKey = skipStorageKey(userId);
  const [skipped, setSkipped] = useState(false);
  // Read from sessionStorage in the browser only (hidden while rendering on the server).
  const skippedBefore = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(storageKey) === "1",
    () => true,
  );

  function skipForNow() {
    sessionStorage.setItem(storageKey, "1");
    setSkipped(true);
  }

  if (skipped || skippedBefore) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      sx={{ mb: "30px", "& .MuiAlert-message": { flex: 1, overflow: "visible" } }}
    >
      {/* Buttons under the text, so the notice also reads well on phones. */}
      <AlertTitle>{t("title")}</AlertTitle>
      {t("body")}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" mt={1.5}>
        <Button component={Link} href="/settings?tab=security" color="warning" size="small" variant="contained">
          {t("action")}
        </Button>
        <Button color="inherit" size="small" onClick={skipForNow}>
          {t("skip")}
        </Button>
      </Stack>
    </Alert>
  );
}
