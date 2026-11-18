"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCheck, IconMinus, IconShield } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { hasPermission, permissions, roleCodes, roleDefinitions } from "@/features/auth";
import type { RoleCode } from "@/features/auth";

export function RolesOverview({ roleCounts }: { roleCounts: Record<RoleCode, number> }) {
  const t = useTranslations("admin");
  const roleT = useTranslations("shell");
  const locale = useLocale();

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("management.roles.title")}
        subtitle={t("management.roles.subtitle")}
        items={[
          { title: t("common.admin"), to: "/admin" },
          { title: t("common.section.organization") },
          { title: t("common.page.roles") },
        ]}
      >
        <LinkButton href="/settings" variant="contained">
          {t("management.roles.openSettings")}
        </LinkButton>
      </Breadcrumb>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {roleCodes
          .slice()
          .reverse()
          .map((role) => (
            <Grid key={role} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "24px" }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="h6">
                        {roleT(`roles.${role}`)}
                      </Typography>
                      <IconShield size={18} />
                    </Stack>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {roleCounts[role].toLocaleString(locale)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("management.roles.cardHelper", { priority: roleDefinitions[role].priority })}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      <SectionCard
        title={t("management.roles.matrixTitle")}
        subtitle={t("management.roles.matrixSubtitle", {
          permissions: permissions.length,
          roles: roleCodes.length,
        })}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} sx={{ px: 1 }}>
            <Typography variant="caption" sx={{ flexGrow: 1 }} fontWeight={700}>
              {t("management.roles.permissionHeader")}
            </Typography>
            {roleCodes.map((role) => (
              <Typography
                key={role}
                variant="caption"
                fontWeight={700}
                sx={{ width: 84, textAlign: "center" }}
              >
                {roleT(`roles.${role}`)}
              </Typography>
            ))}
          </Stack>

          {permissions.map((permission) => (
            <Stack
              key={permission}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 1, py: 0.75, bgcolor: "grey.100" }}
            >
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {permission}
              </Typography>
              {roleCodes.map((role) => {
                const granted = hasPermission([role], permission);

                return (
                  <Box
                    key={role}
                    sx={{ width: 84, display: "flex", justifyContent: "center" }}
                  >
                    <Chip
                      label={granted ? t("management.roles.granted") : "—"}
                      size="small"
                      variant="outlined"
                      color={granted ? "success" : "default"}
                      icon={
                        granted ? <IconCheck size={12} /> : <IconMinus size={12} />
                      }
                    />
                  </Box>
                );
              })}
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      <Box sx={{ mt: 3, p: 2.5, bgcolor: "grey.100", borderRadius: 1.75 }}>
        <Typography variant="body2" color="text.secondary">
          {t("management.roles.serverRules")}
        </Typography>
      </Box>
    </Box>
  );
}
