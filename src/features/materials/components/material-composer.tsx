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
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { createMaterialAction } from "@/features/materials/actions";
import { materialKindLabels, materialKindOptions } from "@/features/materials/data";
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

const questionTypes: FormQuestionType[] = [
  "multiple-choice",
  "short-answer",
  "speaking",
  "listening",
];

type DraftQuestion = {
  prompt: string;
  type: FormQuestionType;
};

export function MaterialComposer() {
  const [kind, setKind] = useState<MaterialKind>("document");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<MaterialLevel>("All levels");
  const [audience, setAudience] = useState<MaterialAudience>("class");
  const [visibility, setVisibility] = useState<"private" | "shared" | "global">("private");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { prompt: "", type: "multiple-choice" },
  ]);
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
            label="Type"
            value={kind}
            onChange={(event) => setKind(event.target.value as MaterialKind)}
          >
            {materialKindOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {materialKindLabels[option]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Level"
            value={level}
            onChange={(event) => setLevel(event.target.value as MaterialLevel)}
          >
            {levels.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Audience"
            value={audience}
            onChange={(event) =>
              setAudience(event.target.value as MaterialAudience)
            }
          >
            <MenuItem value="class">A class</MenuItem>
            <MenuItem value="student">One student</MenuItem>
            <MenuItem value="cohort">A cohort</MenuItem>
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            select
            fullWidth
            label="Who can see it"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as typeof visibility)}
            helperText={
              visibility === "global"
                ? "Every student, after a manager approves it."
                : visibility === "shared"
                  ? "Every teacher can find and use it."
                  : "Only you (and the classes you attach it to)."
            }
          >
            <MenuItem value="private">Private</MenuItem>
            <MenuItem value="shared">Shared with teachers</MenuItem>
            <MenuItem value="global">Academy library (needs approval)</MenuItem>
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Travel phrases deck"
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What will students do with this material?"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Due date (optional)"
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>

      {kind === "form" ? (
        <Box sx={{ p: 3, bgcolor: "grey.100" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box>
              <Typography variant="h6">Questions</Typography>
              <Typography variant="body2" color="text.secondary">
                The form runner grades multiple choice and collects the rest for
                teacher review.
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<IconPlus size={15} />}
              onClick={() =>
                setQuestions((current) => [
                  ...current,
                  { prompt: "", type: "multiple-choice" },
                ])
              }
            >
              Add question
            </Button>
          </Stack>

          <Stack spacing={2} divider={<Divider />}>
            {questions.map((question, index) => (
              <Stack
                key={index}
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "flex-start" }}
              >
                <TextField
                  fullWidth
                  label={`Question ${index + 1}`}
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(index, { prompt: event.target.value })
                  }
                />
                <TextField
                  select
                  label="Answer type"
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
                      {option.replace("-", " ")}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  aria-label={`Remove question ${index + 1}`}
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
            ))}
          </Stack>
        </Box>
      ) : null}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="contained" onClick={submit} disabled={pending}>
          {pending ? "Creating…" : "Create and share"}
        </Button>
      </Stack>
    </Stack>
  );
}
