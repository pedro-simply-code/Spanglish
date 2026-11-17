"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconExternalLink } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { AcademyPlan } from "@/features/academy/data";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { CommercePackageRow } from "@/features/admin/types";

export function CommercePublishOverview({
  plans,
  packages,
}: {
  plans: AcademyPlan[];
  packages: CommercePackageRow[];
}) {
  const liveCount = packages.filter((row) => row.active).length;
  const draftCount = packages.length - liveCount;

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Publish pricing"
        subtitle="Push admin catalog changes to the public site English speakers see."
        items={adminBreadcrumb("Commerce", "Publish", "/admin/commerce/publish")}
      >
        <LinkButton
          href="/pricing"
          variant="outlined"
          endIcon={<IconExternalLink size={16} />}
          target="_blank"
        >
          View public pricing
        </LinkButton>
      </Breadcrumb>

      <Alert severity="warning" sx={{ mb: 3 }}>
        The public /pricing page reads active rows from pricing_packages ({plans.length} total).
        Toggle active and publishedAt here once the publish action is implemented.
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Snapshot">
            <Stack spacing={1}>
              <Typography variant="body2">
                Live packages: <strong>{liveCount}</strong>
              </Typography>
              <Typography variant="body2">
                Drafts: <strong>{draftCount}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last publish (sample): Nov 12, 2026 · by admin
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard
            title="Queued changes"
            subtitle="What students would see after the next publish"
          >
            <Stack spacing={1.5}>
              {packages.map((row) => (
                <Stack
                  key={row.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body2">{row.name}</Typography>
                  <Chip
                    size="small"
                    label={row.active ? "Included" : "Held back"}
                    color={row.active ? "success" : "default"}
                  />
                </Stack>
              ))}
            </Stack>
            <Button variant="contained" disabled sx={{ mt: 3 }}>
              Publish to /pricing
            </Button>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}