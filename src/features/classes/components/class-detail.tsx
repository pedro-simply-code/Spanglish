"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  IconChecklist,
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
} from "@/features/classes/types";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import {
  getAssignmentsByIds,
  getAssignmentsForClass,
  getMaterialById,
  getMaterialsByIds,
} from "@/features/materials/data";
import { formatMaterialDateTime } from "@/features/materials/format";

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
};

type DialogKind = "cancel" | "reschedule" | null;

export function ClassDetail({
  item,
  now,
  policy,
  relation,
  viewerId,
  viewerTimeZone,
  myRating = null,
}: ClassDetailProps) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ClassActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const [slots, setSlots] = useState<string[] | null>(null);
  const [dayKey, setDayKey] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const status = getClassStatus(item, now);
  const join = getJoinState(item, now, policy);
  const cancelDecision = decideClassChange(item, "cancel", now, policy);
  const rescheduleDecision = decideClassChange(
    item,
    "reschedule",
    now,
    policy,
  );
  const date = getClassDateParts(item.startsAt);
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

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: viewerTimeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [viewerTimeZone],
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: viewerTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [viewerTimeZone],
  );
  const fullFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: viewerTimeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [viewerTimeZone],
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
  const libraryMaterials = getMaterialsByIds(item.materialIds ?? []);
  const classAssignments =
    item.assignmentIds && item.assignmentIds.length
      ? getAssignmentsByIds(item.assignmentIds)
      : getAssignmentsForClass(item.id);
  const recording = item.recordingId
    ? getMaterialById(item.recordingId)
    : undefined;

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
        title={item.topic}
        subtitle={`${formatClassDate(item.startsAt)} · ${formatClassTimeRange(item)}`}
        items={[
          { title: "My classes", to: "/classes" },
          { title: item.topic },
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
                  Decline
                </Button>
                <Button variant="contained" size="small" disabled={pending} onClick={() => answerProposal(true)}>
                  Accept
                </Button>
              </Stack>
            )
          }
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {proposalIsMine ? "Waiting for your partner" : `${proposal.requestedByName} proposed a new time`}
          </Typography>
          Move to {fullFormatter.format(new Date(proposal.newStartsAt))}.{" "}
          {proposalIsMine
            ? "If they do not answer within 24 hours, the class keeps its current time."
            : `Answer before ${fullFormatter.format(new Date(proposal.expiresAt))}; otherwise the class keeps its time.`}
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
                        label={formatClassType(item.type)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${item.duration} min`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${item.creditCost} credit`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="h4" mt={1.5}>
                      {item.topic}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      {item.description}
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
                          {formatClassDate(item.startsAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <IconClock size={15} />
                        <Typography variant="body2" color="text.secondary">
                          {formatClassTimeRange(item)}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="body2"
                      mt={1.5}
                      fontWeight={600}
                      color={join.canJoin ? "success.main" : "text.secondary"}
                    >
                      {formatRelativeStart(item, now)} · {join.message}
                    </Typography>

                    {partners.length ? (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        {isParticipant ? "With" : "Students"}: {partners.map((person) => person.name).join(", ")}
                      </Typography>
                    ) : null}

                    {item.rescheduledFrom ? (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Rescheduled from {formatClassDateTime(item.rescheduledFrom)}.
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
                        Join class
                      </LinkButton>
                    ) : null}
                    <LinkButton
                      href="/classes"
                      variant="outlined"
                      startIcon={<IconArrowLeft size={16} />}
                    >
                      All classes
                    </LinkButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <SectionCard
              title="What we will cover"
              subtitle="Agenda and learning outcomes"
            >
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                    Agenda
                  </Typography>
                  <Stack spacing={1.5}>
                    {item.agenda.map((entry, index) => (
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
                    You will be able to
                  </Typography>
                  <Stack spacing={1.5}>
                    {item.outcomes.map((outcome) => (
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

            <SectionCard
              title="Prepare for class"
              subtitle="Materials and notes from your teacher"
            >
              <Stack spacing={2.5} divider={<Divider />}>
                {item.materials.map((material) => (
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
                        {material.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {material.description}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={material.href}
                      size="small"
                      variant="outlined"
                      endIcon={<IconExternalLink size={14} />}
                    >
                      Open
                    </LinkButton>
                  </Stack>
                ))}

                {libraryMaterials.map((material) => (
                  <Stack
                    key={material.id}
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
                      <IconFileText size={20} />
                    </Avatar>
                    <Box flexGrow={1} minWidth={0}>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          {material.title}
                        </Typography>
                        <MaterialKindChip kind={material.kind} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {material.description}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={`/materials/${material.id}`}
                      size="small"
                      variant="outlined"
                      endIcon={<IconExternalLink size={14} />}
                    >
                      Open
                    </LinkButton>
                  </Stack>
                ))}

                {classAssignments.length ? (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconChecklist size={18} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Assigned practice
                      </Typography>
                    </Stack>
                    <Stack spacing={1.5} mt={1.5}>
                      {classAssignments.map((assignment) => {
                        const material = getMaterialById(
                          assignment.materialId,
                        );

                        return (
                          <Stack
                            key={assignment.id}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ p: 1.5, bgcolor: "grey.100" }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {assignment.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {assignment.submitted} of{" "}
                                {assignment.totalStudents} submitted
                                {assignment.dueAt
                                  ? ` · due ${formatMaterialDateTime(assignment.dueAt)}`
                                  : ""}
                              </Typography>
                            </Box>
                            {material ? (
                              <LinkButton
                                href={`/practice/${material.id}`}
                                size="small"
                                variant="outlined"
                              >
                                Open form
                              </LinkButton>
                            ) : null}
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}

                {item.teacherNote ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Teacher note
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.teacherNote}
                    </Typography>
                  </Box>
                ) : null}

                {item.homework ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Homework
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.homework}
                    </Typography>
                  </Box>
                ) : null}

                {recording || item.recordingUrl ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Recording
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recording
                        ? `${recording.duration ?? "Full class"} · ${
                            recording.transcriptReady
                              ? "transcript ready"
                              : "transcript processing"
                          }`
                        : "Watch the class recording."}
                    </Typography>
                    <LinkButton
                      href={
                        recording
                          ? `/materials/${recording.id}`
                          : item.recordingUrl ?? "#"
                      }
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                      endIcon={<IconExternalLink size={14} />}
                    >
                      {recording ? "Open recording" : "Watch the class"}
                    </LinkButton>
                  </Box>
                ) : null}
              </Stack>
            </SectionCard>

            {item.recap ? (
              <SectionCard
                title="Class recap"
                subtitle="What your teacher noticed and what to practice next"
              >
                <Stack spacing={2}>
                  <Typography color="text.secondary">{item.recap}</Typography>
                  {item.homework ? (
                    <Box sx={{ p: 2, bgcolor: "grey.100" }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Homework
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.homework}
                      </Typography>
                    </Box>
                  ) : null}
                  {recording ? (
                    <LinkButton
                      href={`/materials/${recording.id}`}
                      size="small"
                      variant="outlined"
                      startIcon={<IconVideo size={15} />}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Watch the class recording
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
              title="Meeting room"
              subtitle={`${item.duration}-minute live class`}
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
                    Opens
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.opensAt)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Closes
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.closesAt)}
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
                    Enter classroom
                  </LinkButton>
                ) : null}
              </Stack>
            </SectionCard>

            <SectionCard
              title="Manage this class"
              subtitle="Server-enforced policy"
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
                    Cancel
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
                    Cancel class
                  </Button>
                </Box>

                {isParticipant ? (
                  <>
                    <Divider />

                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Reschedule
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rescheduleDecision.message}
                        {isPaired ? " Your partner has to accept the new time." : ""}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1.5 }}
                        disabled={!rescheduleDecision.allowed || pending || Boolean(proposal)}
                        startIcon={<IconRefresh size={15} />}
                        onClick={openReschedule}
                      >
                        Choose a new time
                      </Button>
                    </Box>
                  </>
                ) : null}

                <Typography variant="caption" color="text.secondary">
                  Changes need at least {policy.cancelCutoffHours} hours of
                  notice. The server checks the cutoff again when you confirm.
                </Typography>
              </Stack>
            </SectionCard>

            {canRate ? (
              <SectionCard
                title={myRating ? "Your rating" : "Rate this class"}
                subtitle="Your rating helps your teacher grow and other students choose."
              >
                <Stack spacing={1.5}>
                  <Rating
                    value={stars}
                    onChange={(_, value) => setStars(value)}
                    size="large"
                    aria-label="Stars"
                  />
                  <TextField
                    label="Comment (optional)"
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
                    {myRating ? "Update rating" : "Send rating"}
                  </Button>
                </Stack>
              </SectionCard>
            ) : null}

            {item.cancellation ? (
              <SectionCard title="Cancellation" subtitle="What happened">
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Canceled by {item.cancellation.by} on{" "}
                    {formatClassDateTime(item.cancellation.at)}.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reason: {item.cancellation.reason}
                  </Typography>
                  <Chip
                    label={
                      item.cancellation.creditRefunded
                        ? "Credit returned"
                        : "Credit not returned"
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
        <DialogTitle>Cancel this class?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {item.topic} with {item.teacherName} on{" "}
            {formatClassDateTime(item.startsAt)}.{" "}
            {isParticipant
              ? `The credit goes back to the package${isPaired ? " and the class is canceled for both of you" : ""}.`
              : "The students get their credit back and an email."}
          </DialogContentText>
          <TextField
            label="Reason (optional)"
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
            Keep class
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitCancel}
            disabled={pending}
          >
            {pending ? "Canceling…" : "Cancel class"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialog === "reschedule"}
        onClose={closeDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Choose a new time</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isPaired
              ? "Pick a time when the teacher and both of you are free. Your partner has 24 hours to accept."
              : "Pick an open time. The class keeps its current time until you confirm."}
          </DialogContentText>
          <Stack spacing={2} mt={2}>
            {slots === null ? (
              <Typography color="text.secondary">Loading open times…</Typography>
            ) : !slotDays.length ? (
              <Typography color="text.secondary">No open times in the next three weeks.</Typography>
            ) : (
              <>
                <TextField
                  select
                  label="Day"
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
                  label="Time"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  fullWidth
                  disabled={pending}
                  helperText={`Times in your time zone (${viewerTimeZone}).`}
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
            Keep current time
          </Button>
          <Button
            variant="contained"
            onClick={submitReschedule}
            disabled={pending || !startsAt}
          >
            {pending ? "Saving…" : isPaired ? "Propose new time" : "Confirm new time"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
