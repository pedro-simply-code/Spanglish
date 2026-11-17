import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCalendarEvent, IconClock } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { MaterialsLibrary } from "@/features/materials/components/materials-library";
import { formatMaterialDateTime } from "@/features/materials/format";
import type { Material } from "@/features/materials/types";

/** Due dates per material, when a teacher assigned one. */
type StudentMaterialsOverviewProps = {
  materials: Material[];
  dueDates?: Record<string, string>;
};

export function StudentMaterialsOverview({ materials, dueDates = {} }: StudentMaterialsOverviewProps) {
  const entries = materials.map((material) => ({ material, grant: { id: material.id, dueAt: dueDates[material.id] } }));
  const withDue = entries.filter((entry) => entry.grant.dueAt);

  return (
    <Box mt={3}>
      <Breadcrumb
        title="My materials"
        subtitle="The academy library and the materials your teachers attached to your classes."
      />

      {withDue.length ? (
        <Alert
          severity="info"
          icon={<IconCalendarEvent size={18} />}
          sx={{ mb: 3 }}
        >
          <Stack spacing={0.5}>
            {withDue.map(({ material, grant }) => (
              <Typography key={grant.id} variant="body2">
                {material.title} · due {formatMaterialDateTime(grant.dueAt!)}
              </Typography>
            ))}
          </Stack>
        </Alert>
      ) : null}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconClock size={16} />
          <Typography variant="body2" color="text.secondary">
            Forms open in the practice runner. Documents, audio, and recordings
            open from the material page.
          </Typography>
        </Stack>
      </Stack>

      <MaterialsLibrary
        entries={entries.map(({ material, grant }) => ({
          material,
          dueAt: grant.dueAt,
        }))}
        basePath="/materials"
        emptyMessage="Nothing shared with you yet. Your next class materials will appear here."
      />
    </Box>
  );
}
