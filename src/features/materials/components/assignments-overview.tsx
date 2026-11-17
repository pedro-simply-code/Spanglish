"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconClipboardCheck,
  IconClock,
  IconFileText,
  IconUsers,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  assignments,
  getMaterialById,
  getSubmissions,
} from "@/features/materials/data";
import { formatMaterialDateTime } from "@/features/materials/format";
import type { Submission } from "@/features/materials/types";

type AssignmentsOverviewProps = {
  ownerName: string;
};

export function AssignmentsOverview({ ownerName }: AssignmentsOverviewProps) {
  const ownAssignments = assignments.filter((assignment) => {
    const material = getMaterialById(assignment.materialId);
    return material?.ownerName === ownerName;
  });

  const ownSubmissions = ownAssignments.flatMap((assignment) =>
    getSubmissions(assignment.id),
  );
  const pending = ownSubmissions.filter(
    (submission) => submission.status === "submitted",
  );
  const graded = ownSubmissions.filter(
    (submission) => submission.status === "graded",
  );
  const average = graded.length
    ? Math.round(
        graded.reduce((sum, submission) => sum + (submission.score ?? 0), 0) /
          graded.length,
      )
    : 0;

  const stats = [
    {
      id: "open",
      label: "Open assignments",
      value: `${ownAssignments.filter((item) => item.status === "open").length}`,
      helper: "Waiting for students",
      icon: IconClipboardCheck,
    },
    {
      id: "pending",
      label: "To grade",
      value: `${pending.length}`,
      helper: "Submitted, not graded",
      icon: IconClock,
    },
    {
      id: "average",
      label: "Average score",
      value: `${average}%`,
      helper: "Graded submissions",
      icon: IconUsers,
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Assignments"
        subtitle="Share forms, track completion, and review results."
        items={[
          { title: "Teacher", to: "/teacher" },
          { title: "Assignments" },
        ]}
      />

      <Grid container spacing={3}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Grid key={stat.id} size={{ xs: 12, md: 4 }}>
              <Card elevation={9}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "primary.light",
                        color: "primary.main",
                      }}
                    >
                      <Icon size={24} />
                    </Avatar>
                    <Box>
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
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={12}>
          <Stack spacing={3}>
            {ownAssignments.map((assignment) => {
              const material = getMaterialById(assignment.materialId);
              const submissions = getSubmissions(assignment.id);
              const progress = assignment.totalStudents
                ? Math.round(
                    (assignment.submitted / assignment.totalStudents) * 100,
                  )
                : 0;

              return (
                <SectionCard
                  key={assignment.id}
                  title={assignment.title}
                  subtitle={`${assignment.audienceLabel} · assigned ${formatMaterialDateTime(assignment.assignedAt)}`}
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={assignment.status}
                        size="small"
                        color={
                          assignment.status === "open"
                            ? "warning"
                            : assignment.status === "grading"
                              ? "primary"
                              : "success"
                        }
                        variant="outlined"
                      />
                      {material ? (
                        <LinkButton
                          size="small"
                          variant="outlined"
                          href={`/teacher/materials/${material.id}`}
                          startIcon={<IconFileText size={14} />}
                        >
                          Open form
                        </LinkButton>
                      ) : null}
                    </Stack>
                  }
                >
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Typography variant="body2" color="text.secondary">
                        {assignment.submitted} of {assignment.totalStudents}{" "}
                        submitted · {assignment.graded} graded
                      </Typography>
                      {assignment.dueAt ? (
                        <Chip
                          label={`Due ${formatMaterialDateTime(assignment.dueAt)}`}
                          size="small"
                          variant="outlined"
                          icon={<IconClock size={13} />}
                        />
                      ) : null}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Stack spacing={1.5} divider={<Divider />}>
                      {submissions.map((submission) => (
                        <SubmissionRow
                          key={submission.id}
                          submission={submission}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </SectionCard>
              );
            })}

            {!ownAssignments.length ? (
              <SectionCard title="Nothing assigned yet">
                <Typography variant="body2" color="text.secondary">
                  Create a form from Materials and share it with a class to see
                  results here.
                </Typography>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
          {submission.studentName.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {submission.studentName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {submission.submittedAt
              ? `Submitted ${formatMaterialDateTime(submission.submittedAt)}`
              : "Not submitted yet"}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        {submission.score !== undefined ? (
          <Typography variant="subtitle2" fontWeight={700}>
            {submission.score}%
          </Typography>
        ) : null}
        <Chip
          label={submission.status}
          size="small"
          color={
            submission.status === "graded"
              ? "success"
              : submission.status === "submitted"
                ? "warning"
                : "default"
          }
          variant="outlined"
        />
      </Stack>
      {submission.feedback ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexBasis: { sm: "100%" } }}
        >
          {submission.feedback}
        </Typography>
      ) : null}
    </Stack>
  );
}
