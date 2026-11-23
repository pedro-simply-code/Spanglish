"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconArrowLeft,
  IconBrandPaypal,
  IconCalendarEvent,
  IconCheck,
  IconCircleCheck,
  IconCreditCard,
  IconLock,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { purchasePackageAction } from "@/features/academy/actions";
import { classTypeLabel } from "@/lib/class-type-label";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney, findPlanById, defaultPlan } from "@/features/academy/data";
import type { AcademyPlan } from "@/features/academy/data";

type PaymentMethod = "card" | "paypal";

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const planNameKeys: Record<string, string> = {
  "paired-1": "pricing.plan.name.pairedSingle",
  "one-on-one-1": "pricing.plan.name.single",
  "paired-30": "pricing.plan.name.pairedStarter",
  "paired-60": "pricing.plan.name.pairedProgress",
  "paired-90": "pricing.plan.name.pairedFluency",
  "one-on-one-30": "pricing.plan.name.starterSupport",
  "one-on-one-60": "pricing.plan.name.steadyProgress",
  "one-on-one-90": "pricing.plan.name.fluencyBuilder",
};

function planName(t: StudentTranslator, plan: AcademyPlan) {
  const key = planNameKeys[`${plan.type}-${plan.classes}`];
  // Sizes added in admin without a translation keep the name stored there.
  return key ? t(key as StudentKey) : plan.name;
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

function PaymentOption({
  selected,
  title,
  subtitle,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{ display: "block", width: "100%", textAlign: "left" }}
    >
      <Box
        sx={{
          p: 2.5,
          height: "100%",
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.light" : "background.paper",
          boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: selected ? "primary.main" : "grey.100",
              color: selected ? "#fff" : "primary.main",
            }}
          >
            {icon}
          </Box>
          <Box flexGrow={1}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          {selected ? <IconCheck size={20} color="#FA896B" /> : null}
        </Stack>
      </Box>
    </ButtonBase>
  );
}

type CheckoutOverviewProps = {
  plans: AcademyPlan[];
  /** Real payment on Stripe Checkout (otherwise the demo purchase). */
  stripe?: { enabled: boolean; testMode: boolean };
};

