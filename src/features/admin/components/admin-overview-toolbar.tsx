"use client";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { IconExternalLink, IconHeartbeat, IconHistory } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { adminQuickActions } from "@/features/admin/data";

type AdminOverviewToolbarProps = {
  alertCount: number;
  activityCount: number;
  onOpenHealth: () => void;
  onOpenActivity: () => void;
};

export function AdminOverviewToolbar({
  alertCount,
  activityCount,
  onOpenHealth,
  onOpenActivity,
}: AdminOverviewToolbarProps) {
  const t = useTranslations("admin");
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        useFlexGap
        spacing={1}
        rowGap={1}
      >
        <Badge badgeContent={alertCount} color="warning" invisible={alertCount === 0}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconHeartbeat size={16} />}
            onClick={onOpenHealth}
          >
            {t("overview.toolbar.platformHealth")}
          </Button>
        </Badge>

        <Badge badgeContent={activityCount} color="primary" invisible={activityCount === 0}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconHistory size={16} />}
            onClick={onOpenActivity}
          >
            {t("overview.toolbar.latestActivity")}
          </Button>
        </Badge>

        <LinkButton
          href="/admin/organization/students"
          size="small"
          variant="outlined"
          startIcon={<IconExternalLink size={14} />}
        >
          {t("overview.toolbar.studentsCredits")}
        </LinkButton>

        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 28, alignSelf: "center" }} />
        </Box>

        {adminQuickActions(t).map((action) => (
          <LinkButton
            key={action.id}
            href={action.href}
            size="small"
            variant="text"
            sx={{ textTransform: "none", fontWeight: 500 }}
          >
            {action.title}
          </LinkButton>
        ))}
      </Stack>
    </Paper>
  );
}