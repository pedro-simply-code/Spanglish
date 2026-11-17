"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
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
      <Box mt={3}>
        <Breadcrumb
          title="Enrollment confirmed"
          subtitle="Your class package is ready to use."
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
              You&apos;re all set!
            </Typography>
            <Typography color="text.secondary" mt={1} mx="auto" maxWidth={560}>
              {plan.classes} credits were added
              {plan.type === "paired" ? " to the pool you share with your partner" : ""}. Schedule
              your first live class whenever you are ready.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              mt={4}
            >
              <LinkButton
                href="/schedule"
                variant="contained"
                size="large"
                startIcon={<IconCalendarEvent size={18} />}
              >
                Schedule first class
              </LinkButton>
              <LinkButton href="/home" variant="outlined" size="large">
                Back to overview
              </LinkButton>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Checkout"
        subtitle="Review your package and payment details."
      />

      {searchParams.get("canceled") ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          The payment was canceled on Stripe. Nothing was charged; you can try again.
        </Alert>
      ) : null}

      {stripe.enabled ? null : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Demo checkout: no card will be charged and no payment is processed.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <SectionCard
              title="Order summary"
              subtitle="Live classes with a certified teacher"
              action={
                <Chip
                  label="Live classes"
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
                  <Typography variant="h5">{plan.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.classes} live classes · {plan.duration} min ·{" "}
                    {classTypeLabel(plan.type)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label={`${plan.classes} classes × ${formatMoney(plan.pricePerClass)}`}
                  value={formatMoney(plan.total)}
                />
                <SummaryRow label="Taxes" value="Calculated at payment" />
                <SummaryRow label="Credits valid for" value="12 months" />
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h5">Total due today</Typography>
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
                  {formatMoney(plan.perStudentTotal)} per student
                </Typography>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Billing details"
              subtitle="Where we send your receipt and class links"
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First name"
                    defaultValue="Alex"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last name"
                    defaultValue="Rivera"
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Email"
                    type="email"
                    defaultValue="alex@spanglish.app"
                    fullWidth
                    helperText="Your class links and receipts go here."
                  />
                </Grid>
              </Grid>
            </SectionCard>

            {stripe.enabled ? (
              <SectionCard title="Payment method" subtitle="Card payment on Stripe's secure page">
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    When you press Pay you go to Stripe to enter your card. Spanglish never sees
                    your card details. Your credits are added as soon as the payment is confirmed.
                  </Typography>
                  {stripe.testMode ? (
                    <Alert severity="warning">
                      Test mode: no real money is charged. Use the card 4242 4242 4242 4242, any
                      future date and any CVC.
                    </Alert>
                  ) : null}
                </Stack>
              </SectionCard>
            ) : (
            <SectionCard
                title="Payment method"
                subtitle="Monthly payment options available at checkout"
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentOption
                      selected={method === "card"}
                      title="Credit or debit card"
                      subtitle="Visa, Mastercard, American Express"
                      icon={<IconCreditCard size={22} />}
                      onClick={() => setMethod("card")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentOption
                      selected={method === "paypal"}
                      title="PayPal"
                      subtitle="Pay with your PayPal balance"
                      icon={<IconBrandPaypal size={22} />}
                      onClick={() => setMethod("paypal")}
                    />
                  </Grid>
                </Grid>
  
                {method === "card" ? (
                  <Grid container spacing={2} mt={2}>
                    <Grid size={12}>
                      <TextField
                        label="Card number"
                        placeholder="4242 4242 4242 4242"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Expiry date"
                        placeholder="MM / YY"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="CVC" placeholder="123" fullWidth />
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    You will be redirected to PayPal to finish the payment.
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
              <Typography variant="h5">Payment summary</Typography>
              <Typography variant="body2" color="text.secondary">
                {plan.classes} classes · {plan.duration} min ·{" "}
                {classTypeLabel(plan.type)}
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label="Package"
                  value={formatMoney(plan.total)}
                />
                <SummaryRow label="Taxes" value="Calculated at payment" />
                <SummaryRow label="Due today" value={formatMoney(plan.total)} />
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
                  {formatMoney(plan.total)}
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Monthly payment options available at checkout.
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
                {paying ? (stripe.enabled ? "Opening Stripe…" : "Processing…") : `Pay ${formatMoney(plan.total)}`}
              </Button>

              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {stripe.enabled
                  ? stripe.testMode
                    ? "Stripe test mode: no real charge."
                    : "You will finish the payment on Stripe."
                  : "Demo checkout: no payment is taken; the credits are added to your account."}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="flex-start" mt={2}>
                <Box sx={{ color: "success.main", mt: "2px" }}>
                  <IconShieldCheck size={18} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Secure checkout. Cancel or reschedule any class up to 12 hours
                  before it starts.
                </Typography>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <LinkButton
                href="/pricing"
                variant="text"
                fullWidth
                startIcon={<IconArrowLeft size={18} />}
              >
                Back to pricing
              </LinkButton>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
