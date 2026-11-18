"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  saveAvailabilityAction,
  saveTeacherProfileAction,
} from "@/features/teaching/actions";
import { formatMinuteOfDay, parseTimeOfDay } from "@/lib/timezone";
import { useAppToast } from "@/lib/use-app-toast";

export type EditableWindow = { weekday: number; startMinute: number; endMinute: number };

export type EditableTeacherProfile = {
  headline: string;
  bio: string;
  country: string;
  tags: string[];
};

type AvailabilityEditorProps = {
  windows: EditableWindow[];
  profile: EditableTeacherProfile;
  timeZone: string;
  upcomingClasses: number;
};

/** Monday first, as most calendars show it. */
const weekdays = [
  { value: 1, key: "monday" },
  { value: 2, key: "tuesday" },
  { value: 3, key: "wednesday" },
  { value: 4, key: "thursday" },
  { value: 5, key: "friday" },
  { value: 6, key: "saturday" },
  { value: 0, key: "sunday" },
] as const;

type Row = { key: string; weekday: number; start: string; end: string };

let rowCounter = 0;
const toRow = (window: EditableWindow): Row => ({
  key: `row-${(rowCounter += 1)}`,
  weekday: window.weekday,
  start: formatMinuteOfDay(window.startMinute),
  end: formatMinuteOfDay(window.endMinute),
});

export function AvailabilityEditor({
  windows,
  profile,
  timeZone,
  upcomingClasses,
}: AvailabilityEditorProps) {
  const t = useTranslations("educator");
  const { showError, showSuccess } = useAppToast();
  const [rows, setRows] = useState<Row[]>(() => windows.map(toRow));
  const [form, setForm] = useState({ ...profile, tagsText: profile.tags.join(", ") });
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addWindow = (weekday: number) =>
    setRows((current) => [...current, toRow({ weekday, startMinute: 9 * 60, endMinute: 12 * 60 })]);

  const saveAvailability = () => {
    setError(null);
    const parsed: EditableWindow[] = [];
    for (const row of rows) {
      const startMinute = parseTimeOfDay(row.start);
      const endMinute = parseTimeOfDay(row.end);
      if (startMinute === null || endMinute === null) {
        setError(t("teacher.availability.useTimeFormat"));
        return;
      }
      parsed.push({ weekday: row.weekday, startMinute, endMinute });
    }
    startSaving(async () => {
      const result = await saveAvailabilityAction(parsed);
      if (result.ok) showSuccess({ message: result.message });
      else {
        setError(result.message);
        showError({ message: result.message });
      }
    });
  };

  const saveProfile = () => {
    startSaving(async () => {
      const result = await saveTeacherProfileAction({
        headline: form.headline,
        bio: form.bio,
        country: form.country,
        tags: form.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      if (result.ok) showSuccess({ message: result.message });
      else showError({ message: result.message });
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("teacher.availability.title")}
        subtitle={t("teacher.availability.subtitle")}
        items={[
          { title: t("shell.roles.teacher"), to: "/teacher" },
          { title: t("teacher.availability.title") },
        ]}
      />

      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={<LinkButton href="/settings" color="inherit" size="small">{t("teacher.availability.change")}</LinkButton>}
      >
        {t("teacher.availability.timeZoneNote", { timeZone })}
        {upcomingClasses ? t("teacher.availability.upcomingNote", { count: upcomingClasses }) : ""}
      </Alert>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title={t("teacher.availability.weeklySchedule")}
            subtitle={t("teacher.availability.scheduleSubtitle")}
            action={
              <Button variant="contained" onClick={saveAvailability} disabled={saving}>
                {saving ? t("teacher.availability.saving") : t("teacher.availability.saveAvailability")}
              </Button>
            }
          >
            <Stack spacing={2.5}>
              {weekdays.map((day) => {
                const dayLabel = t(`weekdays.${day.key}`);
                const dayRows = rows.filter((row) => row.weekday === day.value);
                return (
                  <Box key={day.value}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {dayLabel}
                      </Typography>
                      <Button size="small" startIcon={<IconPlus size={15} />} onClick={() => addWindow(day.value)}>
                        {t("teacher.availability.addWindow")}
                      </Button>
                    </Stack>
                    {dayRows.length ? (
                      <Stack spacing={1}>
                        {dayRows.map((row) => (
                          <Stack key={row.key} direction="row" spacing={1.5} alignItems="center">
                            <TextField
                              type="time"
                              size="small"
                              label={t("teacher.availability.from")}
                              value={row.start}
                              onChange={(event) => update(row.key, { start: event.target.value })}
                              slotProps={{ htmlInput: { step: 1800 } }}
                            />
                            <TextField
                              type="time"
                              size="small"
                              label={t("teacher.availability.to")}
                              value={row.end}
                              onChange={(event) => update(row.key, { end: event.target.value })}
                              slotProps={{ htmlInput: { step: 1800 } }}
                            />
                            <IconButton
                              aria-label={t("teacher.availability.removeWindow", { day: dayLabel })}
                              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t("teacher.availability.notAvailable")}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={t("teacher.availability.publicProfile")} subtitle={t("teacher.availability.profileSubtitle")}>
            <Stack spacing={2}>
              <TextField
                label={t("teacher.availability.headline")}
                value={form.headline}
                onChange={(event) => setForm({ ...form, headline: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label={t("teacher.availability.location")}
                value={form.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <TextField
                label={t("teacher.availability.aboutYou")}
                multiline
                minRows={3}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <TextField
                label={t("teacher.availability.tags")}
                helperText={t("teacher.availability.tagsHelper")}
                value={form.tagsText}
                onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              />
              <Button variant="outlined" onClick={saveProfile} disabled={saving}>
                {t("teacher.availability.saveProfile")}
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
