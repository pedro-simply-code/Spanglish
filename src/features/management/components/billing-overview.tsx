"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCreditCard, IconReceipt2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  billingStats,
  invoices,
  type InvoiceStatus,
} from "@/features/management/data";

const invoiceStatusColor: Record<
  InvoiceStatus,
  "success" | "warning" | "default"
> = {
  paid: "success",
  due: "warning",
  refunded: "default",
};

export function BillingOverview() {
  const t = useTranslations("admin");
  const stats = billingStats(t);
  const invoiceRows = invoices(t);

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("management.billing.title")}
        subtitle={t("management.billing.subtitle")}
        items={[
          { title: t("management.breadcrumb.manager"), to: "/manager" },
          { title: t("management.billing.title") },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("management.billing.demoNotice")}
      </Alert>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="primary.main"
                  mt={1}
                >
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
            title={t("management.billing.recentInvoices")}
            subtitle={t("management.billing.recentInvoicesSubtitle")}
            action={
              <LinkButton
                href="/pricing"
                size="small"
                variant="outlined"
                startIcon={<IconCreditCard size={15} />}
              >
                {t("management.billing.planCatalog")}
              </LinkButton>
            }
          >
            <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
              {invoiceRows.map((invoice) => (
                <Stack
                  key={invoice.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "primary.light",
                        color: "primary.main",
                        flexShrink: 0,
                      }}
                    >
                      <IconReceipt2 size={20} />
                    </Box>
                    <Box minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {invoice.student}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {invoice.plan}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.id} · {t("management.billing.issued", { date: invoice.issuedAt })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>
                      {invoice.amount}
                    </Typography>
                    <Chip
                      label={t(`management.billing.status.${invoice.status}`)}
                      size="small"
                      color={invoiceStatusColor[invoice.status]}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
