"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
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
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconCheck,
  IconClock,
  IconListCheck,
  IconMapPin,
  IconSchool,
  IconSearch,
  IconStar,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { classTypeLabel } from "@/lib/class-type-label";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { sliceForPage } from "@/lib/pagination";
import {
  bookClassAction,
  bookTrialClassAction,
  getTrialLessonAvailabilityAction,
  listBookingSlotsAction,
} from "@/features/academy/actions";
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

const BOOKING_STEPS = ["classType", "teacher", "time", "review"] as const;
const LAST_STEP = BOOKING_STEPS.length - 1;
const TEACHER_PAGE_SIZE = 4;

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

function parseKindKey(kind: string): { classType: "one-on-one" | "paired"; durationMinutes: number } | null {
  const trial = /^trial-(25|50)$/.exec(kind);
  if (trial) {
    return { classType: "one-on-one", durationMinutes: Number(trial[1]) };
  }
  const paid = /^(one-on-one|paired)-(25|50)$/.exec(kind);
  if (!paid) return null;
  return { classType: paid[1] as "one-on-one" | "paired", durationMinutes: Number(paid[2]) };
}

function kindLabel(item: BookingBalance, t: StudentTranslator) {
  const duration = t("common.minutes", { count: item.durationMinutes });
  if (item.trial) {
    return `${duration} · ${classTypeLabel("one-on-one", t)} · ${t("schedule.freeTrial")}`;
  }
  const type = item.classType === "paired" ? "paired" : "one-on-one";
  return `${duration} · ${classTypeLabel(type, t)}`;
}

const selectTileSx = (selected: boolean) => ({
  p: 2.5,
  height: "100%",
  borderRadius: 1,
  border: "1px solid",
  borderColor: selected ? "primary.main" : "divider",
  bgcolor: selected ? "primary.light" : "background.paper",
  boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
  transition: "border-color 120ms ease, box-shadow 120ms ease",
});

function SummaryRow({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
      <Stack direction="row" spacing={1} alignItems="center">
        {done !== undefined ? (
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: done ? "success.light" : "action.hover",
              color: done ? "success.dark" : "text.disabled",
              flexShrink: 0,
            }}
          >
            {done ? <IconCheck size={14} stroke={2.5} /> : null}
          </Box>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="subtitle2" fontWeight={600} textAlign="right" maxWidth="55%">
        {value}
      </Typography>
    </Stack>
  );
}

function WizardStepCard({
  index,
  label,
  icon,
  active,
  complete,
  disabled,
  onSelect,
}: {
  index: number;
  label: string;
  icon: ReactNode;
  active: boolean;
  complete: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      onClick={onSelect}
      disabled={disabled}
      sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 1 }}
    >
      <Box
        sx={{
          ...selectTileSx(active),
          opacity: disabled && !active ? 0.55 : 1,
          px: 2,
          py: 1.75,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: active || complete ? "primary.main" : "action.selected",
              color: active || complete ? "primary.contrastText" : "text.secondary",
              flexShrink: 0,
            }}
          >
            {complete && !active ? <IconCheck size={16} /> : index + 1}
          </Box>
          <Stack spacing={0.25} minWidth={0}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ color: active ? "primary.main" : "text.secondary", display: "flex" }}>{icon}</Box>
              <Typography variant="subtitle2" fontWeight={active ? 700 : 500} noWrap>
                {label}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </ButtonBase>
  );
}

