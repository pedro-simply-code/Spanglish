"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isAppLocale } from "@/i18n/config";
import { useAppToast } from "@/lib/use-app-toast";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconNotebook,
  IconRefresh,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  ClassRecordings,
  type ClassRecordingItem,
} from "@/features/classes/components/class-recordings";
import { ClassTranscript } from "@/features/classes/components/class-transcript";
import type { ClassTranscriptLine } from "@/lib/class-captions";
import {
  cancelClassAction,
  listRescheduleSlotsAction,
  rateClassAction,
  rescheduleClassAction,
  respondToClassChangeAction,
} from "@/features/classes/actions";
import { ClassStatusChip } from "@/features/classes/components/class-status-chip";
import { classRoomHref } from "@/features/classes/data";
import {
  formatClassDate,
  formatClassDateTime,
  formatClassTimeRange,
  formatClassType,
  formatDuration,
  formatRelativeStart,
  getClassDateParts,
} from "@/features/classes/format";
import {
  decideClassChange,
  getClassStatus,
  getJoinState,
} from "@/features/classes/policy";
import type { ClassPolicy } from "@/features/classes/policy";
import type {
  ClassActionResult,
  LiveClass,
  LiveClassCancellation,
} from "@/features/classes/types";
import {
  ClassLearningPanel,
  type LibraryOption,
} from "@/features/learning/components/class-learning-panel";
import type { ClassLearning } from "@/lib/learning-types";

type ClassDetailProps = {
  item: LiveClass;
  now: string;
  policy: ClassPolicy;
  /** How the viewer relates to the class (decides which changes they see). */
  relation: "participant" | "teacher" | "staff";
  viewerId: string;
  viewerTimeZone: string;
  /** The viewer's rating, when they already rated this class. */
  myRating?: { stars: number; comment: string | null } | null;
  /** This class's recordings (only for people who may watch it). */
  recordings?: ClassRecordingItem[];
  /** Saved live captions (only for people who may watch the class). */
  transcript?: ClassTranscriptLine[];
  /** Materials, vocabulary and practice of the class (null when not visible). */
  learning?: ClassLearning | null;
  /** Teacher's library for attaching materials and assigning forms. */
  library?: LibraryOption[];
};

type DialogKind = "cancel" | "reschedule" | null;

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const fixtureTopics: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.topic",
  "class-1004": "fixtures.classes.class1004.topic",
  "class-1001": "fixtures.classes.class1001.topic",
  "class-1002": "fixtures.classes.class1002.topic",
  "class-0901": "fixtures.classes.class0901.topic",
  "class-0902": "fixtures.classes.class0902.topic",
  "class-0801": "fixtures.classes.class0801.topic",
  "class-0802": "fixtures.classes.class0802.topic",
};

const fixtureDescriptions: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.description",
  "class-1004": "fixtures.classes.class1004.description",
  "class-1001": "fixtures.classes.class1001.description",
  "class-1002": "fixtures.classes.class1002.description",
  "class-0901": "fixtures.classes.class0901.description",
  "class-0902": "fixtures.classes.class0902.description",
  "class-0801": "fixtures.classes.class0801.description",
  "class-0802": "fixtures.classes.class0802.description",
};

const fixtureAgenda: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.agenda",
  "class-1004": "fixtures.classes.class1004.agenda",
  "class-1001": "fixtures.classes.class1001.agenda",
  "class-1002": "fixtures.classes.class1002.agenda",
  "class-0901": "fixtures.classes.class0901.agenda",
  "class-0902": "fixtures.classes.class0902.agenda",
  "class-0801": "fixtures.classes.class0801.agenda",
  "class-0802": "fixtures.classes.class0802.agenda",
};

const fixtureOutcomes: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.outcomes",
  "class-1004": "fixtures.classes.class1004.outcomes",
  "class-1001": "fixtures.classes.class1001.outcomes",
  "class-1002": "fixtures.classes.class1002.outcomes",
  "class-0901": "fixtures.classes.class0901.outcomes",
  "class-0902": "fixtures.classes.class0902.outcomes",
  "class-0801": "fixtures.classes.class0801.outcomes",
  "class-0802": "fixtures.classes.class0802.outcomes",
};

