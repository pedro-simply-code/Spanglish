"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCreditCard, IconReceipt2, IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { classTypeLabel } from "@/lib/class-type-label";
import type { BillingReport } from "@/server/payments/billing-report";

const statusColor = {
  paid: "success",
  pending: "warning",
  canceled: "default",
  refunded: "default",
} as const;

/** Manager → billing: real orders (class packages and AI credit packs). */
export function BillingOverview({ report }: { report: BillingReport }) {
  const t = useTranslations("admin");
  const tStudent = useTranslations("student");
  const format = useFormatter();
  const money = (cents: number, currency = "USD") =>
    format.number(cents / 100, { style: "currency", currency, minimumFractionDigits: 2 });
  const { summary, recent } = report;

  const stats = [
    {
      id: "paid",
      label: t("management.billing.stat.paid.label"),
      value: money(summary.paidCents),
      helper: t("management.billing.stat.paid.helper", {
        orders: summary.paidOrders,
        buyers: summary.buyers,
      }),
    },
    {
      id: "split",
      label: t("management.billing.stat.split.label"),
      value: money(summary.classCents),
      helper: t("management.billing.stat.split.helper", { ai: money(summary.aiCents) }),
    },
    {
      id: "pending",
      label: t("management.billing.stat.pending.label"),
      value: money(summary.pendingCents),
      helper: t("management.billing.stat.pending.helper", { count: summary.pendingOrders }),
    },
    {
      id: "refunds",
      label: t("management.billing.stat.refunded.label"),
      value: money(summary.refundedCents),
      helper: t("management.billing.stat.refunded.helper", { count: summary.refundedOrders }),
    },
  ];

  return (
    <Box>
      <Breadcrumb
        title={t("management.billing.title")}
        subtitle={t("management.billing.subtitle")}
        items={[
          { title: t("management.breadcrumb.manager"), to: "/manager" },
          { title: t("management.billing.title") },
        ]}
      />

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {stat.helper}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={12}>
          <SectionCard
            title={t("management.billing.recentOrders")}
            subtitle={t("management.billing.recentOrdersSubtitle", { count: recent.length })}
            action={
              <LinkButton href="/pricing" size="small" variant="outlined" startIcon={<IconCreditCard size={15} />}>
                {t("management.billing.planCatalog")}
              </LinkButton>
            }
          >
            {recent.length ? (
              <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                {recent.map((order) => (
                  <Stack
                    key={`${order.kind}-${order.id}`}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: order.kind === "ai" ? "secondary.light" : "primary.light",
                          color: order.kind === "ai" ? "secondary.main" : "primary.main",
                          flexShrink: 0,
                        }}
                      >
                        {order.kind === "ai" ? <IconSparkles size={20} /> : <IconReceipt2 size={20} />}
                      </Box>
                      <Box minWidth={0}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {order.buyerName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.kind === "ai"
                            ? t("management.billing.item.ai", { credits: order.credits })
                            : t("management.billing.item.classes", {
                                type: classTypeLabel(order.classType ?? "", tStudent),
                                minutes: order.durationMinutes ?? 0,
                                classes: order.credits,
                              })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.dateTime(new Date(order.createdAt), { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                          {t(`management.billing.provider.${order.provider}`)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {money(order.totalCents, order.currency)}
                      </Typography>
                      <Chip
                        label={t(`management.billing.status.${order.status}`)}
                        size="small"
                        color={statusColor[order.status]}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t("management.billing.empty")}
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
