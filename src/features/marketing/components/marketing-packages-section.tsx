"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { AcademyPlan } from "@/features/academy";
import { PackagePlanFilters } from "@/features/academy/components/package-plan-filters";
import { formatMoney, type ClassDuration, type ClassType } from "@/features/academy/data";
import { MarketingBlankCard } from "@/components/ui/marketing-blank-card";
import { LinkButton } from "@/components/ui/link-button";
import { MarketingSectionTitle } from "@/features/marketing/components/marketing-section-title";

const ctaSx = { px: 4, py: 1.5, fontSize: 16 } as const;

function PlanTeaser({ plan }: { plan: AcademyPlan }) {
  const t = useTranslations("marketing");

  return (
    <MarketingBlankCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
          <Box minWidth={0}>
            <Typography variant="h6" fontWeight={700}>
              {plan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("packages.plan.details", {
                count: plan.classes,
                type: t(plan.type === "paired" ? "packages.plan.paired" : "packages.plan.individual"),
                duration: plan.duration,
              })}
            </Typography>
          </Box>
          <Chip
            label={plan.label}
            size="small"
            color={plan.classes === 60 ? "primary" : "default"}
            variant={plan.classes === 60 ? "filled" : "outlined"}
          />
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="baseline" mt={2.5}>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {formatMoney(plan.pricePerClass)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("packages.plan.perClass")}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {t("packages.plan.total", { amount: formatMoney(plan.total) })}
          {plan.perStudentPerClass !== null
            ? ` · ${t("packages.plan.perStudent", { amount: formatMoney(plan.perStudentPerClass) })}`
            : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mt: 1.5 }}>
          {plan.description}
        </Typography>
        {plan.savings > 0 ? (
          <Chip
            label={t("packages.plan.save", { savings: plan.savings })}
            color="success"
            size="small"
            sx={{ mt: 2, alignSelf: "flex-start" }}
          />
        ) : null}
      </CardContent>
    </MarketingBlankCard>
  );
}

export type MarketingPackagesSectionProps = {
  publishedPlans: AcademyPlan[];
  /** Anchor id for in-page navigation (`/#packages` on the homepage). */
  sectionId?: string;
  showCheckoutActions?: boolean;
};

export function MarketingPackagesSection({
  publishedPlans,
  sectionId = "packages",
  showCheckoutActions = false,
}: MarketingPackagesSectionProps) {
  const t = useTranslations("marketing");
  const [packageDuration, setPackageDuration] = useState<ClassDuration>(25);
  const [packageType, setPackageType] = useState<ClassType>("one-on-one");

  const filteredPlans = useMemo(() => {
    return publishedPlans
      .filter((plan) => plan.type === packageType && plan.duration === packageDuration)
      .sort((a, b) => a.classes - b.classes);
  }, [publishedPlans, packageDuration, packageType]);

  const packageMaxSavings = useMemo(
    () => (filteredPlans.length ? Math.max(...filteredPlans.map((plan) => plan.savings)) : 0),
    [filteredPlans],
  );

  const featuredPlan = filteredPlans.find((plan) => plan.classes === 60) ?? filteredPlans[0];

  if (!publishedPlans.length) return null;

  return (
    <Box
      id={sectionId}
      sx={{
        bgcolor: { xs: "background.default", md: "background.paper" },
        py: { xs: 8, lg: 10 },
        scrollMarginTop: { xs: 120, md: 88 },
      }}
    >
      <Container maxWidth="lg">
        <MarketingSectionTitle
          eyebrow={t("packages.eyebrow")}
          title={t("packages.title")}
          subtitle={t("packages.subtitle")}
        />
        <PackagePlanFilters
          duration={packageDuration}
          classType={packageType}
          onDuration={setPackageDuration}
          onClassType={setPackageType}
          maxSavings={packageMaxSavings}
          sx={{ mt: 4 }}
        />
        <Grid container spacing={3} sx={{ mt: 4 }}>
          {filteredPlans.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, sm: 6, md: filteredPlans.length > 3 ? 3 : 4 }}>
              <PlanTeaser plan={plan} />
            </Grid>
          ))}
        </Grid>
        {filteredPlans.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={3}>
            {t("packages.empty")}
          </Typography>
        ) : null}
        {showCheckoutActions && featuredPlan ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="center"
            mt={4}
            useFlexGap
          >
            <LinkButton
              href={`/login?next=${encodeURIComponent(`/checkout?plan=${featuredPlan.id}`)}`}
              variant="contained"
              sx={ctaSx}
            >
              {t("packages.getStarted")}
            </LinkButton>
            <LinkButton
              href={`/login?next=${encodeURIComponent("/credits?tab=buy")}`}
              variant="outlined"
              color="secondary"
              sx={ctaSx}
            >
              {t("packages.fullPricing")}
            </LinkButton>
          </Stack>
        ) : null}
      </Container>
    </Box>
  );
}