const fixtureMaterialTitles: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.materialTitles",
  "class-1004": "fixtures.classes.class1004.materialTitles",
  "class-1001": "fixtures.classes.class1001.materialTitles",
  "class-1002": "fixtures.classes.class1002.materialTitles",
  "class-0901": "fixtures.classes.class0901.materialTitles",
  "class-0902": "fixtures.classes.class0902.materialTitles",
  "class-0801": "fixtures.classes.class0801.materialTitles",
  "class-0802": "fixtures.classes.class0802.materialTitles",
};

const fixtureMaterialDescriptions: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.materialDescriptions",
  "class-1004": "fixtures.classes.class1004.materialDescriptions",
  "class-1001": "fixtures.classes.class1001.materialDescriptions",
  "class-1002": "fixtures.classes.class1002.materialDescriptions",
  "class-0901": "fixtures.classes.class0901.materialDescriptions",
  "class-0902": "fixtures.classes.class0902.materialDescriptions",
  "class-0801": "fixtures.classes.class0801.materialDescriptions",
  "class-0802": "fixtures.classes.class0802.materialDescriptions",
};

const fixtureTeacherNotes: Record<string, StudentKey> = {
  "class-1003": "fixtures.classes.class1003.teacherNote",
  "class-1004": "fixtures.classes.class1004.teacherNote",
  "class-1001": "fixtures.classes.class1001.teacherNote",
  "class-0901": "fixtures.classes.class0901.teacherNote",
  "class-0902": "fixtures.classes.class0902.teacherNote",
};

const fixtureHomework: Record<string, StudentKey> = {
  "class-1002": "fixtures.classes.class1002.homework",
  "class-0901": "fixtures.classes.class0901.homework",
  "class-0902": "fixtures.classes.class0902.homework",
};

const fixtureRecaps: Record<string, StudentKey> = {
  "class-0901": "fixtures.classes.class0901.recap",
  "class-0902": "fixtures.classes.class0902.recap",
};

const fixtureCancellationReasons: Record<string, StudentKey> = {
  "class-0801": "fixtures.classes.class0801.cancellationReason",
  "class-0802": "fixtures.classes.class0802.cancellationReason",
};

function fixtureText(
  t: StudentTranslator,
  keys: Record<string, StudentKey>,
  id: string,
  fallback: string,
) {
  const key = keys[id];
  return key ? t(key) : fallback;
}

function fixtureList(
  t: StudentTranslator,
  keys: Record<string, StudentKey>,
  id: string,
  fallback: string[],
) {
  const key = keys[id];
  return key ? (t.raw(key) as string[]) : fallback;
}

