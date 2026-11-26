"use client";

import { useState, useTransition } from "react";
import { useAppToast } from "@/lib/use-app-toast";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { createMaterialAction } from "@/features/materials/actions";
import { materialKindOptions } from "@/features/materials/data";
import { LessonSettingsEditor } from "@/features/materials/components/lesson-settings-editor";
import { DEFAULT_LESSON, type LessonSettings } from "@/lib/lesson";
import {
  blankPracticeItem,
  PracticeItemsEditor,
  type DraftPracticeItem,
} from "@/features/materials/components/practice-items-editor";
import type {
  FormQuestionType,
  MaterialActionResult,
  MaterialAudience,
  MaterialKind,
  MaterialLevel,
} from "@/features/materials/types";

const levels: MaterialLevel[] = [
  "All levels",
  "Beginner",
  "Intermediate",
  "Advanced",
];

const levelKeys: Record<MaterialLevel, string> = {
  "All levels": "all",
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
};

const questionTypes: FormQuestionType[] = [
  "multiple-choice",
  "short-answer",
  "speaking",
  "listening",
];

const questionTypeKeys: Record<FormQuestionType, string> = {
  "multiple-choice": "multipleChoice",
  "short-answer": "shortAnswer",
  speaking: "speaking",
  listening: "listening",
};

type DraftQuestion = {
  prompt: string;
  type: FormQuestionType;
  /** Multiple choice: up to four options and the right one. */
  options: string[];
  correctOption: number;
  points: number;
};

const blankQuestion = (): DraftQuestion => ({
  prompt: "",
  type: "multiple-choice",
  options: ["", "", "", ""],
  correctOption: 0,
  points: 1,
});