function ClassTypeCard({
  selected,
  title,
  detail,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  icon?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <ButtonBase onClick={onSelect} aria-pressed={selected} sx={{ display: "block", width: "100%", textAlign: "left" }}>
      <Box sx={selectTileSx(selected)}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="flex-start" flex={1} minWidth={0}>
            {icon ? (
              <Box
                sx={{
                  mt: 0.25,
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: selected ? "background.paper" : "action.hover",
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            ) : null}
            <Box minWidth={0}>
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {detail}
              </Typography>
            </Box>
          </Stack>
          {selected ? <IconCheck size={20} color="#FA896B" /> : null}
        </Stack>
      </Box>
    </ButtonBase>
  );
}

function FocusOptionCard({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <ButtonBase onClick={onSelect} aria-pressed={selected} sx={{ display: "block", width: "100%", textAlign: "left" }}>
      <Box sx={{ ...selectTileSx(selected), py: 2, px: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="body1" fontWeight={selected ? 600 : 400}>
            {label}
          </Typography>
          {selected ? <IconCheck size={18} color="#FA896B" /> : null}
        </Stack>
      </Box>
    </ButtonBase>
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
      <Box sx={{ ...selectTileSx(selected), borderRadius: 1 }}>
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
  trialEligible: trialEligibleFromServer = false,
}: ScheduleOverviewProps) {
  const router = useRouter();
  const t = useTranslations("student");
  const locale = useLocale();
  const appLocale = isAppLocale(locale) ? locale : defaultLocale;
  const intlLocale = appLocale === "es" ? "es-ES" : "en-US";
  const { showError, showSuccess } = useAppToast();
  const [booking, startBooking] = useTransition();
  const [trialEligible, setTrialEligible] = useState(trialEligibleFromServer);
  const trialKinds = useMemo<BookingBalance[]>(
    () =>
      trialEligible
        ? [
            { classType: "one-on-one", durationMinutes: 25, balance: 1, shared: false, trial: true },
            { classType: "one-on-one", durationMinutes: 50, balance: 1, shared: false, trial: true },
          ]
        : [],
    [trialEligible],
  );
  const creditKinds = balances.filter((item) => item.balance > 0);
  const bookableKinds = useMemo(() => [...trialKinds, ...creditKinds], [trialKinds, creditKinds]);
  const [activeStep, setActiveStep] = useState(0);
  const [kind, setKind] = useState(bookableKinds[0] ? kindKey(bookableKinds[0]) : "");
  const [teacherId, setTeacherId] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dayKey, setDayKey] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [focus, setFocus] = useState(lessonFocusOptions[0] ?? "Conversation practice");
  const [open, setOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherTagFilter, setTeacherTagFilter] = useState("");
  const [teacherLevelFilter, setTeacherLevelFilter] = useState("");
  const [teacherPage, setTeacherPage] = useState(1);

  const selectedKind = bookableKinds.find((item) => kindKey(item) === kind);
  const teacher = teachers.find((item) => item.id === teacherId);
  const kindParams = parseKindKey(kind);

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

  useEffect(() => {
    setTrialEligible(trialEligibleFromServer);
  }, [trialEligibleFromServer]);

  useEffect(() => {
    let cancelled = false;
    void getTrialLessonAvailabilityAction().then((result) => {
      if (!cancelled) setTrialEligible(result.eligible);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (trialEligible) return;
    if (!kind.startsWith("trial-")) return;
    const fallbackKey = creditKinds[0] ? kindKey(creditKinds[0]) : "";
    setKind(fallbackKey);
  }, [trialEligible, kind, creditKinds]);

  // Stable deps (`kind` string, not `selectedKind` object) — avoids infinite reload + blocked navigation.
  useEffect(() => {
    if (!teacherId || !kindParams) {
      setSlots(null);
      setLoadingSlots(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlots(null);
    listBookingSlotsAction({
      teacherId,
      classType: kindParams.classType,
      durationMinutes: kindParams.durationMinutes,
    })
      .then((result) => {
        if (cancelled) return;
        setSlots(result);
        setDayKey("");
        setStartsAt("");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, kind]);

  const days = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = dayFormatter.format(new Date(slot));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()].map(([label, times]) => ({ label, times }));
  }, [slots, dayFormatter]);
  const activeDay = days.find((day) => day.label === dayKey) ?? days[0];

  const teacherTags = useMemo(() => {
    const unique = new Set<string>();
    for (const item of teachers) {
      for (const tag of item.tags) {
        if (tag.trim()) unique.add(tag);
      }
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [teachers]);

  const teacherLevels = useMemo(() => {
    const unique = new Set<string>();
    for (const item of teachers) {
      if (item.levelName.trim()) unique.add(item.levelName);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    return teachers.filter((item) => {
      if (teacherTagFilter && !item.tags.includes(teacherTagFilter)) return false;
      if (teacherLevelFilter && item.levelName !== teacherLevelFilter) return false;
      if (!query) return true;
      const haystack = [item.name, item.headline, item.country, item.levelName, ...item.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [teachers, teacherSearch, teacherTagFilter, teacherLevelFilter]);

  const pagedTeachers = useMemo(
    () => sliceForPage(filteredTeachers, teacherPage, TEACHER_PAGE_SIZE),
    [filteredTeachers, teacherPage],
  );

  useEffect(() => {
    setTeacherPage(1);
  }, [teacherSearch, teacherTagFilter, teacherLevelFilter]);

  useEffect(() => {
    if (teacherId && !filteredTeachers.some((item) => item.id === teacherId)) {
      setTeacherId("");
    }
  }, [filteredTeachers, teacherId]);

  const canContinue =
    (activeStep === 0 && Boolean(kind && selectedKind)) ||
    (activeStep === 1 && Boolean(teacherId)) ||
    (activeStep === 2 && Boolean(startsAt) && !loadingSlots) ||
    activeStep === LAST_STEP;

  const handlePickKind = (key: string) => {
    setKind(key);
    setTeacherId("");
    setTeacherSearch("");
    setTeacherTagFilter("");
    setTeacherLevelFilter("");
    setTeacherPage(1);
    setSlots(null);
    setDayKey("");
    setStartsAt("");
  };

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
        if (response.code === "TRIAL_USED") {
          setTrialEligible(false);
        }
        if (response.code === "SLOT_TAKEN" || response.code === "SLOT_UNAVAILABLE") {
          setSlots((current) => current?.filter((slot) => slot !== startsAt) ?? null);
          setStartsAt("");
          setActiveStep(2);
        }
        return;
      }
      if (selectedKind.trial) {
        setTrialEligible(false);
      }
      showSuccess({ title: response.title, message: response.message });
      setOpen(false);
      router.refresh();
      router.push(response.classId ? `/classes/${response.classId}` : "/classes");
    });
  };

  const stepIcons: Record<(typeof BOOKING_STEPS)[number], ReactNode> = {
    classType: <IconSchool size={18} />,
    teacher: <IconUser size={18} />,
    time: <IconClock size={18} />,
    review: <IconListCheck size={18} />,
  };

  const stepSubtitle = (step: (typeof BOOKING_STEPS)[number]) => {
    if (step === "classType") {
      return trialEligible ? t("schedule.trialSubtitle") : t("schedule.creditSubtitle");
    }
    if (step === "teacher") {
      return t("schedule.teacherTitleFiltered", {
        shown: filteredTeachers.length,
        total: teachers.length,
      });
    }
    if (step === "time") {
      return t("schedule.timeSubtitle", { zone: timeZone });
    }
    return t("schedule.stepReviewSubtitle");
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
          <Card elevation={9}>
            <CardContent sx={{ p: { xs: 2, sm: "30px" } }}>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {BOOKING_STEPS.map((step, index) => (
                  <Grid key={step} size={{ xs: 6, sm: 3 }}>
                    <WizardStepCard
                      index={index}
                      label={t(`schedule.step.${step}`)}
                      icon={stepIcons[step]}
                      active={activeStep === index}
                      complete={activeStep > index}
                      disabled={index > activeStep}
                      onSelect={() => {
                        if (index < activeStep) setActiveStep(index);
                      }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Stack spacing={0.5} mb={2.5}>
                <Typography variant="h5">{t(`schedule.step.${BOOKING_STEPS[activeStep]!}`)}</Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {stepSubtitle(BOOKING_STEPS[activeStep]!)}
                </Typography>
              </Stack>

            {activeStep === 0 ? (
              bookableKinds.length ? (
                <Grid container spacing={2}>
                  {bookableKinds.map((item) => {
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
                      <Grid key={key} size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ opacity: canPick ? 1 : 0.5, pointerEvents: canPick ? "auto" : "none" }}>
                          <ClassTypeCard
                            selected={key === kind}
                            title={kindLabel(item, t)}
                            detail={creditLabel}
                            icon={item.shared ? <IconUsers size={20} /> : <IconSchool size={20} />}
                            onSelect={() => handlePickKind(key)}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Typography color="text.secondary">{t("schedule.noCreditsYet")}</Typography>
              )
            ) : null}

            {activeStep === 1 ? (
              teachers.length ? (
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    alignItems="center"
                    sx={{ width: "100%", minWidth: 0 }}
                  >
                    <TextField
                      size="small"
                      value={teacherSearch}
                      onChange={(event) => setTeacherSearch(event.target.value)}
                      placeholder={t("schedule.teacherSearchPlaceholder")}
                      aria-label={t("schedule.teacherSearchPlaceholder")}
                      sx={{ flex: 1, minWidth: 0 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <IconSearch size={16} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <TextField
                      select
                      size="small"
                      value={teacherTagFilter}
                      onChange={(event) => setTeacherTagFilter(event.target.value)}
                      aria-label={t("schedule.teacherSpecialtyFilter")}
                      sx={{ width: { xs: 118, sm: 152 }, flexShrink: 0 }}
                      slotProps={{ select: { displayEmpty: true } }}
                    >
                      <MenuItem value="">{t("schedule.teacherSpecialtyAll")}</MenuItem>
                      {teacherTags.map((tag) => (
                        <MenuItem key={tag} value={tag} dense>
                          {tag}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      value={teacherLevelFilter}
                      onChange={(event) => setTeacherLevelFilter(event.target.value)}
                      aria-label={t("schedule.teacherLevelFilter")}
                      sx={{ width: { xs: 118, sm: 152 }, flexShrink: 0 }}
                      slotProps={{ select: { displayEmpty: true } }}
                    >
                      <MenuItem value="">{t("schedule.teacherLevelAll")}</MenuItem>
                      {teacherLevels.map((level) => (
                        <MenuItem key={level} value={level} dense>
                          {level}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  {filteredTeachers.length ? (
                    <>
                      <Grid container spacing={2}>
                        {pagedTeachers.map((item) => (
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
                      <ListPagination
                        page={teacherPage}
                        total={filteredTeachers.length}
                        pageSize={TEACHER_PAGE_SIZE}
                        onPageChange={setTeacherPage}
                      />
                    </>
                  ) : (
                    <Typography color="text.secondary">{t("schedule.teacherNoMatches")}</Typography>
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary">{t("schedule.noTeachers")}</Typography>
              )
            ) : null}

            {activeStep === 2 ? (
              !teacher || !selectedKind ? (
                <Typography color="text.secondary">{t("schedule.chooseFirst")}</Typography>
              ) : loadingSlots ? (
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
                  <Grid container spacing={1.5}>
                    {days.map((day) => {
                      const selected = day.label === activeDay?.label;
                      return (
                        <Grid key={day.label} size={{ xs: 12, sm: 6, md: 4 }}>
                          <ClassTypeCard
                            selected={selected}
                            title={day.label}
                            detail={t("schedule.slotsOnDay", { count: day.times.length })}
                            icon={<IconCalendarEvent size={20} />}
                            onSelect={() => {
                              setDayKey(day.label);
                              setStartsAt("");
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                      {activeDay?.label ?? "—"}
                    </Typography>
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
                  </Box>
                </Stack>
              )
            ) : null}

            {activeStep === 3 ? (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("schedule.focus.label")}
                </Typography>
                <Grid container spacing={1.5}>
                  {lessonFocusOptions.map((option) => (
                    <Grid key={option} size={{ xs: 12, sm: 6 }}>
                      <FocusOptionCard
                        selected={focus === option}
                        label={t(focusKeys[option] as StudentKey)}
                        onSelect={() => setFocus(option)}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="body2" color="text.secondary">
                  {t("schedule.stepReviewHint")}
                </Typography>
              </Stack>
            ) : null}

              <Divider sx={{ my: 3 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((value) => Math.max(0, value - 1))}
                >
                  {t("schedule.back")}
                </Button>
                {activeStep < LAST_STEP ? (
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!canContinue}
                    onClick={() => setActiveStep((value) => Math.min(LAST_STEP, value + 1))}
                  >
                    {t("schedule.stepNext")}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<IconCalendarPlus size={18} />}
                    disabled={!teacher || !selectedKind || !startsAt || booking}
                    onClick={() => setOpen(true)}
                  >
                    {t("schedule.bookClass")}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3} sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
            <Card elevation={9}>
              <CardContent sx={{ p: "30px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5">{t("schedule.bookingTitle")}</Typography>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={t("schedule.stepProgress", {
                      current: activeStep + 1,
                      total: BOOKING_STEPS.length,
                    })}
                  />
                </Stack>
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  <SummaryRow
                    label={t("schedule.classLabel")}
                    value={selectedKind ? kindLabel(selectedKind, t) : "—"}
                    done={Boolean(selectedKind)}
                  />
                  {selectedKind?.classType === "paired" && partnerName ? (
                    <SummaryRow label={t("schedule.partner")} value={partnerName} done />
                  ) : null}
                  <SummaryRow
                    label={t("schedule.teacher")}
                    value={teacher?.name ?? "—"}
                    done={Boolean(teacher)}
                  />
                  <SummaryRow
                    label={t("schedule.when")}
                    value={startsAt ? fullFormatter.format(new Date(startsAt)) : "—"}
                    done={Boolean(startsAt)}
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
                    done={Boolean(selectedKind)}
                  />
                </Stack>
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

      <Dialog open={open} onClose={() => !booking && setOpen(false)} maxWidth="xs" fullWidth>
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