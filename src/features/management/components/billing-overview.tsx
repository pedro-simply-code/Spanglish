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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  billingStats,
  invoices,
} from "@/features/management/data";

const invoiceStatusColor: Record<
  (typeof invoices)[number]["status"],
  "success" | "warning" | "default"
> = {
  paid: "success",
  due: "warning",
  refunded: "default",
};

export function BillingOverview() {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Billing"
        subtitle="Plans, invoices, and refunds for the academy."
        items={[
          { title: "Manager", to: "/manager" },
          { title: "Billing" },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Checkout is a clearly labeled static demo. Invoice actions validate
        permissions but do not charge a card or write to a payments provider.
      </Alert>

      <Grid container spacing={3}>
        {billingStats.map((stat) => (
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
            title="Recent invoices"
            subtitle="The last five plans issued to students"
            action={
              <LinkButton
                href="/pricing"
                size="small"
                variant="outlined"
                startIcon={<IconCreditCard size={15} />}
              >
                Plan catalog
              </LinkButton>
            }
          >
            <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
              {invoices.map((invoice) => (
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
                        {invoice.id} · issued {invoice.issuedAt}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>
                      {invoice.amount}
                    </Typography>
                    <Chip
                      label={invoice.status}
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
