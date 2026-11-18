"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  IconCalendarEvent,
  IconClock,
  IconHeadset,
  IconLanguage,
  IconRocket,
  IconShieldCheck,
  IconUsers,
  IconVideo,
  IconWand,
} from "@tabler/icons-react";
import { MarketingBlankCard } from "@/components/ui/marketing-blank-card";
import { LinkButton } from "@/components/ui/link-button";
import {
  getMarketingAcademyHours,
  getMarketingAcademyTimezoneLabel,
  getMarketingAcademyTimezoneShort,
  getMarketingHeroImageAlt,
  getMarketingPillars,
  getMarketingTestimonials,
  getMarketingTracks,
  marketingHeroImageSrc,
  type MarketingLandingSnapshot,
  type MarketingTrack,
} from "@/features/marketing/data";
import { MarketingPackagesSection } from "@/features/marketing/components/marketing-packages-section";
import { MarketingSectionTitle } from "@/features/marketing/components/marketing-section-title";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";

const ctaSx = { px: 4, py: 1.5, fontSize: 16 } as const;

const pillarIcons = [
  <IconVideo key="live" size={40} strokeWidth={1.5} />,
  <IconUsers key="paired" size={40} strokeWidth={1.5} />,
  <IconCalendarEvent key="flex" size={40} strokeWidth={1.5} />,
  <IconHeadset key="rec" size={40} strokeWidth={1.5} />,
  <IconWand key="mat" size={40} strokeWidth={1.5} />,
  <IconShieldCheck key="sec" size={40} strokeWidth={1.5} />,
];

function HeroVisual({ alt }: { alt: string }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 520,
        mx: { xs: "auto", lg: 0 },
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: (theme) => theme.shadows[10],
        aspectRatio: { xs: "16 / 10", lg: "5 / 4" },
        maxHeight: { xs: 260, sm: 340, lg: 400 },
        bgcolor: "action.hover",
      }}
    >
      <Image
        key={marketingHeroImageSrc}
        src={marketingHeroImageSrc}
        alt={alt}
        fill
        priority
        sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 520px"
        style={{ objectFit: "cover", objectPosition: "center 35%" }}
      />
    </Box>
  );
}

