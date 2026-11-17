"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconMicrophone,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { submitPracticeAction } from "@/features/materials/actions";
import { useAppToast } from "@/lib/use-app-toast";
import { formatMaterialDateTime } from "@/features/materials/format";
import type {
  FormQuestion,
  Material,
  PracticeResult,
} from "@/features/materials/types";

const questionTypeLabels: Record<FormQuestion["type"], string> = {
  "multiple-choice": "Multiple choice",
  "short-answer": "Short answer",
  speaking: "Speaking",
  listening: "Listening",
};

type FormRunnerProps = {
  material: Material;
  questions: FormQuestion[];
  dueAt?: string;
};

export function FormRunner({ material, questions, dueAt }: FormRunnerProps) {
  const [answers, setAnswers] = useState<string[]>(
    questions.map(() => ""),
  );
  const [result, setResult] = useState<PracticeResult | null>(null);
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const totalPoints = questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );
  const answered = answers.filter((answer) => answer.trim()).length;

  const updateAnswer = (index: number, value: string) => {
    setAnswers((current) =>
      current.map((answer, position) => (position === index ? value : answer)),
    );
  };

  const submit = () => {
    startTransition(async () => {
      const response = await submitPracticeAction({
        materialId: material.id,
        answers,
      });

      setResult(response);
      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={material.title}
        subtitle={`${questions.length} questions · ${material.estimatedMinutes ?? 5} minutes${
          dueAt ? ` · due ${formatMaterialDateTime(dueAt)}` : ""
        }`}
        items={[
          { title: "Practice", to: "/practice" },
          { title: material.title },
        ]}
      />

      <SectionCard
        title={material.title}
        subtitle={material.description}
        action={
          <LinkButton
            href="/practice"
            size="small"
            variant="outlined"
            startIcon={<IconArrowLeft size={15} />}
          >
            All practice
          </LinkButton>
        }
      >
        {result ? (
          <Alert
            severity={result.ok ? "success" : "error"}
            sx={{ mb: 3 }}
            onClose={() => setResult(null)}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              {result.title}
            </Typography>
            {result.message}
            {result.ok && result.score !== undefined && result.total ? (
              <Typography variant="body2" mt={1}>
                Demo score: {result.score} of {result.total} points.
              </Typography>
            ) : null}
          </Alert>
        ) : null}

        <Stack spacing={3} divider={<Divider />}>
          {questions.map((question, index) => (
            <Box key={question.id}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                mb={1.5}
              >
                <Typography variant="subtitle1" fontWeight={600}>
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

              {question.type === "multiple-choice" && question.options ? (
                <RadioGroup
                  value={answers[index] ?? ""}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                >
                  {question.options.map((option) => (
                    <FormControlLabel
                      key={option}
                      value={option}
                      control={<Radio size="small" />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
              ) : (
                <Stack spacing={1}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={question.type === "speaking" ? 3 : 2}
                    label={
                      question.type === "speaking"
                        ? "Write what you would say"
                        : question.type === "listening"
                          ? "What did you hear?"
                          : "Your answer"
                    }
                    value={answers[index] ?? ""}
                    onChange={(event) =>
                      updateAnswer(index, event.target.value)
                    }
                  />
                  {question.type === "speaking" ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconMicrophone size={15} />
                      <Typography variant="caption" color="text.secondary">
                        Audio capture connects to the storage provider in
                        production; today the answer is reviewed as text.
                      </Typography>
                    </Stack>
                  ) : null}
                  {question.type === "listening" ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconPlayerPlay size={15} />
                      <Typography variant="caption" color="text.secondary">
                        The audio clip is part of the class materials.
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          mt={3}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconClock size={15} />
            <Typography variant="body2" color="text.secondary">
              {answered} of {questions.length} answered · {totalPoints} points
              total
            </Typography>
          </Stack>
          <Button
            variant="contained"
            onClick={submit}
            disabled={pending || !questions.length}
            startIcon={<IconCheck size={16} />}
          >
            {pending ? "Submitting…" : "Submit practice"}
          </Button>
        </Stack>
      </SectionCard>
    </Box>
  );
}