export function MaterialComposer() {
  const t = useTranslations("educator.materials");
  const [kind, setKind] = useState<MaterialKind>("document");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<MaterialLevel>("All levels");
  const [audience, setAudience] = useState<MaterialAudience>("class");
  const [visibility, setVisibility] = useState<"private" | "shared" | "global">("private");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [practiceItems, setPracticeItems] = useState<DraftPracticeItem[]>(() =>
    Array.from({ length: 4 }, blankPracticeItem),
  );
  const [lesson, setLesson] = useState<LessonSettings>(DEFAULT_LESSON);
  const [result, setResult] = useState<MaterialActionResult | null>(null);
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((current) =>
      current.map((question, position) =>
        position === index ? { ...question, ...patch } : question,
      ),
    );
  };

  const submit = () => {
    startTransition(async () => {
      const response = await createMaterialAction({
        kind,
        title,
        description,
        level,
        audience,
        visibility,
        dueAt: dueAt || undefined,
        questions: kind === "form" ? questions : undefined,
        practiceItems:
          kind === "practice"
            ? practiceItems.map((item) => ({
                id: item.key,
                term: item.term,
                translation: item.translation,
                example: item.example,
                exampleTranslation: item.exampleTranslation,
                audio: item.audio,
              }))
            : undefined,
        lesson: kind === "practice" ? lesson : undefined,
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
    <Stack spacing={3} component="form" onSubmit={(event) => event.preventDefault()}>
      {result ? (
        <Alert
          severity={result.ok ? "success" : "error"}
          onClose={() => setResult(null)}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {result.title}
          </Typography>
          {result.message}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label={t("composer.type")}
            value={kind}
            onChange={(event) => setKind(event.target.value as MaterialKind)}
          >
            {materialKindOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`kind.${option}`)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label={t("composer.level")}
            value={level}
            onChange={(event) => setLevel(event.target.value as MaterialLevel)}
          >
            {levels.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`level.${levelKeys[option]}`)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label={t("composer.audience")}
            value={audience}
            onChange={(event) =>
              setAudience(event.target.value as MaterialAudience)
            }
          >
            <MenuItem value="class">{t("audience.class")}</MenuItem>
            <MenuItem value="student">{t("audience.student")}</MenuItem>
            <MenuItem value="cohort">{t("audience.cohort")}</MenuItem>
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            select
            fullWidth
            label={t("composer.whoCanSee")}
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as typeof visibility)}
            helperText={
              visibility === "global"
                ? t("visibility.globalHelp")
                : visibility === "shared"
                  ? t("visibility.sharedHelp")
                  : t("visibility.privateHelp")
            }
          >
            <MenuItem value="private">{t("visibility.private")}</MenuItem>
            <MenuItem value="shared">{t("visibility.shared")}</MenuItem>
            <MenuItem value="global">{t("visibility.global")}</MenuItem>
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            label={t("composer.title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("composer.titlePlaceholder")}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={t("composer.description")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("composer.descriptionPlaceholder")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label={t("composer.dueDate")}
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>

      {kind === "practice" ? (
        <Box sx={{ p: 3, bgcolor: "grey.100" }}>
          <PracticeItemsEditor items={practiceItems} onChange={setPracticeItems} />
          <Box mt={4}>
            <LessonSettingsEditor
              items={practiceItems.map((item) => ({ ...item, id: item.key }))}
              value={lesson}
              onChange={setLesson}
            />
          </Box>
        </Box>
      ) : null}

      {kind === "form" ? (
        <Box sx={{ p: 3, bgcolor: "grey.100" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box>
              <Typography variant="h6">{t("composer.questions")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("composer.questionsHelp")}
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<IconPlus size={15} />}
              onClick={() =>
                setQuestions((current) => [...current, blankQuestion()])
              }
            >
              {t("composer.addQuestion")}
            </Button>
          </Stack>

          <Stack spacing={2} divider={<Divider />}>
            {questions.map((question, index) => (
              <Stack key={index} spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "flex-start" }}
              >
                <TextField
                  fullWidth
                  label={t("composer.question", { number: index + 1 })}
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(index, { prompt: event.target.value })
                  }
                />
                <TextField
                  select
                  label={t("composer.answerType")}
                  value={question.type}
                  onChange={(event) =>
                    updateQuestion(index, {
                      type: event.target.value as FormQuestionType,
                    })
                  }
                  sx={{ minWidth: 180 }}
                >
                  {questionTypes.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(`questionType.${questionTypeKeys[option]}`)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="number"
                  label={t("composer.points")}
                  value={question.points}
                  onChange={(event) =>
                    updateQuestion(index, {
                      points: Math.max(1, Math.min(100, Number(event.target.value) || 1)),
                    })
                  }
                  sx={{ width: 100 }}
                />
                <IconButton
                  aria-label={t("composer.removeQuestion", { number: index + 1 })}
                  onClick={() =>
                    setQuestions((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                  disabled={questions.length === 1}
                  sx={{ mt: { sm: 0.5 } }}
                >
                  <IconTrash size={18} />
                </IconButton>
              </Stack>
              {question.type === "multiple-choice" ? (
                <RadioGroup
                  value={String(question.correctOption)}
                  onChange={(event) =>
                    updateQuestion(index, { correctOption: Number(event.target.value) })
                  }
                >
                  <Typography variant="caption" color="text.secondary">
                    {t("composer.optionsHelp")}
                  </Typography>
                  <Grid container spacing={1} mt={0.5}>
                    {question.options.map((option, optionIndex) => (
                      <Grid key={optionIndex} size={{ xs: 12, sm: 6 }}>
                        <Stack direction="row" alignItems="center">
                          <Radio
                            value={String(optionIndex)}
                            size="small"
                            inputProps={{ "aria-label": t("composer.correctOption") }}
                          />
                          <TextField
                            size="small"
                            fullWidth
                            label={t("composer.option", { number: optionIndex + 1 })}
                            value={option}
                            onChange={(event) =>
                              updateQuestion(index, {
                                options: question.options.map((value, position) =>
                                  position === optionIndex ? event.target.value : value,
                                ),
                              })
                            }
                          />
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              ) : null}
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : null}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="contained" onClick={submit} disabled={pending}>
          {pending ? t("composer.creating") : t("composer.createAndShare")}
        </Button>
      </Stack>
    </Stack>
  );
}
