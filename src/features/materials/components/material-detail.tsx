import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconMicrophone,
  IconPlayerPlay,
  IconVideo,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  MaterialKindChip,
  MaterialStatusChip,
} from "@/features/materials/components/material-kind-chip";
import { ShareMaterialDialog } from "@/features/materials/components/share-material-dialog";
import {
  formatMaterialDateTime,
  formatMaterialKind,
} from "@/features/materials/format";
import type {
  Assignment,
  FormQuestion,
  Material,
  MaterialGrant,
  Submission,
} from "@/features/materials/types";

const questionTypeLabels: Record<FormQuestion["type"], string> = {
  "multiple-choice": "Multiple choice",
  "short-answer": "Short answer",
  speaking: "Speaking",
  listening: "Listening",
};

type MaterialDetailProps = {
  material: Material;
  viewer: "teacher" | "student";
  grants?: MaterialGrant[];
  assignments?: Assignment[];
  submissions?: Submission[];
  questions?: FormQuestion[];
};

export function MaterialDetail({
  material,
  viewer,
  grants = [],
  assignments = [],
  submissions = [],
  questions = [],
}: MaterialDetailProps) {
  const isTeacher = viewer === "teacher";
  const libraryHref = isTeacher ? "/teacher/materials" : "/materials";
  const libraryLabel = isTeacher ? "Materials" : "My materials";

  return (
    <Box mt={3}>
      <Breadcrumb
        title={material.title}
        subtitle={`${materialKindLabelsForTitle(material)} · ${material.level}`}
        items={[
          { title: libraryLabel, to: libraryHref },
          { title: material.title },
        ]}
      />

      <Stack spacing={3}>
        <SectionCard
          title={material.title}
          subtitle={`By ${material.ownerName} · updated ${formatMaterialDateTime(material.updatedAt)}`}
          action={
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {isTeacher ? (
                <ShareMaterialDialog
                  materialId={material.id}
                  materialTitle={material.title}
                />
              ) : material.kind === "form" ? (
                <LinkButton
                  href={`/practice/${material.id}`}
                  size="small"
                  variant="contained"
                >
                  Start practice
                </LinkButton>
              ) : null}
              <LinkButton
                href={libraryHref}
                size="small"
                variant="outlined"
                startIcon={<IconArrowLeft size={15} />}
              >
                {libraryLabel}
              </LinkButton>
            </Stack>
          }
        >
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <MaterialKindChip kind={material.kind} />
              {isTeacher ? <MaterialStatusChip status={material.status} /> : null}
              <Chip label={material.level} size="small" variant="outlined" />
              {material.duration ? (
                <Chip
                  label={material.duration}
                  size="small"
                  variant="outlined"
                  icon={<IconClock size={13} />}
                />
              ) : null}
              {material.classId ? (
                <Chip
                  label="Linked to a class"
                  size="small"
                  variant="outlined"
                  icon={<IconCalendarEvent size={13} />}
                />
              ) : null}
            </Stack>

            <Typography color="text.secondary">{material.description}</Typography>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
              {material.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>

            <MaterialPreview material={material} questions={questions} />
          </Stack>
        </SectionCard>

        <SectionCard
          title={isTeacher ? "Shared with" : "How to use this"}
          subtitle={
            isTeacher
              ? "Every class, student, or cohort that received this material"
              : "This material is attached to your classes and practice plan"
          }
        >
          {grants.length ? (
            <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
              {grants.map((grant) => (
                <Stack
                  key={grant.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {grant.audienceLabel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shared by {grant.sharedBy} ·{" "}
                      {formatMaterialDateTime(grant.sharedAt)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={formatMaterialKind(grant.audience)}
                      size="small"
                      variant="outlined"
                    />
                    {grant.dueAt ? (
                      <Chip
                        label={`Due ${formatMaterialDateTime(grant.dueAt)}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Alert severity="info">
              {isTeacher
                ? "This material has not been shared yet. Use Share to assign it to a class or student."
                : "Open the class page to see when this material is used."}
            </Alert>
          )}
        </SectionCard>

        {isTeacher && assignments.length ? (
          <SectionCard
            title="Assignments and results"
            subtitle="Who received the form and how far they are"
          >
            <Stack spacing={3}>
              {assignments.map((assignment) => {
                const progress = assignment.totalStudents
                  ? Math.round(
                      (assignment.submitted / assignment.totalStudents) * 100,
                    )
                  : 0;
                const related = submissions.filter(
                  (submission) => submission.assignmentId === assignment.id,
                );

                return (
                  <Box key={assignment.id}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {assignment.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignment.audienceLabel}
                          {assignment.dueAt
                            ? ` · due ${formatMaterialDateTime(assignment.dueAt)}`
                            : ""}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${assignment.submitted}/${assignment.totalStudents} submitted`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
                    />
                    <Stack spacing={1}>
                      {related.map((submission) => (
                        <Stack
                          key={submission.id}
                          direction="row"
                          spacing={1}
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 26, height: 26, fontSize: 12 }}>
                              {submission.studentName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {submission.studentName}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {submission.score !== undefined ? (
                              <Typography variant="body2" fontWeight={600}>
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
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </SectionCard>
        ) : null}
      </Stack>
    </Box>
  );
}

function materialKindLabelsForTitle(material: Material) {
  return material.kind === "form" ? "Practice form" : formatMaterialKind(material.kind);
}

function MaterialPreview({
  material,
  questions,
}: {
  material: Material;
  questions: FormQuestion[];
}) {
  if (material.kind === "form") {
    return (
      <Box sx={{ p: 2.5, bgcolor: "grey.100" }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <IconFileText size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            {questions.length} questions · {material.estimatedMinutes ?? 5} minutes
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          {questions.map((question, index) => (
            <Stack
              key={question.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
            >
              <Typography variant="body2">
                {index + 1}. {question.prompt}
              </Typography>
              <Stack direction="row" spacing={0.75} flexShrink={0}>
                <Chip
                  label={questionTypeLabels[question.type]}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${question.points} pt`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  }

  if (material.kind === "recording" || material.kind === "audio" || material.kind === "video") {
    const Icon = material.kind === "audio" ? IconMicrophone : IconVideo;

    return (
      <Box
        sx={{
          p: 3,
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.main", color: "#fff" }}>
          <Icon size={26} />
        </Avatar>
        <Box flexGrow={1} minWidth={180}>
          <Typography variant="subtitle1" fontWeight={600}>
            {material.duration ?? "Media"} · {formatMaterialKind(material.kind)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {material.transcriptReady
              ? "Transcript ready. Playback and captions use the meeting provider in production."
              : "Transcript will appear after the provider finishes processing."}
          </Typography>
          {material.views !== undefined ? (
            <Typography variant="caption" color="text.secondary">
              {material.views} views
            </Typography>
          ) : null}
        </Box>
        <LinkButton
          href={material.href ?? "#"}
          size="small"
          variant="outlined"
          endIcon={<IconPlayerPlay size={14} />}
          disabled={!material.href}
        >
          Play
        </LinkButton>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5, bgcolor: "grey.100" }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
          <IconFileText size={20} />
        </Avatar>
        <Box flexGrow={1} minWidth={180}>
          <Typography variant="subtitle1" fontWeight={600}>
            {material.fileName ?? "Resource"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {material.fileSize ?? "Open the resource in a new view"}
          </Typography>
        </Box>
        <LinkButton
          href={material.href ?? "#"}
          size="small"
          variant="outlined"
          endIcon={<IconExternalLink size={14} />}
          disabled={!material.href}
        >
          Open
        </LinkButton>
      </Stack>
    </Box>
  );
}
