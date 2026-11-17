"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { lessons } from "@/features/lessons/data";

const statusColor: Record<string, "success" | "primary" | "default"> = {
  Completed: "success",
  "In progress": "primary",
  "Not started": "default",
};

export function LessonsOverview() {
  return (
    <Box mt={3}>
      <Breadcrumb title="Lessons" subtitle="Structured learning paths" />

      <Grid container spacing={3}>
        {lessons.map((lesson) => (
          <Grid key={lesson.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Typography variant="h5">{lesson.title}</Typography>
                    <Chip
                      label={lesson.status}
                      color={statusColor[lesson.status]}
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Chip label={lesson.level} variant="outlined" size="small" />
                    <Chip label={lesson.duration} variant="outlined" size="small" />
                  </Stack>

                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={0.5}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {lesson.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={lesson.progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
