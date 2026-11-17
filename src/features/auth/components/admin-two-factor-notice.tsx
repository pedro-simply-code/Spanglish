"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

const skipStorageKey = (userId: string) => `spanglish.admin.2fa-skip.${userId}`;

type AdminTwoFactorNoticeProps = {
  userId: string;
};

/** Shown on the admin dashboard until the admin turns on two-factor. */
export function AdminTwoFactorNotice({ userId }: AdminTwoFactorNoticeProps) {
  const t = useTranslations("adminSecurity");
  const storageKey = skipStorageKey(userId);
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    setVisible(sessionStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  function skipForNow() {
    sessionStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (visible !== true) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      sx={{
        mb: "30px",
        alignItems: "center",
        "& .MuiAlert-message": {
          textAlign: "center",
          flex: 1,
          overflow: "visible",
        },
        "& .MuiAlert-action": {
          alignItems: "center",
          pt: 0,
          pb: 0,
          mr: 0.5,
        },
      }}
      action={
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" justifyContent="flex-end">
          <Button color="inherit" size="small" onClick={skipForNow}>
            {t("skip")}
          </Button>
          <Button component={Link} href="/settings?tab=security" color="inherit" size="small" variant="outlined">
            {t("action")}
          </Button>
        </Stack>
      }
    >
      <AlertTitle>{t("title")}</AlertTitle>
      {t("body")}
    </Alert>
  );
}
