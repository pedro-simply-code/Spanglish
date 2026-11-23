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
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  MaterialKindChip,
  MaterialStatusChip,
} from "@/features/materials/components/material-kind-chip";
import { PracticeGames } from "@/features/materials/components/practice-games";
import { ShareMaterialDialog } from "@/features/materials/components/share-material-dialog";
import {
  localizeAssignments,
  localizeFormQuestions,
  localizeMaterial,
  localizeMaterialGrants,
  localizeSubmissions,
} from "@/features/materials/data";
import {
  formatMaterialDateTime,
  formatMaterialKind,
  formatMaterialLevel,
} from "@/features/materials/format";
import type {
  Assignment,
  FormQuestion,
  Material,
  MaterialGrant,
  Submission,
} from "@/features/materials/types";

const questionTypeKeys: Record<FormQuestion["type"], string> = {
  "multiple-choice": "multipleChoice",
  "short-answer": "shortAnswer",
  speaking: "speaking",
  listening: "listening",
};

type MaterialDetailProps = {
  material: Material;
  viewer: "teacher" | "student";
  grants?: MaterialGrant[];
  assignments?: Assignment[];
  submissions?: Submission[];
  questions?: FormQuestion[];
};

type Translator = Awaited<ReturnType<typeof getTranslations<"educator.materials">>>;

export async function MaterialDetail({
  material: sourceMaterial,
  viewer,
  grants: sourceGrants = [],
  assignments: sourceAssignments = [],
  submissions: sourceSubmissions = [],
  questions: sourceQuestions = [],
}: MaterialDetailProps) {
  const t = await getTranslations("educator.materials");
  const locale = await getLocale();
  const isTeacher = viewer === "teacher";
  /** Learning copy is teacher-authored; students see it as stored (including demo seeds). */
  const material = isTeacher
    ? (localizeMaterial(sourceMaterial, t) ?? sourceMaterial)
    : sourceMaterial;
  const grants = isTeacher ? localizeMaterialGrants(sourceGrants, t) : sourceGrants;
  const assignments = isTeacher ? localizeAssignments(sourceAssignments, t) : sourceAssignments;
  const submissions = isTeacher ? localizeSubmissions(sourceSubmissions, t) : sourceSubmissions;
  const questions = isTeacher
    ? localizeFormQuestions(sourceQuestions, sourceMaterial.id, t)
    : sourceQuestions;
  const libraryHref = isTeacher ? "/teacher/materials" : "/study?tab=materials";
  const libraryLabel = isTeacher ? t("detail.title") : t("studentOverview.title");

  return (
    <Box>
      <Breadcrumb
        title={material.title}
        subtitle={`${materialKindLabelForTitle(material, t)} · ${formatMaterialLevel(material.level, t)}`}
        items={[
          { title: libraryLabel, to: libraryHref },
          { title: material.title },
        ]}
      />

      <Stack spacing={3}>
        <SectionCard
          title={material.title}
          subtitle={t("detail.createdByUpdated", {
            name: material.ownerName,
            date: formatMaterialDateTime(material.updatedAt, locale),
          })}
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
                  {t("detail.startPractice")}
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
              <Chip label={formatMaterialLevel(material.level, t)} size="small" variant="outlined" />
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
                  label={t("detail.linkedToClass")}
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

            <MaterialPreview material={material} questions={questions} t={t} />
          </Stack>
        </SectionCard>

        <SectionCard
          title={isTeacher ? t("detail.sharedWith") : t("detail.howToUse")}
          subtitle={
            isTeacher
              ? t("detail.sharedWithSubtitle")
              : t("detail.howToUseSubtitle")
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
                      {t("detail.sharedBy", {
                        name: grant.sharedBy,
                        date: formatMaterialDateTime(grant.sharedAt, locale),
                      })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={t(`audience.${grant.audience}`)}
                      size="small"
                      variant="outlined"
                    />
                    {grant.dueAt ? (
                      <Chip
                        label={t("detail.due", { date: formatMaterialDateTime(grant.dueAt, locale) })}
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
              {isTeacher ? t("detail.notSharedTeacher") : t("detail.notSharedStudent")}
            </Alert>
          )}
        </SectionCard>

        {isTeacher && assignments.length ? (
          <SectionCard
            title={t("detail.assignmentsTitle")}
            subtitle={t("detail.assignmentsSubtitle")}
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
                            ? t("detail.dueAssignment", {
                                date: formatMaterialDateTime(assignment.dueAt, locale),
                              })
                            : ""}
                        </Typography>
                      </Box>
                      <Chip
                        label={t("detail.submittedCount", {
                          submitted: assignment.submitted,
                          total: assignment.totalStudents,
                        })}
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
                              label={t(`detail.submission.${submission.status}`)}
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

function materialKindLabelForTitle(material: Material, t: Translator) {
  return material.kind === "form"
    ? t("detail.practiceForm")
    : formatMaterialKind(material.kind, t);
}

function MaterialPreview({
  material,
  questions,
  t,
}: {
  material: Material;
  questions: FormQuestion[];
  t: Translator;
}) {
  if (material.kind === "practice") {
    return (
      <Box sx={{ pt: 1 }}>
        <PracticeGames items={material.practiceItems ?? []} />
      </Box>
    );
  }

  if (material.kind === "form") {
    return (
      <Box sx={{ p: 2.5, bgcolor: "grey.100" }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <IconFileText size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            {t("detail.questionsMinutes", {
              count: questions.length,
              minutes: material.estimatedMinutes ?? 5,
            })}
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
                  label={t(`questionType.${questionTypeKeys[question.type]}`)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={t("detail.point", { count: question.points })}
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
            {material.duration ?? t("detail.media")} · {formatMaterialKind(material.kind, t)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {material.transcriptReady
              ? t("detail.transcriptReady")
              : t("detail.transcriptPending")}
          </Typography>
          {material.views !== undefined ? (
            <Typography variant="caption" color="text.secondary">
              {t("detail.views", { count: material.views })}
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
          {t("detail.play")}
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
            {material.fileName ?? t("detail.resource")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {material.fileSize ?? t("detail.openResource")}
          </Typography>
        </Box>
        <LinkButton
          href={material.href ?? "#"}
          size="small"
          variant="outlined"
          endIcon={<IconExternalLink size={14} />}
          disabled={!material.href}
        >
          {t("detail.open")}
        </LinkButton>
      </Stack>
    </Box>
  );
}
