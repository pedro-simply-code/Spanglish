"use client";

import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { styled } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { SpanglishLogo } from "@/components/brand/spanglish-logo";
import { LinkButton } from "@/components/ui/link-button";
import { getMarketingHeaderNav } from "@/features/marketing/data";

const SCROLL_ELEVATION_THRESHOLD = 8;

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  justifyContent: "center",
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  transition: theme.transitions.create("box-shadow", {
    duration: theme.transitions.duration.short,
  }),
}));

const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
  width: "100%",
  paddingLeft: "0 !important",
  paddingRight: "0 !important",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  minHeight: 60,
  [theme.breakpoints.up("sm")]: {
    minHeight: 68,
  },
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    gap: theme.spacing(1),
  },
}));

const HeaderZone = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  [theme.breakpoints.up("md")]: {
    flex: "1 1 0",
  },
}));

function NavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("marketing");

  return (
    <Stack
      component="nav"
      direction="row"
      spacing={{ xs: 1.25, md: 2 }}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      justifyContent="center"
    >
      {getMarketingHeaderNav(t).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          underline="hover"
          color="text.secondary"
          fontWeight={500}
          onClick={onNavigate}
          sx={{ fontSize: { xs: "0.875rem", sm: "0.9375rem" }, whiteSpace: "nowrap" }}
        >
          {item.label}
        </Link>
      ))}
    </Stack>
  );
}

function AuthActions() {
  const t = useTranslations("marketing");

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="nowrap" useFlexGap>
      <LinkButton
        href="/login"
        variant="outlined"
        size="small"
        color="secondary"
        sx={{ whiteSpace: "nowrap", borderColor: "divider" }}
      >
        {t("common.signIn")}
      </LinkButton>
      <LinkButton href="/register" variant="contained" size="small" sx={{ whiteSpace: "nowrap" }}>
        {t("common.getStarted")}
      </LinkButton>
    </Stack>
  );
}

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_ELEVATION_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AppBarStyled position="sticky" elevation={scrolled ? 6 : 0} color="transparent">
      <Container maxWidth="lg" sx={{ py: { xs: 0.25, md: 0.5 } }}>
        <ToolbarStyled disableGutters>
          <HeaderZone
            sx={(theme) => ({
              justifyContent: "flex-start",
              [theme.breakpoints.down("md")]: {
                width: "100%",
                justifyContent: "space-between",
              },
            })}
          >
            <SpanglishLogo href="/" size="md" />
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <AuthActions />
            </Box>
          </HeaderZone>

          <HeaderZone
            sx={{
              justifyContent: "center",
              width: { xs: "100%", md: "auto" },
            }}
          >
            <NavMenu />
          </HeaderZone>

          <HeaderZone
            sx={{
              justifyContent: "flex-end",
              display: { xs: "none", md: "flex" },
            }}
          >
            <AuthActions />
          </HeaderZone>
        </ToolbarStyled>
      </Container>
    </AppBarStyled>
  );
}
