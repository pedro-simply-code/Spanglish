"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconCheck,
  IconMapPin,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { classTypeLabel } from "@/lib/class-type-label";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { bookClassAction, bookTrialClassAction, listBookingSlotsAction } from "@/features/academy/actions";
import { lessonFocusOptions } from "@/features/academy/data";
import { useAppToast } from "@/lib/use-app-toast";

export type BookingTeacher = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  bio: string;
  country: string;
  tags: string[];
  ratingAverage: number;
  ratingCount: number;
  levelName: string;
};

export type BookingBalance = {
  classType: "one-on-one" | "paired";
  durationMinutes: number;
  balance: number;
  shared: boolean;
  /** Demo/trial: one free lesson per student; no credit spent. */
  trial?: boolean;
};

export type BookingUpcoming = {
  id: string;
  topic: string;
  teacherName: string;
  startsAt: string;
};

type ScheduleOverviewProps = {
  teachers: BookingTeacher[];
  balances: BookingBalance[];
  partnerName: string | null;
  timeZone: string;
  upcoming: BookingUpcoming[];
  trialEligible?: boolean;
};

const kindKey = (item: BookingBalance) =>
  item.trial ? `trial-${item.durationMinutes}` : `${item.classType}-${item.durationMinutes}`;

function kindLabel(item: BookingBalance) {
  if (item.trial) {
    return `${item.durationMinutes} min · ${classTypeLabel("one-on-one")} · Free trial`;
  }
  const type = item.classType === "paired" ? "paired" : "one-on-one";
  return `${item.durationMinutes} min · ${classTypeLabel(type)}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2" fontWeight={600} textAlign="right" maxWidth="60%">
        {value}
      </Typography>
    </Stack>
  );
}

function TeacherCard({
  teacher,
  selected,
  onSelect,
}: {
  teacher: BookingTeacher;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      onClick={onSelect}
      aria-pressed={selected}
      sx={{ display: "block", width: "100%", height: "100%", textAlign: "left" }}
    >
      <Box
        sx={{
          p: 2.5,
          height: "100%",
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.light" : "background.paper",
          boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar src={teacher.image ?? undefined} alt={teacher.name} sx={{ width: 52, height: 52 }}>
            {teacher.name.charAt(0)}
          </Avatar>
          <Box flexGrow={1} minWidth={0}>
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{teacher.name}</Typography>
              {selected ? <IconCheck size={18} color="#FA896B" /> : null}
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center" mt={0.25}>
              <IconStar size={14} fill="#FFAE1F" color="#FFAE1F" />
              <Typography variant="body2" fontWeight={600}>
                {teacher.ratingCount ? teacher.ratingAverage.toFixed(1) : "New"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {teacher.ratingCount ? `(${teacher.ratingCount}) · ` : "· "}
                {teacher.levelName}
              </Typography>
            </Stack>
            {teacher.headline ? (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {teacher.headline}
              </Typography>
            ) : null}
            {teacher.country ? (
              <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                <IconMapPin size={13} />
                <Typography variant="body2" color="text.secondary">
                  {teacher.country}
                </Typography>
              </Stack>
            ) : null}
            {teacher.tags.length ? (
              <Stack direction="row" gap={0.5} flexWrap="wrap" mt={1}>
                {teacher.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            ) : null}
          </Box>
        </Stack>
      </Box>
    </ButtonBase>
  );
}

export function ScheduleOverview({
  teachers,
  balances,
  partnerName,
  timeZone,
  upcoming,
  trialEligible = false,
}: ScheduleOverviewProps) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [booking, startBooking] = useTransition();
  const trialKinds: BookingBalance[] = trialEligible
    ? [
        { classType: "one-on-one", durationMinutes: 25, balance: 1, shared: false, trial: true },
        { classType: "one-on-one", durationMinutes: 50, balance: 1, shared: false, trial: true },
      ]
    : [];
  const creditKinds = balances.filter((item) => item.balance > 0);
  const bookableKinds = [...trialKinds, ...creditKinds];
  const [kind, setKind] = useState(bookableKinds[0] ? kindKey(bookableKinds[0]) : "");
  const [teacherId, setTeacherId] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [dayKey, setDayKey] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [focus, setFocus] = useState(lessonFocusOptions[0] ?? "Conversation practice");
  const [open, setOpen] = useState(false);

  const selectedKind = bookableKinds.find((item) => kindKey(item) === kind);
  const teacher = teachers.find((item) => item.id === teacherId);

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }),
    [timeZone],
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }),
    [timeZone],
  );
  const fullFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [timeZone],
  );

  // Load free slots whenever the teacher or the class kind changes.
  useEffect(() => {
    if (!teacherId || !selectedKind) return;
    startLoadingSlots(async () => {
      const result = await listBookingSlotsAction({
        teacherId,
        classType: selectedKind.classType,
        durationMinutes: selectedKind.durationMinutes,
      });
      setSlots(result);
      setDayKey("");
      setStartsAt("");
    });
  }, [teacherId, selectedKind]);

  const days = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = dayFormatter.format(new Date(slot));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()].map(([label, times]) => ({ label, times }));
  }, [slots, dayFormatter]);
  const activeDay = days.find((day) => day.label === dayKey) ?? days[0];

  const handleConfirm = () => {
    if (!teacher || !selectedKind || !startsAt) return;
    startBooking(async () => {
      const response = selectedKind.trial
        ? await bookTrialClassAction({
            teacherId: teacher.id,
            startsAt,
            topic: focus,
            durationMinutes: selectedKind.durationMinutes as 25 | 50,
          })
        : await bookClassAction({
            teacherId: teacher.id,
            startsAt,
            topic: focus,
            classType: selectedKind.classType,
            durationMinutes: selectedKind.durationMinutes,
          });
      if (!response.ok) {
        showError({ title: response.title, message: response.message });
        setOpen(false);
        // A taken slot: refresh the list so it disappears.
        if (response.code === "SLOT_TAKEN" || response.code === "SLOT_UNAVAILABLE") {
          setSlots((current) => current?.filter((slot) => slot !== startsAt) ?? null);
          setStartsAt("");
        }
        return;
      }
      showSuccess({ title: response.title, message: response.message });
      setOpen(false);
      router.push(response.classId ? `/classes/${response.classId}` : "/classes");
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb title="Book a class" subtitle="Pick a teacher and a time that works for you." />

      {!creditKinds.length ? (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            trialEligible ? undefined : (
              <LinkButton href="/pricing" color="inherit" size="small">
                See packages
              </LinkButton>
            )
          }
        >
          {trialEligible
            ? "You have no paid credits yet. Book your one free trial below, or buy a package when you are ready."
            : "You have no class credits yet. Get a package to book live classes."}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard
              title="1. Class type"
              subtitle={
                trialEligible
                  ? "Your first trial is free (no credit). Paid classes use one credit each."
                  : "Each class uses one credit of this type."
              }
            >
              <Stack direction="row" gap={1} flexWrap="wrap">
                {bookableKinds.length ? (
                  bookableKinds.map((item) => {
                    const key = kindKey(item);
                    const canPick = item.trial || item.balance > 0;
                    const creditLabel = item.trial
                      ? "1 available"
                      : `${item.balance} left${item.shared && partnerName ? ` (shared with ${partnerName})` : ""}`;
                    return (
                      <Chip
                        key={key}
                        clickable={canPick}
                        disabled={!canPick}
                        color={key === kind ? "primary" : "default"}
                        variant={key === kind ? "filled" : "outlined"}
                        icon={item.shared ? <IconUsers size={16} /> : undefined}
                        label={`${kindLabel(item)} · ${creditLabel}`}
                        onClick={() => {
                          if (canPick) setKind(key);
                        }}
                      />
                    );
                  })
                ) : (
                  <Typography color="text.secondary">No credits yet.</Typography>
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="2. Teacher" subtitle={`${teachers.length} teachers with open times`}>
              {teachers.length ? (
                <Grid container spacing={2}>
                  {teachers.map((item) => (
                    <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                      <TeacherCard
                        teacher={item}
                        selected={item.id === teacherId}
                        onSelect={() => setTeacherId(item.id)}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  No teacher has published availability yet. Check back soon.
                </Typography>
              )}
            </SectionCard>

            <SectionCard title="3. Time" subtitle={`Times shown in your time zone (${timeZone}).`}>
              {!teacher || !selectedKind ? (
                <Typography color="text.secondary">Choose a class type and a teacher first.</Typography>
              ) : loadingSlots || slots === null ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading open times…</Typography>
                </Stack>
              ) : !days.length ? (
                <Typography color="text.secondary">
                  {teacher.name} has no open {selectedKind.durationMinutes}-minute times in the next three weeks.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {days.map((day) => (
                      <Chip
                        key={day.label}
                        clickable
                        label={`${day.label} (${day.times.length})`}
                        color={day.label === activeDay?.label ? "primary" : "default"}
                        variant={day.label === activeDay?.label ? "filled" : "outlined"}
                        onClick={() => {
                          setDayKey(day.label);
                          setStartsAt("");
                        }}
                      />
                    ))}
                  </Stack>
                  <Divider />
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {activeDay?.times.map((slot) => (
                      <Button
                        key={slot}
                        size="small"
                        variant={slot === startsAt ? "contained" : "outlined"}
                        onClick={() => setStartsAt(slot)}
                      >
                        {timeFormatter.format(new Date(slot))}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <CardContent sx={{ p: "30px" }}>
                <Typography variant="h5" mb={2}>
                  Your booking
                </Typography>
                <Stack spacing={1.5}>
                  <SummaryRow label="Class" value={selectedKind ? kindLabel(selectedKind) : "—"} />
                  {selectedKind?.classType === "paired" && partnerName ? (
                    <SummaryRow label="Partner" value={partnerName} />
                  ) : null}
                  <SummaryRow label="Teacher" value={teacher?.name ?? "—"} />
                  <SummaryRow label="When" value={startsAt ? fullFormatter.format(new Date(startsAt)) : "—"} />
                  <SummaryRow
                    label={selectedKind?.trial ? "Cost" : "Credits left"}
                    value={
                      selectedKind?.trial ? "Free trial (no credit)" : selectedKind ? String(selectedKind.balance) : "0"
                    }
                  />
                </Stack>
                <TextField
                  select
                  fullWidth
                  label="Focus"
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  sx={{ mt: 3 }}
                >
                  {lessonFocusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<IconCalendarPlus size={18} />}
                  sx={{ mt: 3 }}
                  disabled={!teacher || !selectedKind || !startsAt}
                  onClick={() => setOpen(true)}
                >
                  Book class
                </Button>
              </CardContent>
            </Card>

            <SectionCard title="Upcoming classes">
              {upcoming.length ? (
                <Stack spacing={1.5}>
                  {upcoming.map((item) => (
                    <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                      <IconCalendarEvent size={18} />
                      <Box minWidth={0}>
                        <Typography variant="subtitle2" noWrap>
                          {item.topic}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fullFormatter.format(new Date(item.startsAt))} · {item.teacherName}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No upcoming classes.</Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <Typography variant="h5" mb={1}>
            Confirm your class
          </Typography>
          <Typography color="text.secondary">
            {selectedKind ? kindLabel(selectedKind) : ""} with {teacher?.name} on{" "}
            {startsAt ? fullFormatter.format(new Date(startsAt)) : ""}.
            {selectedKind?.trial
              ? " This is your free demo lesson — no credit will be used."
              : ` One credit will be used${selectedKind?.classType === "paired" && partnerName ? ` from the pool you share with ${partnerName}` : ""}.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)} disabled={booking}>
            Back
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={booking}>
            {booking ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