function TrackPanel({ track }: { track: MarketingTrack }) {
  const t = useTranslations("marketing");

  return (
    <Box sx={{ pt: 3 }}>
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {track.title}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip
              size="small"
              label={t("landing.programs.sessionsChip", { length: track.sessionLength })}
              variant="outlined"
            />
            <Chip size="small" label={track.audience} variant="outlined" />
          </Stack>
          <Typography variant="body1" color="text.secondary" lineHeight={1.75}>
            {track.summary}
          </Typography>
          {track.id === "teachers" ? (
            <Stack direction="row" spacing={1} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
              <LinkButton href="/register" variant="contained" sx={ctaSx}>
                {t("common.createAccount")}
              </LinkButton>
              <LinkButton href="/login?next=%2Fapply" variant="outlined" sx={ctaSx}>
                {t("landing.programs.teacherCta")}
              </LinkButton>
            </Stack>
          ) : (
            <LinkButton href="/register" variant="contained" sx={{ mt: 3, ...ctaSx }}>
              {t("landing.programs.learnerCta")}
            </LinkButton>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <MarketingBlankCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                {t("landing.programs.expectTitle")}
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconVideo size={18} />
                  <Typography variant="body2">{t("landing.programs.expectLive")}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconCalendarEvent size={18} />
                  <Typography variant="body2">{t("landing.programs.expectSchedule")}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconHeadset size={18} />
                  <Typography variant="body2">{t("landing.programs.expectRecordings")}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </MarketingBlankCard>
        </Grid>
      </Grid>
    </Box>
  );
}

const testimonialAvatars = [
  "/images/profile/user-2.jpg",
  "/images/profile/user-5.jpg",
  "/images/profile/user-7.jpg",
] as const;

export function MarketingLanding({ snapshot }: { snapshot: MarketingLandingSnapshot }) {
  const t = useTranslations("marketing");
  const tracks = getMarketingTracks(t);
  const pillars = getMarketingPillars(t);
  const testimonials = getMarketingTestimonials(t);
  const academyHours = getMarketingAcademyHours(t);
  const timezoneLabel = getMarketingAcademyTimezoneLabel(t);
  const timezoneShort = getMarketingAcademyTimezoneShort(t);
  const heroImageAlt = getMarketingHeroImageAlt(t);
  const [trackId, setTrackId] = useState(tracks[0]!.id);
  const track = useMemo(
    () => tracks.find((item) => item.id === trackId) ?? tracks[0]!,
    [tracks, trackId],
  );

  useEffect(() => {
    if (window.location.hash !== "#packages") return;
    const target = document.getElementById("packages");
    if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <MarketingShell>
      <Box mb={10} sx={{ overflow: "hidden" }}>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, lg: 8 } }}>
          <Grid container spacing={3} alignItems={{ xs: "flex-start", lg: "center" }}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="h6" display="flex" gap={1} alignItems="center" mb={2} color="text.secondary">
                <Box component="span" color="secondary.main" display="flex">
                  <IconRocket size={21} />
                </Box>
                {t("landing.hero.eyebrow")}
              </Typography>
              <Typography
                variant="h1"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "2.35rem", md: "3.25rem" },
                  lineHeight: { xs: 1.15, md: 1.1 },
                }}
              >
                {t.rich("landing.hero.title", {
                  highlight: (chunks) => (
                    <Typography component="span" variant="inherit" color="primary">
                      {chunks}
                    </Typography>
                  ),
                })}
              </Typography>
              <Typography variant="h5" fontWeight={300} color="text.secondary" sx={{ mt: 2, maxWidth: 520 }}>
                {t("landing.hero.subtitle")}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
                <Chip icon={<IconVideo size={16} />} label={t("landing.hero.chipLive")} variant="outlined" />
                <Chip icon={<IconUsers size={16} />} label={t("landing.hero.chipNative")} variant="outlined" />
                <Chip icon={<IconLanguage size={16} />} label={t("landing.hero.chipSpanishOnly")} variant="outlined" />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={4}>
                <LinkButton href="/register" variant="contained" color="primary" sx={ctaSx}>
                  {t("landing.hero.primaryCta")}
                </LinkButton>
                <LinkButton href="/#packages" variant="outlined" color="secondary" sx={ctaSx}>
                  {t("common.viewPricing")}
                </LinkButton>
              </Stack>
            </Grid>
            <Grid
              size={{ xs: 12, lg: 6 }}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", lg: "flex-end" },
                mt: { xs: 2, lg: 0 },
              }}
            >
              <HeroVisual alt={heroImageAlt} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="testimonials" sx={{ pt: { xs: 6, lg: 10 }, pb: { xs: 8, lg: 11 } }}>
        <Container maxWidth="lg">
          <MarketingSectionTitle
            eyebrow={t("landing.testimonials.eyebrow")}
            title={t("landing.testimonials.title")}
          />
          <Grid container spacing={3} sx={{ mt: 5 }}>
            {testimonials.map((item, index) => (
              <Grid key={item.name} size={{ xs: 12, md: 4 }}>
                <MarketingBlankCard sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 3, height: "100%" }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={testimonialAvatars[index] ?? testimonialAvatars[0]} alt="" />
                      <Box flex={1}>
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          {item.role}
                        </Typography>
                      </Box>
                      <Rating size="small" value={5} readOnly />
                    </Stack>
                    <Typography color="text.secondary" mt={3} fontSize={15} lineHeight={1.75}>
                      {item.quote}
                    </Typography>
                  </CardContent>
                </MarketingBlankCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box
        id="programs"
        sx={{
          bgcolor: "action.hover",
          py: { xs: 8, lg: 12 },
        }}
      >
        <Container maxWidth="lg">
          <MarketingSectionTitle
            eyebrow={t("landing.programs.eyebrow")}
            title={t("landing.programs.title")}
            subtitle={t("landing.programs.subtitle")}
          />
          <Tabs
            value={trackId}
            onChange={(_event, value: string) => setTrackId(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ mt: 4, borderBottom: 1, borderColor: "divider" }}
          >
            {tracks.map((item) => (
              <Tab key={item.id} value={item.id} label={item.title} />
            ))}
          </Tabs>
          <TrackPanel track={track} />
        </Container>
      </Box>

      <Box id="features" py={{ xs: 8, lg: 10 }}>
        <Container maxWidth="lg">
          <MarketingSectionTitle
            eyebrow={t("landing.features.eyebrow")}
            title={t("landing.features.title")}
            subtitle={t("landing.features.subtitle")}
          />
          <Grid container spacing={3} sx={{ mt: 6 }}>
            {pillars.map((pillar, index) => (
              <Grid key={pillar.title} size={{ xs: 12, sm: 6, lg: 4 }} textAlign="center">
                <Box color="primary.main">{pillarIcons[index] ?? pillarIcons[0]}</Box>
                <Typography variant="h5" mt={2}>
                  {pillar.title}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" mt={1}>
                  {pillar.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <MarketingPackagesSection publishedPlans={snapshot.publishedPlans} sectionId="packages" />

      <Box sx={{ pt: 4, pb: { xs: 8, lg: 10 } }}>
        <Container maxWidth="lg">
          <MarketingBlankCard
            sx={{
              backgroundImage: "url('/images/landingpage/shape/line-bg.svg')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center top",
              backgroundSize: "cover",
            }}
          >
            <CardContent sx={{ py: { xs: 3.5, md: 4.5 }, px: { xs: 3, md: 4 } }}>
              <Grid container spacing={{ xs: 3, md: 0 }} alignItems="stretch">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {t("landing.help.title")}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" mt={1.5} lineHeight={1.75} maxWidth={480}>
                    {t("landing.help.description")}
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={3} useFlexGap>
                    <LinkButton href="/register" variant="contained" sx={ctaSx}>
                      {t("landing.hero.primaryCta")}
                    </LinkButton>
                    <LinkButton
                      href="/#packages"
                      variant="outlined"
                      color="secondary"
                      sx={{ bgcolor: "background.paper", ...ctaSx }}
                    >
                      {t("common.viewPricing")}
                    </LinkButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    {t("landing.help.timezoneNote", { timezone: timezoneLabel })}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box
                    sx={(theme) => ({
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      pl: { md: 4 },
                      pt: { xs: 2, md: 0 },
                      borderTop: { xs: "1px solid", md: "none" },
                      borderLeft: { md: "1px solid" },
                      borderColor: "divider",
                      [theme.breakpoints.up("md")]: {
                        ml: 1,
                      },
                    })}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={2}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 1,
                          bgcolor: "primary.light",
                          color: "primary.main",
                        }}
                      >
                        <IconClock size={22} stroke={1.5} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {t("landing.help.hoursTitle")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {timezoneShort}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      component="ul"
                      spacing={1.25}
                      sx={{ m: 0, p: 0, listStyle: "none" }}
                    >
                      {academyHours.map((row) => (
                        <Stack
                          key={row.days}
                          component="li"
                          direction="row"
                          justifyContent="space-between"
                          alignItems="baseline"
                          spacing={2}
                        >
                          <Typography variant="body2" fontWeight={600} component="span">
                            {row.days}
                          </Typography>
                          <Typography
                            variant="body2"
                            color={row.closed ? "text.disabled" : "text.secondary"}
                            component="span"
                            textAlign="right"
                          >
                            {row.hours}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </MarketingBlankCard>
        </Container>
      </Box>

      <Box bgcolor="primary.main" sx={{ pt: { xs: 6, lg: 8 }, pb: { xs: 5, lg: 6 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center" justifyContent="space-between">
            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="h2" color="background.paper" fontWeight={700} sx={{ fontSize: { xs: "1.75rem", lg: "2.25rem" } }}>
                {t("landing.finalCta.title")}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                <LinkButton
                  href="/register"
                  variant="contained"
                  color="inherit"
                  sx={{ bgcolor: "background.paper", color: "primary.main", "&:hover": { bgcolor: "grey.100" }, ...ctaSx }}
                >
                  {t("common.register")}
                </LinkButton>
                <LinkButton
                  href="/login"
                  variant="outlined"
                  sx={{
                    borderColor: "background.paper",
                    color: "background.paper",
                    "&:hover": { bgcolor: "background.paper", color: "primary.main" },
                    ...ctaSx,
                  }}
                >
                  {t("common.signIn")}
                </LinkButton>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }} sx={{ textAlign: { xs: "center", lg: "right" } }}>
              <Image
                src="/images/landingpage/background/c2a.png"
                alt=""
                width={320}
                height={320}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </MarketingShell>
  );
}
