"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconClipboardList,
  IconFileText,
  IconMovie,
  IconPlus,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { MaterialsLibrary } from "@/features/materials/components/materials-library";
import { localizeMaterials } from "@/features/materials/data";
import type { Material } from "@/features/materials/types";

type TeacherMaterialsOverviewProps = {
  viewerId: string;
  /** Own materials plus what colleagues shared (all, for staff). */
  materials: Material[];
};

export function TeacherMaterialsOverview({
  viewerId,
  materials,
}: TeacherMaterialsOverviewProps) {
  const t = useTranslations("educator");
  const materialsT = useTranslations("educator.materials");
  const rows = localizeMaterials(materials, materialsT);
  const ownMaterials = rows.filter((material) => material.ownerId === viewerId);
  const colleagues = rows.filter((material) => material.ownerId !== viewerId);
  const published = ownMaterials.filter(
    (material) => material.status === "published",
  );
  const forms = ownMaterials.filter((material) => material.kind === "form");
  const recordings = ownMaterials.filter(
    (material) => material.kind === "recording",
  );

  const stats = [
    {
      id: "library",
      label: t("materials.teacherOverview.library"),
      value: `${ownMaterials.length}`,
      helper: t("materials.teacherOverview.materialsYouOwn"),
      icon: IconFileText,
    },
    {
      id: "published",
      label: t("materials.visibility.academyLibrary"),
      value: `${ownMaterials.filter((material) => material.visibility === "global" && material.moderation === "approved").length}`,
      helper: t("materials.teacherOverview.publishedInReview", {
        published: published.length,
        review: ownMaterials.filter((material) => material.moderation === "pending").length,
      }),
      icon: IconClipboardList,
    },
    {
      id: "forms",
      label: t("materials.teacherOverview.forms"),
      value: `${forms.length}`,
      helper: t("materials.teacherOverview.practiceActivities"),
      icon: IconClipboardList,
    },
    {
      id: "recordings",
      label: t("materials.teacherOverview.recordings"),
      value: `${recordings.length}`,
      helper: t("materials.teacherOverview.fromPastClasses"),
      icon: IconMovie,
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.materials")}
        subtitle={t("materials.teacherOverview.subtitle")}
        items={[
          { title: t("shell.roles.teacher"), to: "/teacher" },
          { title: t("common.materials") },
        ]}
      >
        <LinkButton
          href="/teacher/materials/new"
          variant="contained"
          startIcon={<IconPlus size={16} />}
        >
          {t("materials.teacherOverview.newMaterial")}
        </LinkButton>
      </Breadcrumb>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Box
                sx={{
                  p: "24px",
                  bgcolor: "background.paper",
                  borderRadius: 1.75,
                  height: "100%",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: "primary.light",
                      color: "primary.main",
                    }}
                  >
                    <Icon size={22} />
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.helper}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h5" mb={2}>
        {t("materials.teacherOverview.myLibrary")}
      </Typography>
      <MaterialsLibrary
        entries={ownMaterials.map((material) => ({ material }))}
        basePath="/teacher/materials"
        showVisibility
        emptyMessage={t("materials.teacherOverview.noMaterials")}
      />

      <Typography variant="h5" mt={5} mb={2}>
        {t("materials.teacherOverview.fromOtherTeachers")}
      </Typography>
      <MaterialsLibrary
        entries={colleagues.map((material) => ({ material }))}
        basePath="/teacher/materials"
        showVisibility
        emptyMessage={t("materials.teacherOverview.noSharedMaterials")}
      />
    </Box>
  );
}
