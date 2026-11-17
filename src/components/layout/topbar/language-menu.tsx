"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { defaultLanguage, languages } from "@/components/layout/topbar/header-data";
import { setLocaleAction } from "@/features/auth";

/** Switches the UI language and saves it on the profile. */
export function LanguageMenu() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const currentLanguage =
    languages.find((language) => language.value === locale) ?? defaultLanguage;

  const choose = (value: string) => {
    setAnchorEl(null);
    if (value === locale || (value !== "en" && value !== "es")) return;
    startTransition(async () => {
      await setLocaleAction(value);
      router.refresh();
    });
  };

  return (
    <>
      <IconButton
        aria-label={t("label")}
        aria-haspopup="true"
        disabled={pending}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ color: open ? "primary.main" : "text.secondary" }}
      >
        <Avatar
          src={currentLanguage.icon}
          alt={currentLanguage.label}
          sx={{ width: 20, height: 20 }}
        />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{ paper: { sx: { width: 200 } } }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.value}
            selected={language.value === locale}
            sx={{ py: 2, px: 3 }}
            onClick={() => choose(language.value)}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={language.icon} alt={language.label} sx={{ width: 20, height: 20 }} />
              <Typography>{language.label}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
