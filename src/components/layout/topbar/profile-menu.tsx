"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCalendarEvent, IconChecklist, IconInbox, IconMail, IconUserCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { NavTranslator } from "@/components/layout/nav-data";
import { getProfileLinksByRole, type ProfileLinkIcon } from "@/components/layout/topbar/header-data";

const linkIcons: Record<ProfileLinkIcon, typeof IconMail> = {
  account: IconUserCircle,
  calendar: IconCalendarEvent,
  inbox: IconInbox,
  tasks: IconChecklist,
};
import { signOutAction } from "@/features/auth";
import type { AuthSession } from "@/features/auth";

export function ProfileMenu({ actor }: { actor: AuthSession }) {
  const t = useTranslations("shell");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const roleLabel = actor.roles
    .map((role) => t(`roles.${role}`))
    .join(" · ");

  const activeLabel = t(`roles.${actor.activeRole}`);
  const profileLinks = getProfileLinksByRole(actor.activeRole, t as NavTranslator);

  return (
    <Box>
      <IconButton
        size="large"
        color="inherit"
        aria-label={t("profileMenu.ariaLabel")}
        aria-haspopup="true"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ color: open ? "primary.main" : "inherit" }}
      >
        <Avatar
          src={actor.image ?? undefined}
          alt={actor.name}
          sx={{ width: 35, height: 35 }}
        />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{ paper: { sx: { width: 360, p: 4 } } }}
      >
        <Typography variant="h5">{t("profileMenu.heading")}</Typography>

        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar
            src={actor.image ?? undefined}
            alt={actor.name}
            sx={{ width: 95, height: 95 }}
          />
          <Box minWidth={0}>
            <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
              {actor.name}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {roleLabel}
            </Typography>
            <Typography variant="subtitle2" color="primary" fontWeight={600}>
              {t("profileMenu.activeDashboard", { role: activeLabel })}
            </Typography>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              display="flex"
              alignItems="center"
              gap={1}
              noWrap
            >
              <IconMail width={15} height={15} />
              {actor.email}
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {profileLinks.map((profileLink) => (
          <Box key={profileLink.title} sx={{ py: 2 }} className="hover-text-primary">
            <Link href={profileLink.href}>
              <Stack direction="row" spacing={2}>
                <Box
                  width={45}
                  height={45}
                  bgcolor="primary.light"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  {(() => {
                    const LinkIcon = linkIcons[profileLink.icon];
                    return <LinkIcon size={24} color="var(--mui-palette-primary-main, currentColor)" aria-hidden />;
                  })()}
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="text.primary"
                    className="text-hover"
                    noWrap
                    sx={{ width: 240 }}
                  >
                    {profileLink.title}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    variant="subtitle2"
                    noWrap
                    sx={{ width: 240 }}
                  >
                    {profileLink.subtitle}
                  </Typography>
                </Box>
              </Stack>
            </Link>
          </Box>
        ))}

        <Box mt={2} component="form" action={signOutAction}>
          <Button type="submit" variant="outlined" color="primary" fullWidth>
            {t("profileMenu.signOut")}
          </Button>
        </Box>
      </Menu>
    </Box>
  );
}
