"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconClipboardList,
  IconClock,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { activities } from "@/features/practice/data";

const difficultyColor: Record<string, "success" | "warning" | "error"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "error",
};

export type AssignedForm = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  dueAt?: string;
};

type PracticeOverviewProps = {
  assignedForms?: AssignedForm[];
};

export function PracticeOverview({ assignedForms = [] }: PracticeOverviewProps) {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Practice"
        subtitle="Teacher-assigned forms first, then the practice library."
      />

      {assignedForms.length ? (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <IconClipboardList size={18} />
            <Typography variant="h5">From your teacher</Typography>
          </Stack>
          <Grid container spacing={3}>
            {assignedForms.map((form) => (
              <Grid key={form.id} size={{ xs: 12, md: 6 }}>
                <Card elevation={9} sx={{ height: "100%" }}>
                  <CardContent sx={{ p: "30px" }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          label="Assigned"
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${form.estimatedMinutes} min`}
                          size="small"
                          variant="outlined"
                          icon={<IconClock size={13} />}
                        />
                        {form.dueAt ? (
                          <Chip
                            label={`Due ${form.dueAt}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                      <Box>
                        <Typography variant="h5">{form.title}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                        >
                          {form.description}
                        </Typography>
                      </Box>
                      <Box>
                        <LinkButton
                          href={`/practice/${form.id}`}
                          variant="contained"
                          endIcon={<IconArrowRight size={15} />}
                        >
                          Start practice
                        </LinkButton>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}

      <Typography variant="h5" mb={2}>
        Practice library
      </Typography>

      <Grid container spacing={3}>
        {activities.map((activity) => (
          <Grid key={activity.id} size={{ xs: 12, md: 6 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box>
                      <Typography variant="h5">{activity.title}</Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {activity.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={activity.difficulty}
                      color={difficultyColor[activity.difficulty]}
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={activity.type} variant="outlined" size="small" />
                    <Chip
                      label={`${activity.questions} questions`}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Open practice is available through your teacher&apos;s forms.
                    The library activities are previews of the future catalog.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
