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
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

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
        setError("Use times like 09:00.");
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
        title="Availability"
        subtitle="Weekly times students can book. Booked classes stay as they are when you change this."
        items={[{ title: "Teacher", to: "/teacher" }, { title: "Availability" }]}
      />

      <Alert severity="info" sx={{ mb: 3 }} action={<LinkButton href="/settings" color="inherit" size="small">Change</LinkButton>}>
        Times are in your time zone: <strong>{timeZone}</strong>. Students see them converted to theirs.
        {upcomingClasses ? ` You have ${upcomingClasses} upcoming classes.` : ""}
      </Alert>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="Weekly schedule"
            subtitle="Classes start every 30 minutes inside these windows."
            action={
              <Button variant="contained" onClick={saveAvailability} disabled={saving}>
                {saving ? "Saving…" : "Save availability"}
              </Button>
            }
          >
            <Stack spacing={2.5}>
              {weekdays.map((day) => {
                const dayRows = rows.filter((row) => row.weekday === day.value);
                return (
                  <Box key={day.value}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {day.label}
                      </Typography>
                      <Button size="small" startIcon={<IconPlus size={15} />} onClick={() => addWindow(day.value)}>
                        Add window
                      </Button>
                    </Stack>
                    {dayRows.length ? (
                      <Stack spacing={1}>
                        {dayRows.map((row) => (
                          <Stack key={row.key} direction="row" spacing={1.5} alignItems="center">
                            <TextField
                              type="time"
                              size="small"
                              label="From"
                              value={row.start}
                              onChange={(event) => update(row.key, { start: event.target.value })}
                              slotProps={{ htmlInput: { step: 1800 } }}
                            />
                            <TextField
                              type="time"
                              size="small"
                              label="To"
                              value={row.end}
                              onChange={(event) => update(row.key, { end: event.target.value })}
                              slotProps={{ htmlInput: { step: 1800 } }}
                            />
                            <IconButton
                              aria-label={`Remove ${day.label} window`}
                              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not available.
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Public profile" subtitle="What students see when they book.">
            <Stack spacing={2}>
              <TextField
                label="Headline"
                value={form.headline}
                onChange={(event) => setForm({ ...form, headline: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label="Location"
                value={form.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <TextField
                label="About you"
                multiline
                minRows={3}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <TextField
                label="Tags"
                helperText="Separate with commas (up to 8)."
                value={form.tagsText}
                onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              />
              <Button variant="outlined" onClick={saveProfile} disabled={saving}>
                Save profile
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
