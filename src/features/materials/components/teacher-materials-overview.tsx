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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { MaterialsLibrary } from "@/features/materials/components/materials-library";
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
  const ownMaterials = materials.filter((material) => material.ownerId === viewerId);
  const colleagues = materials.filter((material) => material.ownerId !== viewerId);
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
      label: "Library",
      value: `${ownMaterials.length}`,
      helper: "Materials you own",
      icon: IconFileText,
    },
    {
      id: "published",
      label: "Academy library",
      value: `${ownMaterials.filter((material) => material.visibility === "global" && material.moderation === "approved").length}`,
      helper: `${published.length} published · ${ownMaterials.filter((material) => material.moderation === "pending").length} in review`,
      icon: IconClipboardList,
    },
    {
      id: "forms",
      label: "Forms",
      value: `${forms.length}`,
      helper: "Practice activities",
      icon: IconClipboardList,
    },
    {
      id: "recordings",
      label: "Recordings",
      value: `${recordings.length}`,
      helper: "From past classes",
      icon: IconMovie,
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Materials"
        subtitle="The teaching library. Create a resource once, then share it with a class, a student, or a cohort."
        items={[{ title: "Teacher", to: "/teacher" }, { title: "Materials" }]}
      >
        <LinkButton
          href="/teacher/materials/new"
          variant="contained"
          startIcon={<IconPlus size={16} />}
        >
          New material
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
        My materials
      </Typography>
      <MaterialsLibrary
        entries={ownMaterials.map((material) => ({ material }))}
        basePath="/teacher/materials"
        showVisibility
        emptyMessage="No materials yet. Create your first resource to start building the library."
      />

      <Typography variant="h5" mt={5} mb={2}>
        From other teachers
      </Typography>
      <MaterialsLibrary
        entries={colleagues.map((material) => ({ material }))}
        basePath="/teacher/materials"
        showVisibility
        emptyMessage="No shared materials from colleagues yet."
      />
    </Box>
  );
}
