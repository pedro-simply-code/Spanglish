"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isAppLocale } from "@/i18n/config";
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

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const focusKeys: Record<string, string> = {
  "Conversation practice": "schedule.focus.conversation",
  "Grammar review": "schedule.focus.grammar",
  "Travel Spanish": "schedule.focus.travel",
  "Business Spanish": "schedule.focus.business",
  "Exam preparation": "schedule.focus.exam",
};

const upcomingTopicKeys: Record<string, string> = {
  "class-1003": "fixtures.classes.class1003.topic",
  "class-1004": "fixtures.classes.class1004.topic",
  "class-1001": "fixtures.classes.class1001.topic",
  "class-1002": "fixtures.classes.class1002.topic",
  "class-0901": "fixtures.classes.class0901.topic",
  "class-0902": "fixtures.classes.class0902.topic",
  "class-0801": "fixtures.classes.class0801.topic",
  "class-0802": "fixtures.classes.class0802.topic",
};

const kindKey = (item: BookingBalance) =>
  item.trial ? `trial-${item.durationMinutes}` : `${item.classType}-${item.durationMinutes}`;

function kindLabel(item: BookingBalance, t: StudentTranslator) {
  const duration = t("common.minutes", { count: item.durationMinutes });
  if (item.trial) {
    return `${duration} · ${classTypeLabel("one-on-one", t)} · ${t("schedule.freeTrial")}`;
  }
  const type = item.classType === "paired" ? "paired" : "one-on-one";
  return `${duration} · ${classTypeLabel(type, t)}`;
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
  t,
}: {
  teacher: BookingTeacher;
  selected: boolean;
  onSelect: () => void;
  t: StudentTranslator;
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
                {teacher.ratingCount ? teacher.ratingAverage.toFixed(1) : t("schedule.new")}
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
  const t = useTranslations("student");
  const locale = useLocale();
  const appLocale = isAppLocale(locale) ? locale : defaultLocale;
  const intlLocale = appLocale === "es" ? "es-ES" : "en-US";
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
    () => new Intl.DateTimeFormat(intlLocale, { timeZone, weekday: "short", month: "short", day: "numeric" }),
    [timeZone, intlLocale],
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }),
    [timeZone, intlLocale],
  );
  const fullFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [timeZone, intlLocale],
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
      <Breadcrumb
        title={t("schedule.breadcrumbTitle")}
        subtitle={t("schedule.breadcrumbSubtitle")}
      />

      {!creditKinds.length ? (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            trialEligible ? undefined : (
              <LinkButton href="/pricing" color="inherit" size="small">
                {t("actions.seePackages")}
              </LinkButton>
            )
          }
        >
          {trialEligible ? t("schedule.noCreditsTrial") : t("schedule.noCredits")}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard
              title={t("schedule.classTypeTitle")}
              subtitle={trialEligible ? t("schedule.trialSubtitle") : t("schedule.creditSubtitle")}
            >
              <Stack direction="row" gap={1} flexWrap="wrap">
                {bookableKinds.length ? (
                  bookableKinds.map((item) => {
                    const key = kindKey(item);
                    const canPick = item.trial || item.balance > 0;
                    const creditLabel = item.trial
                      ? t("schedule.trialLabel")
                      : t("schedule.creditLabel", {
                          balance: item.balance,
                          shared:
                            item.shared && partnerName
                              ? t("schedule.sharedWith", { name: partnerName })
                              : "",
                        });
                    return (
                      <Chip
                        key={key}
                        clickable={canPick}
                        disabled={!canPick}
                        color={key === kind ? "primary" : "default"}
                        variant={key === kind ? "filled" : "outlined"}
                        icon={item.shared ? <IconUsers size={16} /> : undefined}
                        label={`${kindLabel(item, t)} · ${creditLabel}`}
                        onClick={() => {
                          if (canPick) setKind(key);
                        }}
                      />
                    );
                  })
                ) : (
                  <Typography color="text.secondary">{t("schedule.noCreditsYet")}</Typography>
                )}
              </Stack>
            </SectionCard>

            <SectionCard
              title={t("schedule.teacherSectionTitle")}
              subtitle={t("schedule.teacherTitle", { count: teachers.length })}
            >
              {teachers.length ? (
                <Grid container spacing={2}>
                  {teachers.map((item) => (
                    <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                      <TeacherCard
                        teacher={item}
                        selected={item.id === teacherId}
                        onSelect={() => setTeacherId(item.id)}
                        t={t}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">{t("schedule.noTeachers")}</Typography>
              )}
            </SectionCard>

            <SectionCard
              title={t("schedule.timeTitle")}
              subtitle={t("schedule.timeSubtitle", { zone: timeZone })}
            >
              {!teacher || !selectedKind ? (
                <Typography color="text.secondary">{t("schedule.chooseFirst")}</Typography>
              ) : loadingSlots || slots === null ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">{t("schedule.loadingTimes")}</Typography>
                </Stack>
              ) : !days.length ? (
                <Typography color="text.secondary">
                  {t("schedule.noSlots", {
                    teacher: teacher.name,
                    minutes: selectedKind.durationMinutes,
                  })}
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
                  {t("schedule.bookingTitle")}
                </Typography>
                <Stack spacing={1.5}>
                  <SummaryRow
                    label={t("schedule.classLabel")}
                    value={selectedKind ? kindLabel(selectedKind, t) : "—"}
                  />
                  {selectedKind?.classType === "paired" && partnerName ? (
                    <SummaryRow label={t("schedule.partner")} value={partnerName} />
                  ) : null}
                  <SummaryRow label={t("schedule.teacher")} value={teacher?.name ?? "—"} />
                  <SummaryRow
                    label={t("schedule.when")}
                    value={startsAt ? fullFormatter.format(new Date(startsAt)) : "—"}
                  />
                  <SummaryRow
                    label={selectedKind?.trial ? t("schedule.cost") : t("schedule.creditsLeft")}
                    value={
                      selectedKind?.trial
                        ? t("schedule.freeTrialNoCredit")
                        : selectedKind
                          ? String(selectedKind.balance)
                          : "0"
                    }
                  />
                </Stack>
                <TextField
                  select
                  fullWidth
                  label={t("schedule.focus.label")}
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  sx={{ mt: 3 }}
                >
                  {lessonFocusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(focusKeys[option] as StudentKey)}
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
                  {t("schedule.bookClass")}
                </Button>
              </CardContent>
            </Card>

            <SectionCard title={t("schedule.upcomingTitle")}>
              {upcoming.length ? (
                <Stack spacing={1.5}>
                  {upcoming.map((item) => {
                    const topicKey = upcomingTopicKeys[item.id] as StudentKey | undefined;
                    return (
                      <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                        <IconCalendarEvent size={18} />
                        <Box minWidth={0}>
                          <Typography variant="subtitle2" noWrap>
                            {topicKey ? t(topicKey) : item.topic}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {fullFormatter.format(new Date(item.startsAt))} · {item.teacherName}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              ) : (
                <Typography color="text.secondary">{t("schedule.noUpcoming")}</Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <Typography variant="h5" mb={1}>
            {t("schedule.confirmTitle")}
          </Typography>
          <Typography color="text.secondary">
            {t("schedule.confirmBody", {
              kind: selectedKind ? kindLabel(selectedKind, t) : "",
              teacher: teacher?.name ?? "",
              date: startsAt ? fullFormatter.format(new Date(startsAt)) : "",
            })}
            {selectedKind?.trial
              ? t("schedule.confirmTrial")
              : t("schedule.confirmCredit", {
                  paired:
                    selectedKind?.classType === "paired" && partnerName
                      ? t("schedule.confirmPaired", { name: partnerName })
                      : "",
                })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)} disabled={booking}>
            {t("schedule.back")}
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={booking}>
            {booking ? t("schedule.booking") : t("schedule.confirmBooking")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