export function ClassDetail({
  item,
  now,
  policy,
  relation,
  viewerId,
  viewerTimeZone,
  myRating = null,
  recordings = [],
  transcript = [],
  learning = null,
  library = [],
}: ClassDetailProps) {
  const router = useRouter();
  const t = useTranslations("student");
  const topic = fixtureText(t, fixtureTopics, item.id, item.topic);
  const description = fixtureText(t, fixtureDescriptions, item.id, item.description);
  const agenda = fixtureList(t, fixtureAgenda, item.id, item.agenda);
  const outcomes = fixtureList(t, fixtureOutcomes, item.id, item.outcomes);
  const materialTitles = fixtureList(t, fixtureMaterialTitles, item.id, [
    ...item.materials.map((material) => material.title),
  ]);
  const materialDescriptions = fixtureList(t, fixtureMaterialDescriptions, item.id, [
    ...item.materials.map((material) => material.description),
  ]);
  const teacherNote = fixtureText(t, fixtureTeacherNotes, item.id, item.teacherNote ?? "");
  const homework = fixtureText(t, fixtureHomework, item.id, item.homework ?? "");
  const recap = fixtureText(t, fixtureRecaps, item.id, item.recap ?? "");
  const rootT = useTranslations();
  const locale = useLocale();
  const appLocale = isAppLocale(locale) ? locale : defaultLocale;
  const intlLocale = appLocale === "es" ? "es-ES" : "en-US";
  const { showError, showSuccess } = useAppToast();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ClassActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const [slots, setSlots] = useState<string[] | null>(null);
  const [dayKey, setDayKey] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const status = getClassStatus(item, now);
  const join = getJoinState(item, now, policy, t);
  const cancelDecision = decideClassChange(item, "cancel", now, policy, t, appLocale);
  const rescheduleDecision = decideClassChange(
    item,
    "reschedule",
    now,
    policy,
    t,
    appLocale,
  );
  const date = getClassDateParts(item.startsAt, appLocale);
  const isParticipant = relation === "participant";
  const isPaired = (item.participants?.length ?? 0) > 1;
  const partners = (item.participants ?? []).filter((person) => person.userId !== viewerId);
  const canCancel = isParticipant
    ? cancelDecision.allowed
    : status === "upcoming";
  const proposal = item.pendingChange ?? null;
  const [stars, setStars] = useState<number | null>(myRating?.stars ?? null);
  const [ratingComment, setRatingComment] = useState(myRating?.comment ?? "");
  const canRate =
    isParticipant &&
    status === "completed" &&
    new Date(now).getTime() - new Date(item.startsAt).getTime() < (14 * 24 + 2) * 3_600_000;

  const submitRating = () => {
    if (!stars) return;
    startTransition(async () => {
      const response = await rateClassAction({ classId: item.id, stars, comment: ratingComment });
      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
        router.refresh();
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };
  const proposalIsMine = proposal?.requestedByUserId === viewerId;
  const cancellationBy: Record<LiveClassCancellation["by"], string> = {
    student: rootT("shell.roles.student"),
    teacher: rootT("shell.roles.teacher"),
    staff: t("classes.list.byStaff"),
  };

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        timeZone: viewerTimeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [viewerTimeZone, intlLocale],
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        timeZone: viewerTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [viewerTimeZone, intlLocale],
  );
  const fullFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        timeZone: viewerTimeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [viewerTimeZone, intlLocale],
  );
  const slotDays = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = dayFormatter.format(new Date(slot));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()].map(([label, times]) => ({ label, times }));
  }, [slots, dayFormatter]);
  const activeDay = slotDays.find((day) => day.label === dayKey) ?? slotDays[0];

  const openReschedule = () => {
    setDialog("reschedule");
    setSlots(null);
    setStartsAt("");
    startTransition(async () => {
      setSlots(await listRescheduleSlotsAction(item.id));
    });
  };

  const answerProposal = (accept: boolean) => {
    if (!proposal) return;
    startTransition(async () => {
      const response = await respondToClassChangeAction({
        classId: item.id,
        requestId: proposal.id,
        accept,
      });
      setResult(response);
      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
        router.refresh();
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };
  const hasRecording = recordings.some((entry) => entry.status === "ready");

  const closeDialog = () => {
    if (pending) return;
    setDialog(null);
  };

  const submitCancel = () => {
    startTransition(async () => {
      const response = await cancelClassAction({
        classId: item.id,
        reason,
      });

      setResult(response);

      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
        setDialog(null);
        router.refresh();
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };

  const submitReschedule = () => {
    if (!startsAt) return;

    startTransition(async () => {
      const response = await rescheduleClassAction({
        classId: item.id,
        startsAt,
      });

      setResult(response);

      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
        setDialog(null);
        router.refresh();
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={topic}
        subtitle={`${formatClassDate(item.startsAt, appLocale)} · ${formatClassTimeRange(item, appLocale)}`}
        items={[
          { title: t("actions.myClasses"), to: "/classes" },
          { title: topic },
        ]}
      />

      {proposal ? (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            proposalIsMine ? undefined : (
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" disabled={pending} onClick={() => answerProposal(false)}>
                  {t("classes.detail.decline")}
                </Button>
                <Button variant="contained" size="small" disabled={pending} onClick={() => answerProposal(true)}>
                  {t("classes.detail.accept")}
                </Button>
              </Stack>
            )
          }
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {proposalIsMine
              ? t("classes.detail.waitingPartner")
              : t("classes.detail.proposedTime", { name: proposal.requestedByName })}
          </Typography>
          {t("classes.detail.moveTo", {
            date: fullFormatter.format(new Date(proposal.newStartsAt)),
          })}{" "}
          {proposalIsMine
            ? t("classes.detail.waitingAnswer")
            : t("classes.detail.answerBefore", {
                date: fullFormatter.format(new Date(proposal.expiresAt)),
              })}
        </Alert>
      ) : null}

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
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <CardContent sx={{ p: { xs: "24px", md: "30px" } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2.5}
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                >
                  <Box
                    sx={{
                      width: { xs: "100%", sm: 84 },
                      py: 1.5,
                      px: { xs: 2, sm: 1 },
                      textAlign: "center",
                      bgcolor: status === "canceled" ? "grey.200" : "primary.light",
                      color:
                        status === "canceled"
                          ? "text.secondary"
                          : "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      variant="caption"
                      display="block"
                      fontWeight={600}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      {date.weekday}
                    </Typography>
                    <Typography variant="h2" fontWeight={700} lineHeight={1.1}>
                      {date.day}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {date.month} {date.year}
                    </Typography>
                  </Box>

                  <Box flexGrow={1} minWidth={0}>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      gap={0.75}
                      alignItems="center"
                    >
                      <ClassStatusChip status={status} />
                      <Chip
                        label={formatClassType(item.type, t)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={formatDuration(item.duration, t)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={t("classes.detail.creditChip", { count: item.creditCost })}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="h4" mt={1.5}>
                      {topic}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      {description}
                    </Typography>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={{ xs: 0.5, sm: 2 }}
                      mt={2}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          src={item.teacherAvatar}
                          alt={item.teacherName}
                          sx={{ width: 26, height: 26 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {item.teacherName}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <IconCalendarEvent size={15} />
                        <Typography variant="body2" color="text.secondary">
                          {formatClassDate(item.startsAt, appLocale)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <IconClock size={15} />
                        <Typography variant="body2" color="text.secondary">
                          {formatClassTimeRange(item, appLocale)}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="body2"
                      mt={1.5}
                      fontWeight={600}
                      color={join.canJoin ? "success.main" : "text.secondary"}
                    >
                      {formatRelativeStart(item, now, t)} · {join.message}
                    </Typography>

                    {partners.length ? (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        {t(isParticipant ? "classes.detail.with" : "classes.detail.students", {
                          names: partners.map((person) => person.name).join(", "),
                        })}
                      </Typography>
                    ) : null}

                    {item.rescheduledFrom ? (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        {t("classes.detail.rescheduledFrom", {
                          date: formatClassDateTime(item.rescheduledFrom, appLocale, t),
                        })}
                      </Typography>
                    ) : null}
                  </Box>

                  <Stack
                    direction={{ xs: "row", sm: "column" }}
                    spacing={1.5}
                    width={{ xs: "100%", sm: "auto" }}
                    flexShrink={0}
                  >
                    {join.canJoin ? (
                      <LinkButton
                        href={classRoomHref(item.id)}
                        variant="contained"
                        color="success"
                        startIcon={<IconVideo size={16} />}
                      >
                        {t("classes.detail.joinClass")}
                      </LinkButton>
                    ) : null}
                    <LinkButton
                      href="/classes"
                      variant="outlined"
                      startIcon={<IconArrowLeft size={16} />}
                    >
                      {t("classes.detail.allClasses")}
                    </LinkButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <SectionCard
              title={t("classes.detail.coverTitle")}
              subtitle={t("classes.detail.coverSubtitle")}
            >
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                    {t("classes.detail.agenda")}
                  </Typography>
                  <Stack spacing={1.5}>
                    {agenda.map((entry, index) => (
                      <Stack
                        key={entry}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <Avatar
                          sx={{
                            width: 26,
                            height: 26,
                            fontSize: 13,
                            bgcolor: "primary.light",
                            color: "primary.main",
                          }}
                        >
                          {index + 1}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {entry}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                    {t("classes.detail.outcomes")}
                  </Typography>
                  <Stack spacing={1.5}>
                    {outcomes.map((outcome) => (
                      <Stack
                        key={outcome}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <IconFileText size={18} color="var(--mui-palette-primary-main)" />
                        <Typography variant="body2" color="text.secondary">
                          {outcome}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </SectionCard>

            {item.materials.length || item.teacherNote || item.homework || (item.recordingUrl && !recordings.length) ? (
            <SectionCard
              title={t("classes.detail.prepareTitle")}
              subtitle={t("classes.detail.prepareSubtitle")}
            >
              <Stack spacing={2.5} divider={<Divider />}>
                {item.materials.map((material, index) => (
                  <Stack
                    key={material.title}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        bgcolor: "primary.light",
                        color: "primary.main",
                      }}
                    >
                      <IconNotebook size={20} />
                    </Avatar>
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {materialTitles[index] ?? material.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {materialDescriptions[index] ?? material.description}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={material.href}
                      size="small"
                      variant="outlined"
                      endIcon={<IconExternalLink size={14} />}
                    >
                      {t("classes.detail.open")}
                    </LinkButton>
                  </Stack>
                ))}

                {item.teacherNote ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t("classes.detail.teacherNote")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {teacherNote}
                    </Typography>
                  </Box>
                ) : null}

                {item.homework ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t("classes.detail.homework")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {homework}
                    </Typography>
                  </Box>
                ) : null}

                {item.recordingUrl && !recordings.length ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t("classes.detail.recording")}
                    </Typography>
                    <LinkButton
                      href={item.recordingUrl}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                      endIcon={<IconExternalLink size={14} />}
                    >
                      {t("classes.detail.watchClass")}
                    </LinkButton>
                  </Box>
                ) : null}
              </Stack>
            </SectionCard>
            ) : null}

            {learning ? (
              <ClassLearningPanel
                sessionId={item.id}
                learning={learning}
                canEdit={relation === "teacher" || relation === "staff"}
                isParticipant={relation === "participant"}
                notes={{
                  recap: item.recap ?? "",
                  homework: item.homework ?? "",
                  teacherNote: item.teacherNote ?? "",
                }}
                library={library}
                timeZone={viewerTimeZone}
              />
            ) : null}

            <ClassRecordings recordings={recordings} timeZone={viewerTimeZone} />

            <ClassTranscript lines={transcript} timeZone={viewerTimeZone} />

            {item.recap ? (
              <SectionCard
                title={t("classes.detail.recapTitle")}
                subtitle={t("classes.detail.recapSubtitle")}
              >
                <Stack spacing={2}>
                  <Typography color="text.secondary">{recap}</Typography>
                  {item.homework ? (
                    <Box sx={{ p: 2, bgcolor: "grey.100" }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {t("classes.detail.homework")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {homework}
                      </Typography>
                    </Box>
                  ) : null}
                  {hasRecording ? (
                    <LinkButton
                      href="#class-recording"
                      size="small"
                      variant="outlined"
                      startIcon={<IconVideo size={15} />}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      {t("classes.detail.watchRecording")}
                    </LinkButton>
                  ) : null}
                </Stack>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              title={t("classes.detail.meetingTitle")}
              subtitle={t("classes.detail.meetingSubtitle", { minutes: item.duration })}
              action={
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: join.canJoin ? "success.light" : "primary.light",
                    color: join.canJoin ? "success.main" : "primary.main",
                  }}
                >
                  <IconVideo size={20} />
                </Avatar>
              }
            >
              <Stack spacing={2}>
                <Alert severity={join.canJoin ? "success" : "info"}>
                  {join.message}
                </Alert>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.detail.opens")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.opensAt, appLocale, t)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.detail.closes")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.closesAt, appLocale, t)}
                  </Typography>
                </Stack>
                {join.canJoin ? (
                  <LinkButton
                    href={classRoomHref(item.id)}
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<IconVideo size={16} />}
                  >
                    {t("classes.detail.enterClassroom")}
                  </LinkButton>
                ) : null}
              </Stack>
            </SectionCard>

            <SectionCard
              title={t("classes.detail.manageTitle")}
              subtitle={t("classes.detail.manageSubtitle")}
              action={
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "warning.light",
                    color: "warning.main",
                  }}
                >
                  <IconRefresh size={20} />
                </Avatar>
              }
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t("classes.detail.cancelSection")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cancelDecision.message}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{ mt: 1.5 }}
                    disabled={!canCancel || pending}
                    startIcon={<IconX size={15} />}
                    onClick={() => setDialog("cancel")}
                  >
                    {t("classes.detail.cancelClass")}
                  </Button>
                </Box>

                {isParticipant ? (
                  <>
                    <Divider />

                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t("classes.detail.rescheduleSection")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rescheduleDecision.message}
                        {isPaired ? t("classes.detail.partnerAccept") : ""}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1.5 }}
                        disabled={!rescheduleDecision.allowed || pending || Boolean(proposal)}
                        startIcon={<IconRefresh size={15} />}
                        onClick={openReschedule}
                      >
                        {t("classes.detail.chooseNewTime")}
                      </Button>
                    </Box>
                  </>
                ) : null}

                <Typography variant="caption" color="text.secondary">
                  {t("classes.detail.changeNotice", { hours: policy.cancelCutoffHours })}
                </Typography>
              </Stack>
            </SectionCard>

            {canRate ? (
              <SectionCard
                title={myRating ? t("classes.detail.yourRating") : t("classes.detail.rateTitle")}
                subtitle={t("classes.detail.ratingSubtitle")}
              >
                <Stack spacing={1.5}>
                  <Rating
                    value={stars}
                    onChange={(_, value) => setStars(value)}
                    size="large"
                    aria-label={t("classes.detail.stars")}
                  />
                  <TextField
                    label={t("classes.detail.commentOptional")}
                    value={ratingComment}
                    onChange={(event) => setRatingComment(event.target.value)}
                    multiline
                    minRows={2}
                    disabled={pending}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                    disabled={!stars || pending}
                    onClick={submitRating}
                  >
                    {myRating ? t("classes.detail.updateRating") : t("classes.detail.sendRating")}
                  </Button>
                </Stack>
              </SectionCard>
            ) : null}

            {item.cancellation ? (
              <SectionCard
                title={t("classes.detail.cancellationTitle")}
                subtitle={t("classes.detail.cancellationSubtitle")}
              >
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.detail.canceledByOn", {
                      by: cancellationBy[item.cancellation.by],
                      date: formatClassDateTime(item.cancellation.at, appLocale, t),
                    })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.detail.reason", {
                      reason: fixtureText(
                        t,
                        fixtureCancellationReasons,
                        item.id,
                        item.cancellation.reason,
                      ),
                    })}
                  </Typography>
                  <Chip
                    label={
                      item.cancellation.creditRefunded
                        ? t("classes.detail.creditReturned")
                        : t("classes.detail.creditNotReturned")
                    }
                    color={
                      item.cancellation.creditRefunded ? "success" : "default"
                    }
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={dialog === "cancel"} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t("classes.detail.cancelDialogTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("classes.detail.cancelDialogBody", {
              topic,
              teacher: item.teacherName,
              date: formatClassDateTime(item.startsAt, appLocale, t),
              detail: isParticipant
                ? t("classes.detail.cancelParticipant", {
                    paired: isPaired ? t("classes.detail.cancelPaired") : "",
                  })
                : t("classes.detail.cancelStaff"),
            })}
          </DialogContentText>
          <TextField
            label={t("common.reasonOptional")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            disabled={pending}
          />
          {result && !result.ok ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {result.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={pending}>
            {t("classes.detail.keepClass")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitCancel}
            disabled={pending}
          >
            {pending ? t("classes.detail.canceling") : t("classes.detail.confirmCancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialog === "reschedule"}
        onClose={closeDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t("classes.detail.rescheduleDialogTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isPaired
              ? t("classes.detail.pairedHelp")
              : t("classes.detail.singleHelp")}
          </DialogContentText>
          <Stack spacing={2} mt={2}>
            {slots === null ? (
              <Typography color="text.secondary">{t("classes.detail.loadingTimes")}</Typography>
            ) : !slotDays.length ? (
              <Typography color="text.secondary">{t("classes.detail.noTimes")}</Typography>
            ) : (
              <>
                <TextField
                  select
                  label={t("classes.detail.day")}
                  value={activeDay?.label ?? ""}
                  onChange={(event) => {
                    setDayKey(event.target.value);
                    setStartsAt("");
                  }}
                  fullWidth
                  disabled={pending}
                >
                  {slotDays.map((day) => (
                    <MenuItem key={day.label} value={day.label}>
                      {day.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t("classes.detail.time")}
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  fullWidth
                  disabled={pending}
                  helperText={t("classes.detail.timesInZone", { zone: viewerTimeZone })}
                >
                  {(activeDay?.times ?? []).map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {timeFormatter.format(new Date(slot))}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Stack>
          {result && !result.ok ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {result.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={pending}>
            {t("classes.detail.keepCurrentTime")}
          </Button>
          <Button
            variant="contained"
            onClick={submitReschedule}
            disabled={pending || !startsAt}
          >
            {pending
              ? t("classes.detail.saving")
              : isPaired
                ? t("classes.detail.proposeTime")
                : t("classes.detail.confirmTime")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
