"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { updateProfileAction } from "@/features/auth/actions";
import { useErrorText } from "@/features/auth/components/use-error-text";
import type {
  learningLanguages,
  learningLevels,
  profileLocales,
} from "@/lib/profile-schema";

type Locale = (typeof profileLocales)[number];
type LearningLanguage = (typeof learningLanguages)[number];
type Level = (typeof learningLevels)[number];

export type EditableProfile = {
  name: string;
  email: string;
  locale: Locale;
  timezone: string | null;
  learningLanguage: LearningLanguage | null;
  level: Level | null;
  goal: string | null;
};

function timeZones(current: string) {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes(current) ? zones : [current, ...zones];
  } catch {
    return [current];
  }
}

/** Settings → Profile: the onboarding answers, editable. */
export function ProfileSettings({ profile }: { profile: EditableProfile }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name);
  const [locale, setLocale] = useState<Locale>(profile.locale);
  const [timezone, setTimezone] = useState(profile.timezone ?? "UTC");
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>(
    profile.learningLanguage ?? "spanish",
  );
  const [level, setLevel] = useState<Level>(profile.level ?? "beginner");
  const [goal, setGoal] = useState(profile.goal ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const zones = useMemo(() => timeZones(timezone), [timezone]);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        name,
        locale,
        timezone,
        learningLanguage,
        level,
        goal,
      });
      if (!result.ok) {
        setFeedback({ ok: false, text: errorText(result.code ?? "SAVE_FAILED") });
        return;
      }
      setFeedback({ ok: true, text: t("profile.saved") });
      router.refresh();
    });
  };

  return (
    <Box component="form" onSubmit={save} noValidate>
      <Typography variant="h6">{t("profile.title")}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t("profile.subtitle")}
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t("onboarding.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t("common.email")}
            value={profile.email}
            helperText={t("profile.emailNote")}
            disabled
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label={t("onboarding.appLanguage")}
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            disabled={pending}
            fullWidth
          >
            <MenuItem value="en">{t("language.en")}</MenuItem>
            <MenuItem value="es">{t("language.es")}</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label={t("onboarding.timezone")}
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={pending}
            fullWidth
          >
            {zones.map((zone) => (
              <MenuItem key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label={t("onboarding.learn")}
            value={learningLanguage}
            onChange={(event) => setLearningLanguage(event.target.value as LearningLanguage)}
            disabled={pending}
            fullWidth
          >
            <MenuItem value="spanish">{t("onboarding.learningLanguages.spanish")}</MenuItem>
            <MenuItem value="english">{t("onboarding.learningLanguages.english")}</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label={t("onboarding.level")}
            value={level}
            onChange={(event) => setLevel(event.target.value as Level)}
            disabled={pending}
            fullWidth
          >
            <MenuItem value="beginner">{t("onboarding.levels.beginner")}</MenuItem>
            <MenuItem value="intermediate">{t("onboarding.levels.intermediate")}</MenuItem>
            <MenuItem value="advanced">{t("onboarding.levels.advanced")}</MenuItem>
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            label={t("onboarding.goal")}
            placeholder={t("onboarding.goalPlaceholder")}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            disabled={pending}
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </Grid>
      </Grid>
      {feedback ? (
        <Alert severity={feedback.ok ? "success" : "error"} sx={{ mt: 2 }}>
          {feedback.text}
        </Alert>
      ) : null}
      <Box mt={2}>
        <Button type="submit" variant="contained" disabled={pending}>
          {t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}
