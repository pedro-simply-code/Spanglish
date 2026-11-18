"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { AssignmentStatusChip } from "@/features/learning";
import { submitAssignmentAction } from "@/features/learning/actions";
import type { AssignmentDetail } from "@/lib/learning-types";
import { useAppToast } from "@/lib/use-app-toast";

/** Answer a practice form; after grading, review answers, points and feedback. */
export function AssignmentRunner({
  assignment,
  timeZone,
}: {
  assignment: AssignmentDetail;
  timeZone: string;
}) {
  const t = useTranslations("student.learn.runner");
  const format = useFormatter();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const submission = assignment.mySubmission;
  const graded = submission?.status === "graded";
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (submission?.answers ?? []).map((item) => [item.questionId, item.answer]),
    ),
  );
  const answered = assignment.questions.filter((q) =>
    (answers[q.id] ?? "").trim(),
  ).length;

  const submit = () =>
    startTransition(async () => {
      const result = await submitAssignmentAction({
        assignmentId: assignment.id,
        answers,
      });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box mt={3}>
      <Breadcrumb
        title={assignment.title}
        subtitle={t("subtitle", {
          topic: assignment.classTopic,
          teacher: assignment.teacherName,
        })}
        items={[
          { title: t("practice"), to: "/practice" },
          { title: assignment.title },
        ]}
      />
      <Stack spacing={3}>
        <SectionCard
          title={t("questionsTitle", {
            count: assignment.questionCount,
            total: assignment.maxScore,
          })}
          subtitle={
            assignment.dueAt
              ? t("due", {
                  date: format.dateTime(new Date(assignment.dueAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone,
                  }),
                })
              : undefined
          }
          action={<AssignmentStatusChip assignment={assignment} />}
        >
          <Stack spacing={3}>
            {assignment.instructions ? (
              <Typography color="text.secondary">
                {assignment.instructions}
              </Typography>
            ) : null}
            {graded ? (
              <Alert severity="success">
                {t("gradedSummary", {
                  score: submission.score ?? 0,
                  total: submission.maxScore,
                })}
                {submission.feedback ? ` — ${submission.feedback}` : ""}
              </Alert>
            ) : submission ? (
              <Alert severity="info">{t("waiting")}</Alert>
            ) : null}

            {assignment.questions.map((question, index) => {
              const mine = submission?.answers.find(
                (item) => item.questionId === question.id,
              );
              const isChoice =
                question.type === "multiple-choice" && question.options?.length;
              return (
                <Box key={question.id}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {index + 1}. {question.prompt}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t("points", { count: question.points })}
                    />
                    {graded ? (
                      <Chip
                        size="small"
                        color={
                          (mine?.points ?? 0) >= question.points
                            ? "success"
                            : "default"
                        }
                        label={t("earned", {
                          points: mine?.points ?? 0,
                          max: question.points,
                        })}
                      />
                    ) : null}
                  </Stack>
                  {isChoice ? (
                    <RadioGroup
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers({
                          ...answers,
                          [question.id]: event.target.value,
                        })
                      }
                    >
                      {question.options!.map((option, optionIndex) => {
                        const correct =
                          graded && question.correctOption === optionIndex;
                        const wrongPick =
                          graded &&
                          answers[question.id] === String(optionIndex) &&
                          !correct;
                        return (
                          <FormControlLabel
                            key={optionIndex}
                            value={String(optionIndex)}
                            disabled={graded}
                            control={<Radio size="small" />}
                            label={
                              <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                              >
                                <span>{option}</span>
                                {correct ? (
                                  <Box
                                    component="span"
                                    sx={{
                                      color: "success.main",
                                      display: "inline-flex",
                                    }}
                                  >
                                    <IconCheck size={16} />
                                  </Box>
                                ) : null}
                                {wrongPick ? (
                                  <Box
                                    component="span"
                                    sx={{
                                      color: "error.main",
                                      display: "inline-flex",
                                    }}
                                  >
                                    <IconX size={16} />
                                  </Box>
                                ) : null}
                              </Stack>
                            }
                          />
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <TextField
                      fullWidth
                      multiline
                      minRows={question.type === "short-answer" ? 2 : 3}
                      disabled={graded}
                      placeholder={t(
                        `placeholder.${question.type === "short-answer" ? "text" : question.type}`,
                      )}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers({
                          ...answers,
                          [question.id]: event.target.value,
                        })
                      }
                    />
                  )}
                </Box>
              );
            })}

            {!graded ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  disabled={pending || answered < assignment.questions.length}
                  onClick={submit}
                >
                  {submission ? t("resubmit") : t("submit")}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {t("progress", {
                    answered,
                    total: assignment.questions.length,
                  })}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </SectionCard>
        <LinkButton
          href="/practice"
          variant="text"
          startIcon={<IconArrowLeft size={16} />}
          sx={{ alignSelf: "flex-start" }}
        >
          {t("back")}
        </LinkButton>
      </Stack>
    </Box>
  );
}
