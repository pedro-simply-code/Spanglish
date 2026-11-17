import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconMail, IconWorld } from "@tabler/icons-react";
import { SpanglishLogo } from "@/components/brand/spanglish-logo";
import { LinkButton } from "@/components/ui/link-button";
import {
  marketingAcademyTimezoneLabel,
  marketingFooterAcademy,
  marketingFooterExplore,
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
                Live Spanish classes with native teachers from Guatemala — individual or paired sessions,
                classroom recordings, and learning materials on one academy platform.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <IconWorld size={18} stroke={1.5} />
                <Typography variant="body2">Teachers in · {marketingAcademyTimezoneLabel}</Typography>
              </Stack>
              <LinkButton href="/register" variant="contained" size="small" sx={{ px: 3 }}>
                Get started free
              </LinkButton>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FooterColumn title="Explore">
              <Stack spacing={0.5}>
                {marketingFooterExplore.map((item) => (
                  <FooterLink key={item.href} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </Stack>
            </FooterColumn>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FooterColumn title="Academy">
              <Stack spacing={0.5}>
                {marketingFooterAcademy.map((item) => (
                  <FooterLink key={item.href} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </Stack>
            </FooterColumn>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FooterColumn title="Hours & support">
              <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                <strong>Mon – Thu</strong> · 6:00 AM – 10:00 PM
                <br />
                <strong>Fri</strong> · 6:00 AM – 8:00 PM
                <br />
                <strong>Sat</strong> · 8:00 AM – 12:00 PM
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start" mt={1}>
                <Box color="primary.main" pt={0.25}>
                  <IconMail size={18} stroke={1.5} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Questions after sign-in? Use <strong>Email</strong> in your dashboard to reach the academy team.
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
            © {year} Spanglish Academy. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center" useFlexGap>
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
            <FooterLink href="/register">Register</FooterLink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}