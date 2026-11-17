"use client";

import { useState } from "react";
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

const included = [
  {
    title: "Certified teachers",
    description: "Native speakers with real classroom experience.",
    icon: <IconUser size={22} />,
  },
  {
    title: "Flexible scheduling",
    description: "Book, move or cancel classes around your week.",
    icon: <IconCalendarEvent size={22} />,
  },
  {
    title: "Progress reports",
    description: "See what improved and what to practice next.",
    icon: <IconChartLine size={22} />,
  },
  {
    title: "Class recordings",
    description: "Review every lesson and keep the momentum.",
    icon: <IconHeadset size={22} />,
  },
];

type PlanCardProps = {
  plan: AcademyPlan;
  selected: boolean;
  onSelect: () => void;
};

function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
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
            <Typography variant="h6">{plan.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {plan.classes} classes · {plan.duration} min
            </Typography>
          </Box>
          <Chip
            label={plan.label}
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
            / class
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" mt={0.5}>
          {formatMoney(plan.total)} total
          {plan.perStudentPerClass !== null
            ? ` · ${formatMoney(plan.perStudentPerClass)} per student`
            : ""}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          mt={2}
          flexGrow={1}
        >
          {plan.description}
        </Typography>

        {plan.savings > 0 ? (
          <Chip
            label={`Save ${plan.savings}%`}
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
            {selected ? "Selected plan" : "Select plan"}
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
        title="Pricing"
        subtitle="Live classes with certified teachers, built around your schedule."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard
              title="Select your package"
              subtitle="Choose session length and class format, then pick a credit bundle"
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
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" color="text.secondary" mt={2.5}>
                Monthly payment options available at checkout.
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
                  <Typography variant="h5">Your plan</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Live{" "}
                    {classTypeLabel(selectedPlan.type)}{" "}
                    classes
                  </Typography>
                </Box>
                <Chip
                  label={selectedPlan.label}
                  color={selectedPlan.classes === 60 ? "primary" : "default"}
                  size="small"
                  variant="outlined"
                />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label="Package"
                  value={`${selectedPlan.classes} classes`}
                />
                <SummaryRow
                  label="Duration"
                  value={`${selectedPlan.duration} minutes`}
                />
                <SummaryRow
                  label="Format"
                  value={
                    selectedPlan.type === "paired"
                      ? "Paired (2 students)"
                      : "Individual"
                  }
                />
                <SummaryRow
                  label="Price per class"
                  value={formatMoney(selectedPlan.pricePerClass)}
                />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h5">Total</Typography>
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
                  {formatMoney(selectedPlan.perStudentTotal)} per student
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
                Continue to checkout
              </LinkButton>

              <Stack direction="row" spacing={1} alignItems="flex-start" mt={2}>
                <Box sx={{ color: "success.main", mt: "2px" }}>
                  <IconShieldCheck size={18} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Monthly payment options available at checkout. Reschedule any
                  class up to 12 hours before it starts.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <SectionCard
            title="Every package includes"
            subtitle="Everything you need to make progress stick"
          >
            <Grid container spacing={3}>
              {included.map((item) => (
                <Grid key={item.title} size={{ xs: 12, sm: 6, lg: 3 }}>
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
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" color="text.secondary" mt={3}>
              All prices are in USD. Packages are charged once and credits stay
              valid for 12 months.
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
