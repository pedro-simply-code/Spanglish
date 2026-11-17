"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCheck, IconExternalLink, IconPlugConnected, IconX } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import type { Integration, IntegrationStatus } from "@/features/management/data";

const statusColor: Record<
  IntegrationStatus,
  "success" | "warning" | "default"
> = {
  connected: "success",
  "action-needed": "warning",
  "not-configured": "default",
};

const statusLabels: Record<IntegrationStatus, string> = {
  connected: "Connected",
  "action-needed": "Action needed",
  "not-configured": "Not configured",
};

export function IntegrationsOverview({ integrations }: { integrations: Integration[] }) {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Integrations"
        subtitle="External services the academy depends on."
        items={[
          { title: "Admin", to: "/admin" },
          { title: "Platform" },
          { title: "Integrations" },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Keys live in the server&apos;s <code>.env</code>, never in the database or the browser: edit
        them there and restart the server. This page only shows which variables are set, not
        their values.
      </Alert>

      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid key={integration.id} size={{ xs: 12, md: 6 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "primary.light",
                        color: "primary.main",
                        flexShrink: 0,
                      }}
                    >
                      <IconPlugConnected size={22} />
                    </Box>
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="h5">{integration.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Owner: {integration.owner}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusLabels[integration.status]}
                      size="small"
                      color={statusColor[integration.status]}
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {integration.description}
                  </Typography>

                  {integration.variables?.length ? (
                    <Stack spacing={0.75}>
                      {integration.variables.map((variable) => (
                        <Stack key={variable.name} direction="row" spacing={1} alignItems="center">
                          <Box
                            component="span"
                            sx={{ color: variable.set ? "success.main" : variable.optional ? "text.disabled" : "warning.main", display: "flex" }}
                          >
                            {variable.set ? <IconCheck size={16} /> : <IconX size={16} />}
                          </Box>
                          <Typography variant="body2" component="code" sx={{ fontFamily: "monospace" }}>
                            {variable.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {variable.set ? "set" : variable.optional ? "optional" : "missing"}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}

                  {integration.docsUrl ? (
                    <Typography
                      variant="body2"
                      component="a"
                      href={integration.docsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      sx={{ color: "primary.main", display: "inline-flex", alignItems: "center", gap: 0.5, alignSelf: "flex-start" }}
                    >
                      Provider docs <IconExternalLink size={14} />
                    </Typography>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
