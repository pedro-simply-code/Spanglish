"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChartLine,
  IconCheck,
  IconHeadset,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { PackagePlanFilters } from "@/features/academy/components/package-plan-filters";
import { formatMoney, selectPlanByChoice } from "@/features/academy/data";
import { classTypeLabel } from "@/lib/class-type-label";
import type {
  AcademyPlan,
  ClassDuration,
  ClassType,
  PackageSize,
} from "@/features/academy/data";

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const included = [
  {
    titleKey: "pricing.included.teachers.title",
    descriptionKey: "pricing.included.teachers.description",
    icon: <IconUser size={22} />,
  },
  {
    titleKey: "pricing.included.scheduling.title",
    descriptionKey: "pricing.included.scheduling.description",
    icon: <IconCalendarEvent size={22} />,
  },
  {
    titleKey: "pricing.included.reports.title",
    descriptionKey: "pricing.included.reports.description",
    icon: <IconChartLine size={22} />,
  },
  {
    titleKey: "pricing.included.recordings.title",
    descriptionKey: "pricing.included.recordings.description",
    icon: <IconHeadset size={22} />,
  },
];

const planNameKeys: Record<string, string> = {
  "paired-30": "pricing.plan.name.pairedStarter",
  "paired-60": "pricing.plan.name.pairedProgress",
  "paired-90": "pricing.plan.name.pairedFluency",
  "one-on-one-30": "pricing.plan.name.starterSupport",
  "one-on-one-60": "pricing.plan.name.steadyProgress",
  "one-on-one-90": "pricing.plan.name.fluencyBuilder",
};

const planLabelKeys: Record<number, string> = {
  30: "pricing.plan.label.starter",
  60: "pricing.plan.label.popular",
  90: "pricing.plan.label.value",
};

const planDescriptionKeys: Record<number, string> = {
  30: "pricing.plan.description.light",
  60: "pricing.plan.description.steady",
  90: "pricing.plan.description.fluency",
};

function planName(t: StudentTranslator, plan: AcademyPlan) {
  return t(planNameKeys[`${plan.type}-${plan.classes}`] as StudentKey);
}

function planLabel(t: StudentTranslator, plan: AcademyPlan) {
  return t(planLabelKeys[plan.classes] as StudentKey);
}

function planDescription(t: StudentTranslator, plan: AcademyPlan) {
  return t(planDescriptionKeys[plan.classes] as StudentKey, {
    audience: t(
      plan.type === "paired"
        ? "pricing.plan.audience.eachStudent"
        : "pricing.plan.audience.you",
    ),
  });
}

type PlanCardProps = {
  plan: AcademyPlan;
  selected: boolean;
  onSelect: () => void;
  t: StudentTranslator;
};

