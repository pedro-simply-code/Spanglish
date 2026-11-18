"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { gradeSubmissionAction } from "@/features/learning/actions";
import type {
  AssignmentDetail,
  AssignmentSummary,
  SubmissionView,
} from "@/lib/learning-types";
import { useAppToast } from "@/lib/use-app-toast";

type TeacherAssignmentsProps = {
  assignments: AssignmentSummary[];
  selected: AssignmentDetail | null;
  timeZone: string;
};

/** Teacher: practice forms assigned from classes, submissions and grading. */
export function TeacherAssignments({
  assignments,
  selected,
  timeZone,
}: TeacherAssignmentsProps) {
  const t = useTranslations("student.learn.teacher");
  const tRoot = useTranslations("educator");
  const format = useFormatter();
  const router = useRouter();
  const date = (iso: string) =>
    format.dateTime(new Date(iso), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });

  return (
    <Box mt={3}>
      <Breadcrumb
        title={tRoot("teacher.assignments.title")}
        subtitle={tRoot("teacher.assignments.subtitle")}
        items={[
          { title: tRoot("shell.roles.teacher"), to: "/teacher" },
          { title: tRoot("teacher.assignments.title") },
        ]}
      />
      <Stack spacing={3}>
        <SectionCard title={t("listTitle")} subtitle={t("listSubtitle")}>
          {assignments.length ? (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("form")}</TableCell>
                    <TableCell>{t("class")}</TableCell>
                    <TableCell>{t("due")}</TableCell>
                    <TableCell align="right">{t("submitted")}</TableCell>
                    <TableCell align="right">{t("toGrade")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((item) => {
                    const toGrade = item.submittedCount - item.gradedCount;
                    return (
                      <TableRow
                        key={item.id}
                        hover
                        selected={selected?.id === item.id}
                        onClick={() =>
                          router.push(`/teacher/assignments?id=${item.id}`)
                        }
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Typography
                            component={Link}
                            href={`/teacher/assignments?id=${item.id}`}
                            variant="body2"
                            fontWeight={600}
                            color="text.primary"
                            sx={{ textDecoration: "none" }}
                          >
                            {item.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.classTopic}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {date(item.classStartsAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.dueAt ? date(item.dueAt) : "—"}
                        </TableCell>
                        <TableCell align="right">
                          {item.submittedCount}/{item.totalStudents}
                        </TableCell>
                        <TableCell align="right">
                          {toGrade ? (
                            <Chip
                              size="small"
                              color="warning"
                              label={toGrade}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography color="text.secondary">{t("empty")}</Typography>
          )}
        </SectionCard>

        {selected ? (
          <SectionCard
            title={selected.title}
            subtitle={t("detailSubtitle", {
              topic: selected.classTopic,
              count: selected.questionCount,
              total: selected.maxScore,
            })}
          >
            {selected.submissions.length ? (
              <Stack spacing={3} divider={<Divider />}>
                {selected.submissions.map((submission) => (
                  <SubmissionGrader
                    key={submission.id}
                    assignment={selected}
                    submission={submission}
                    timeZone={timeZone}
                  />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                {t("noSubmissions")}
              </Typography>
            )}
          </SectionCard>
        ) : null}
      </Stack>
    </Box>
  );
}

function SubmissionGrader({
  assignment,
  submission,
  timeZone,
}: {
  assignment: AssignmentDetail;
  submission: SubmissionView;
  timeZone: string;
}) {
  const t = useTranslations("student.learn.teacher");
  const format = useFormatter();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      submission.answers.map((answer) => [
        answer.questionId,
        answer.points ?? 0,
      ]),
    ),
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  const save = () =>
    startTransition(async () => {
      const result = await gradeSubmissionAction({
        submissionId: submission.id,
        points,
        feedback,
      });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="h6">{submission.studentName}</Typography>
        <Typography variant="caption" color="text.secondary">
          {format.dateTime(new Date(submission.submittedAt), {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
          })}
        </Typography>
        {submission.status === "graded" ? (
          <Chip
            size="small"
            color="success"
            label={t("score", {
              score: submission.score ?? 0,
              total: submission.maxScore,
            })}
          />
        ) : (
          <Chip size="small" color="warning" label={t("needsGrading")} />
        )}
      </Stack>
      <Stack spacing={2}>
        {assignment.questions.map((question, index) => {
          const answer = submission.answers.find(
            (item) => item.questionId === question.id,
          );
          const auto =
            question.type === "multiple-choice" &&
            question.correctOption !== undefined;
          const chosen = auto ? Number(answer?.answer) : null;
          return (
            <Grid
              container
              spacing={2}
              key={question.id}
              alignItems="flex-start"
            >
              <Grid size={{ xs: 12, md: 9 }}>
                <Typography variant="body2" fontWeight={600}>
                  {index + 1}. {question.prompt}
                </Typography>
                {auto ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    mt={0.5}
                  >
                    {chosen === question.correctOption ? (
                      <Box
                        component="span"
                        sx={{ color: "success.main", display: "inline-flex" }}
                      >
                        <IconCheck size={16} />
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{ color: "error.main", display: "inline-flex" }}
                      >
                        <IconX size={16} />
                      </Box>
                    )}
                    <Typography variant="body2">
                      {question.options?.[chosen ?? -1] ?? "—"}
                      {chosen !== question.correctOption
                        ? ` · ${t("correctWas", { answer: question.options?.[question.correctOption ?? 0] ?? "" })}`
                        : ""}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
                  >
                    {answer?.answer || "—"}
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                {auto ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign={{ md: "right" }}
                  >
                    {t("points", {
                      points: answer?.points ?? 0,
                      max: question.points,
                    })}
                  </Typography>
                ) : (
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    label={t("pointsOf", { max: question.points })}
                    value={points[question.id] ?? 0}
                    onChange={(event) =>
                      setPoints({
                        ...points,
                        [question.id]: Math.max(
                          0,
                          Math.min(
                            question.points,
                            Number(event.target.value) || 0,
                          ),
                        ),
                      })
                    }
                  />
                )}
              </Grid>
            </Grid>
          );
        })}
        <TextField
          label={t("feedback")}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          multiline
          minRows={2}
        />
        <Button
          variant="contained"
          size="small"
          sx={{ alignSelf: "flex-start" }}
          disabled={pending}
          onClick={save}
        >
          {submission.status === "graded" ? t("updateGrade") : t("saveGrade")}
        </Button>
      </Stack>
    </Box>
  );
}
