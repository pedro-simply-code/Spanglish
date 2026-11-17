"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { TeacherRateTier } from "@/features/admin/types";

export function CommerceTeacherRatesOverview({ tiers }: { tiers: TeacherRateTier[] }) {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Teacher rate tiers"
        subtitle="Legacy view — edit platform take under Finance → Teacher pay rates."
        items={adminBreadcrumb("Commerce", "Teacher rates", "/admin/commerce/teacher-rates")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Pay is revenue share on each credit’s purchase value (individual and paired). Configure levels under{" "}
        <LinkButton href="/admin/finance/teacher-rates" size="small" sx={{ verticalAlign: "baseline", px: 0.5 }}>
          Finance → Teacher pay rates
        </LinkButton>
        . Counts below are teachers grouped by profile level.
      </Alert>

      <Grid container spacing={3}>
        {tiers.length === 0 ? (
          <Grid size={12}>
            <Alert severity="warning">No teacher accounts in the database yet.</Alert>
          </Grid>
        ) : null}
        {tiers.map((tier) => (
          <Grid key={tier.id} size={{ xs: 12, md: 4 }}>
            <SectionCard
              title={tier.label}
              subtitle="Level cohort"
              action={<Chip label={`${tier.teachers} teachers`} size="small" />}
            >
              <Typography variant="body2" color="text.secondary">
                {tier.description}
              </Typography>
              <Stack direction="row" spacing={1} mt={2}>
                <Chip label="Auto-assign" size="small" variant="outlined" />
                <Chip label="Admin override" size="small" variant="outlined" />
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}