function PlanCard({ plan, selected, onSelect, t }: PlanCardProps) {
  return (
    <ButtonBase
      onClick={onSelect}
      aria-pressed={selected}
      sx={{ display: "block", width: "100%", height: "100%", textAlign: "left" }}
    >
      <Box
        sx={{
          p: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.light" : "background.paper",
          boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box minWidth={0}>
            <Typography variant="h6">{planName(t, plan)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("pricing.packageOption", { count: plan.classes })} ·{" "}
              {t("common.minutes", { count: plan.duration })}
            </Typography>
          </Box>
          <Chip
            label={planLabel(t, plan)}
            size="small"
            color={plan.classes === 60 ? "primary" : "default"}
            variant={plan.classes === 60 ? "filled" : "outlined"}
          />
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="baseline" mt={3}>
          <Typography variant="h2" fontWeight={700} color="primary.main">
            {formatMoney(plan.pricePerClass)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pricing.perClass")}
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" mt={0.5}>
          {formatMoney(plan.total)} {t("common.total").toLowerCase()}
          {plan.perStudentPerClass !== null
            ? ` · ${t("pricing.perStudentTotal", { amount: formatMoney(plan.perStudentPerClass) })}`
            : ""}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          mt={2}
          flexGrow={1}
        >
          {planDescription(t, plan)}
        </Typography>

        {plan.savings > 0 ? (
          <Chip
            label={t("pricing.save", { percent: plan.savings })}
            color="success"
            size="small"
            sx={{ mt: 2, alignSelf: "flex-start" }}
          />
        ) : null}

        <Stack direction="row" spacing={1} alignItems="center" mt={2}>
          {selected ? <IconCheck size={18} color="#FA896B" /> : null}
          <Typography
            variant="body2"
            fontWeight={selected ? 600 : 400}
            color={selected ? "primary.main" : "text.secondary"}
          >
            {selected ? t("pricing.selectedPlan") : t("pricing.selectPlan")}
          </Typography>
        </Stack>
      </Box>
    </ButtonBase>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

type PricingOverviewProps = {
  plans: AcademyPlan[];
};

export function PricingOverview({ plans }: PricingOverviewProps) {
  const t = useTranslations("student");
  const [duration, setDuration] = useState<ClassDuration>(25);
  const [type, setType] = useState<ClassType>("one-on-one");
  const [classes, setClasses] = useState<PackageSize>(60);

  const selectedPlan = selectPlanByChoice(plans, type, duration, classes);
  const packageOptions = plans.filter(
    (plan) => plan.type === type && plan.duration === duration,
  );
  const maxSavings = Math.max(...packageOptions.map((plan) => plan.savings));

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("pricing.breadcrumbTitle")}
        subtitle={t("pricing.breadcrumbSubtitle")}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard
              title={t("pricing.selectTitle")}
              subtitle={t("pricing.selectSubtitle")}
            >
              <PackagePlanFilters
                duration={duration}
                classType={type}
                onDuration={setDuration}
                onClassType={setType}
                maxSavings={maxSavings}
                showSavingsChip={maxSavings > 0}
                sx={{ mb: 3 }}
              />
              <Grid container spacing={2}>
                {packageOptions.map((plan) => (
                  <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
                    <PlanCard
                      plan={plan}
                      selected={plan.classes === classes}
                      onSelect={() => setClasses(plan.classes)}
                      t={t}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" color="text.secondary" mt={2.5}>
                {t("pricing.monthlyNote")}
              </Typography>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card
            elevation={9}
            sx={{ position: { lg: "sticky" }, top: { lg: 96 } }}
          >
            <CardContent sx={{ p: "30px" }}>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography variant="h5">{t("pricing.yourPlan")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("pricing.livePlan", { type: classTypeLabel(selectedPlan.type, t) })}
                  </Typography>
                </Box>
                <Chip
                  label={planLabel(t, selectedPlan)}
                  color={selectedPlan.classes === 60 ? "primary" : "default"}
                  size="small"
                  variant="outlined"
                />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label={t("common.package")}
                  value={t("pricing.packageOption", { count: selectedPlan.classes })}
                />
                <SummaryRow
                  label={t("common.duration")}
                  value={t("pricing.durationOption", { count: selectedPlan.duration })}
                />
                <SummaryRow
                  label={t("common.format")}
                  value={
                    selectedPlan.type === "paired"
                      ? t("pricing.formatPaired")
                      : t("pricing.formatIndividual")
                  }
                />
                <SummaryRow
                  label={t("common.pricePerClass")}
                  value={formatMoney(selectedPlan.pricePerClass)}
                />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h5">{t("pricing.total")}</Typography>
                <Typography
                  variant="h3"
                  fontWeight={700}
                  color="primary.main"
                >
                  {formatMoney(selectedPlan.total)}
                </Typography>
              </Stack>

              {selectedPlan.perStudentTotal !== null ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="right"
                >
                  {t("pricing.perStudentTotal", { amount: formatMoney(selectedPlan.perStudentTotal) })}
                </Typography>
              ) : null}

              <LinkButton
                href={`/checkout?plan=${selectedPlan.id}`}
                variant="contained"
                size="large"
                fullWidth
                endIcon={<IconArrowRight size={18} />}
                sx={{ mt: 3 }}
              >
                {t("actions.continueCheckout")}
              </LinkButton>

              <Stack direction="row" spacing={1} alignItems="flex-start" mt={2}>
                <Box sx={{ color: "success.main", mt: "2px" }}>
                  <IconShieldCheck size={18} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t("pricing.finePrint")}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <SectionCard
            title={t("pricing.includesTitle")}
            subtitle={t("pricing.includesSubtitle")}
          >
            <Grid container spacing={3}>
              {included.map((item) => (
                <Grid key={item.titleKey} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "primary.light",
                        color: "primary.main",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t(item.titleKey as StudentKey)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(item.descriptionKey as StudentKey)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" color="text.secondary" mt={3}>
              {t("pricing.priceNote")}
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
