"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconMail, IconWorld } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SpanglishLogo } from "@/components/brand/spanglish-logo";
import { LinkButton } from "@/components/ui/link-button";
import {
  getMarketingAcademyTimezoneLabel,
  getMarketingFooterAcademy,
  getMarketingFooterExplore,
} from "@/features/marketing/data";

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={2} alignItems={{ xs: "center", sm: "flex-start" }} textAlign={{ xs: "center", sm: "left" }}>
      <Typography
        fontSize={13}
        textTransform="uppercase"
        fontWeight={600}
        letterSpacing="0.06em"
        color="primary.main"
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      underline="hover"
      color="text.secondary"
      fontSize={15}
      fontWeight={500}
      sx={{ display: "block", py: 0.25 }}
    >
      {children}
    </Link>
  );
}

export function MarketingFooter() {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 0,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        boxShadow: (theme) => theme.shadows[1],
      }}
    >
      <Container maxWidth="lg" sx={{ pt: { xs: 6, lg: 8 }, pb: 4 }}>
        <Grid container spacing={{ xs: 5, md: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2} alignItems={{ xs: "center", md: "flex-start" }} textAlign={{ xs: "center", md: "left" }}>
              <SpanglishLogo href="/" size="lg" />
              <Typography fontSize={15} color="text.secondary" lineHeight={1.7} maxWidth={340}>
                {t("footer.description")}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <IconWorld size={18} stroke={1.5} />
                <Typography variant="body2">
                  {t("footer.timezone", { timezone: getMarketingAcademyTimezoneLabel(t) })}
                </Typography>
              </Stack>
              <LinkButton href="/register" variant="contained" size="small" sx={{ px: 3 }}>
                {t("footer.getStartedFree")}
              </LinkButton>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FooterColumn title={t("footer.exploreTitle")}>
              <Stack spacing={0.5}>
                {getMarketingFooterExplore(t).map((item) => (
                  <FooterLink key={item.href} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </Stack>
            </FooterColumn>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FooterColumn title={t("footer.academyTitle")}>
              <Stack spacing={0.5}>
                {getMarketingFooterAcademy(t).map((item) => (
                  <FooterLink key={item.href} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </Stack>
            </FooterColumn>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FooterColumn title={t("footer.hoursTitle")}>
              <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                <strong>{t("landing.hours.monThu")}</strong> · {t("landing.hours.monThuTime")}
                <br />
                <strong>{t("landing.hours.friday")}</strong> · {t("landing.hours.fridayTime")}
                <br />
                <strong>{t("landing.hours.saturday")}</strong> · {t("landing.hours.saturdayTime")}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start" mt={1}>
                <Box color="primary.main" pt={0.25}>
                  <IconMail size={18} stroke={1.5} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t.rich("footer.supportQuestion", {
                    email: (chunks) => <strong>{chunks}</strong>,
                  })}
                </Typography>
              </Stack>
            </FooterColumn>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "center", sm: "center" }}
          textAlign={{ xs: "center", sm: "left" }}
        >
          <Typography fontSize={14} color="text.secondary">
            {t("footer.copyright", { year })}
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center" useFlexGap>
            <FooterLink href="/">{t("footer.home")}</FooterLink>
            <FooterLink href="/login">{t("common.signIn")}</FooterLink>
            <FooterLink href="/register">{t("common.register")}</FooterLink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
