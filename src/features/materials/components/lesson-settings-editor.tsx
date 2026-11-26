"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { LessonPlayer } from "@/features/materials/components/lesson-player";
import {
  availableExercises,
  EXERCISE_TYPES,
  LESSON_LENGTHS,
  type ExerciseType,
  type LessonSettings,
} from "@/lib/lesson";
import type { PracticeItem } from "@/lib/practice-games";

/**
 * Which kinds of exercise the lesson mixes and how long it is. Kinds the
 * words can't feed yet (no example sentence, too few words) are shown off,
 * with a hint on what's missing.
 */
export function LessonSettingsEditor({
  items,
  value,
  onChange,
}: {
  items: PracticeItem[];
  value: LessonSettings;
  onChange: (value: LessonSettings) => void;
}) {
  const t = useTranslations("educator.materials.lessonSettings");
  const [preview, setPreview] = useState(false);
  const counts = availableExercises(items);
  const ready = items.filter((item) => item.term.trim() && item.translation.trim()).length >= 4;

  const toggle = (type: ExerciseType, on: boolean) => {
    const types = on ? [...value.types, type] : value.types.filter((other) => other !== type);
    if (types.length) onChange({ ...value, types: EXERCISE_TYPES.filter((other) => types.includes(other)) });
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">{t("title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("help")}
        </Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 1 }}>
        {EXERCISE_TYPES.map((type) => {
          const available = counts[type] > 0;
          const control = (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  size="small"
                  checked={value.types.includes(type)}
                  onChange={(event) => toggle(type, event.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600} color={available ? "text.primary" : "text.disabled"}>
                    {t(`types.${type}`)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {available ? t(`hints.${type}`) : t(type === "fill" || type === "build" ? "needsSentence" : "needsWords")}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start", m: 0, p: 1, borderRadius: 2, bgcolor: "background.paper", "& .MuiCheckbox-root": { pt: 0.25 } }}
            />
          );
          return available ? (
            control
          ) : (
            <Tooltip key={type} title={t("unavailable")}>
              {control}
            </Tooltip>
          );
        })}
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <TextField
          select
          size="small"
          label={t("length")}
          value={value.length}
          onChange={(event) => onChange({ ...value, length: Number(event.target.value) })}
          sx={{ minWidth: 200 }}
        >
          {LESSON_LENGTHS.map((length) => (
            <MenuItem key={length} value={length}>
              {t("lengthOption", { count: length, minutes: Math.round(length / 3) })}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title={ready ? "" : t("needsWords")}>
          <span>
            <Button
              variant="outlined"
              startIcon={<IconPlayerPlay size={16} />}
              disabled={!ready}
              onClick={() => setPreview(true)}
            >
              {t("tryIt")}
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Dialog open={preview} onClose={() => setPreview(false)} fullWidth maxWidth="md">
        <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
          {preview ? <LessonPlayer items={items} settings={value} title={t("previewTitle")} /> : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