export function CheckoutOverview({ plans, stripe = { enabled: false, testMode: false } }: CheckoutOverviewProps) {
  const t = useTranslations("student");
  const searchParams = useSearchParams();
  const plan = findPlanById(plans, searchParams.get("plan")) ?? plans[0] ?? defaultPlan;
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [complete, setComplete] = useState(false);
  const [paying, startPaying] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pay = () => {
    setError(null);
    startPaying(async () => {
      const result = await purchasePackageAction(plan.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setComplete(true);
    });
  };

  if (complete) {
    return (
      <Box>
        <Breadcrumb
          title={t("checkout.result.titlePaid")}
          subtitle={t("checkout.result.subtitlePaid")}
        />

        <Card elevation={9}>
          <CardContent
            sx={{
              p: { xs: "30px", md: "50px" },
              textAlign: "center",
            }}
          >
            <Avatar
              sx={{
                width: 84,
                height: 84,
                mx: "auto",
                bgcolor: "success.light",
                color: "success.main",
              }}
            >
              <IconCircleCheck size={42} />
            </Avatar>

            <Typography variant="h3" fontWeight={700} mt={3}>
              {t("checkout.result.allSet")}
            </Typography>
            <Typography color="text.secondary" mt={1} mx="auto" maxWidth={560}>
              {t("checkout.result.creditsAdded", {
                count: plan.classes,
                suffix: plan.type === "paired" ? t("checkout.result.pairedSuffix") : "",
              })}
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              mt={4}
            >
              <LinkButton
                href="/classes?tab=book"
                variant="contained"
                size="large"
                startIcon={<IconCalendarEvent size={18} />}
              >
                {t("actions.scheduleFirstClass")}
              </LinkButton>
              <LinkButton href="/home" variant="outlined" size="large">
                {t("actions.backToOverview")}
              </LinkButton>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumb
        title={t("checkout.breadcrumbTitle")}
        subtitle={t("checkout.breadcrumbSubtitle")}
      />

      {searchParams.get("canceled") ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t("checkout.canceledNotice")}
        </Alert>
      ) : null}

      {stripe.enabled ? null : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t("checkout.demoNotice")}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <SectionCard
              title={t("checkout.orderTitle")}
              subtitle={t("checkout.orderSubtitle")}
              action={
                <Chip
                  label={t("checkout.liveClassesChip")}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              }
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: "primary.light",
                    color: "primary.main",
                  }}
                >
                  <IconCalendarEvent size={26} />
                </Avatar>
                <Box minWidth={0}>
                  <Typography variant="h5">{planName(t, plan)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("checkout.planDetails", {
                      count: plan.classes,
                      duration: plan.duration,
                      type: classTypeLabel(plan.type, t),
                    })}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label={t("checkout.classesTimesPrice", {
                    count: plan.classes,
                    amount: formatMoney(plan.pricePerClass),
                  })}
                  value={formatMoney(plan.total)}
                />
                <SummaryRow label={t("checkout.taxes")} value={t("checkout.calculatedAtPayment")} />
                <SummaryRow label={t("checkout.creditsValid")} value={t("checkout.twelveMonths")} />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h5">{t("checkout.totalDueToday")}</Typography>
                <Typography
                  variant="h3"
                  fontWeight={700}
                  color="primary.main"
                >
                  {formatMoney(plan.total)}
                </Typography>
              </Stack>

              {plan.perStudentTotal !== null ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="right"
                >
                  {t("pricing.perStudentTotal", { amount: formatMoney(plan.perStudentTotal) })}
                </Typography>
              ) : null}
            </SectionCard>

            <SectionCard
              title={t("checkout.billingTitle")}
              subtitle={t("checkout.billingSubtitle")}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t("checkout.firstName")}
                    defaultValue="Alex"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t("checkout.lastName")}
                    defaultValue="Rivera"
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={t("common.email")}
                    type="email"
                    defaultValue="alex@spanglish.app"
                    fullWidth
                    helperText={t("checkout.emailHelper")}
                  />
                </Grid>
              </Grid>
            </SectionCard>

            {stripe.enabled ? (
              <SectionCard title={t("checkout.paymentTitle")} subtitle={t("checkout.stripeSubtitle")}>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {t("checkout.stripeBody")}
                  </Typography>
                  {stripe.testMode ? (
                    <Alert severity="warning">
                      {t("checkout.testMode")}
                    </Alert>
                  ) : null}
                </Stack>
              </SectionCard>
            ) : (
            <SectionCard
                title={t("checkout.paymentTitle")}
                subtitle={t("checkout.demoSubtitle")}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentOption
                      selected={method === "card"}
                      title={t("checkout.card")}
                      subtitle={t("checkout.cardSubtitle")}
                      icon={<IconCreditCard size={22} />}
                      onClick={() => setMethod("card")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentOption
                      selected={method === "paypal"}
                      title={t("checkout.paypal")}
                      subtitle={t("checkout.paypalSubtitle")}
                      icon={<IconBrandPaypal size={22} />}
                      onClick={() => setMethod("paypal")}
                    />
                  </Grid>
                </Grid>
  
                {method === "card" ? (
                  <Grid container spacing={2} mt={2}>
                    <Grid size={12}>
                      <TextField
                        label={t("checkout.cardNumber")}
                        placeholder="4242 4242 4242 4242"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label={t("checkout.expiry")}
                        placeholder="MM / YY"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label={t("checkout.cvc")} placeholder="123" fullWidth />
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t("checkout.paypalRedirect")}
                  </Alert>
                )}
              </SectionCard>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card
            elevation={9}
            sx={{ position: { lg: "sticky" }, top: { lg: 96 } }}
          >
            <CardContent sx={{ p: "30px" }}>
              <Typography variant="h5">{t("checkout.paymentSummary")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("checkout.planDetails", {
                  count: plan.classes,
                  duration: plan.duration,
                  type: classTypeLabel(plan.type, t),
                })}
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label={t("common.package")}
                  value={formatMoney(plan.total)}
                />
                <SummaryRow label={t("checkout.taxes")} value={t("checkout.calculatedAtPayment")} />
                <SummaryRow label={t("checkout.dueToday")} value={formatMoney(plan.total)} />
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
                  {formatMoney(plan.total)}
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {t("pricing.monthlyNote")}
              </Typography>

              {error ? (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              ) : null}

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<IconLock size={18} />}
                sx={{ mt: 3 }}
                onClick={pay}
                disabled={paying}
              >
                {paying
                  ? stripe.enabled
                    ? t("checkout.openingStripe")
                    : t("checkout.processing")
                  : t("checkout.pay", { amount: formatMoney(plan.total) })}
              </Button>

              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {stripe.enabled
                  ? stripe.testMode
                    ? t("checkout.stripeTestHint")
                    : t("checkout.stripeFinishHint")
                  : t("checkout.demoHint")}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="flex-start" mt={2}>
                <Box sx={{ color: "success.main", mt: "2px" }}>
                  <IconShieldCheck size={18} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t("checkout.secureNotice")}
                </Typography>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <LinkButton
                href="/credits?tab=buy"
                variant="text"
                fullWidth
                startIcon={<IconArrowLeft size={18} />}
              >
                {t("actions.backToPricing")}
              </LinkButton>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
