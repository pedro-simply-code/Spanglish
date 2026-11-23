"use client";

import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconClock,
  IconVideo,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isAppLocale } from "@/i18n/config";
import { LinkButton } from "@/components/ui/link-button";
import { ClassStatusChip } from "@/features/classes/components/class-status-chip";
import { classDetailHref, classRoomHref } from "@/features/classes/data";
import {
  formatClassDateShort,
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
  type ClassPolicy,
} from "@/features/classes/policy";
import type { LiveClass, LiveClassCancellation } from "@/features/classes/types";

type ClassListCardProps = {
  item: LiveClass;
  now: string;
  policy: ClassPolicy;
  /** Signed-in user: "you" is left out of the people line. */
  viewerId?: string;
};

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

export function ClassListCard({ item, now, policy, viewerId }: ClassListCardProps) {
  const t = useTranslations("student");
  const topic = fixtureText(t, fixtureTopics, item.id, item.topic);
  const description = fixtureText(t, fixtureDescriptions, item.id, item.description);
  const rootT = useTranslations();
  const locale = useLocale();
  const appLocale = isAppLocale(locale) ? locale : defaultLocale;
  const status = getClassStatus(item, now);
  const join = getJoinState(item, now, policy, t);
  const date = getClassDateParts(item.startsAt, appLocale);
  const changesOpen =
    status === "upcoming" &&
    decideClassChange(item, "cancel", now, policy, t, appLocale).allowed;
  const muted = status === "canceled";
  // Who the class is with: the teacher for students (plus the partner in a
  // paired class), the students for the teacher, everyone for staff.
  const isTeacher = viewerId === item.teacherId;
  const students = (item.participants ?? []).filter((person) => person.userId !== viewerId);
  const partners = isTeacher ? [] : students;
  const partnerNames = partners.map((person) => person.name).join(" & ");
  const viewerIsStudent = (item.participants ?? []).some((person) => person.userId === viewerId);
  const cancellationBy: Record<LiveClassCancellation["by"], string> = {
    student: rootT("shell.roles.student"),
    teacher: rootT("shell.roles.teacher"),
    staff: t("classes.list.byStaff"),
  };

  return (
    <Card elevation={9}>
      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: 72 },
              py: 1.25,
              px: { xs: 2, sm: 1 },
              textAlign: "center",
              bgcolor: muted ? "grey.200" : "primary.light",
              color: muted ? "text.secondary" : "primary.main",
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
            <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
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
              {status === "upcoming" && !changesOpen ? (
                <Chip
                  label={t("classes.list.changesClosed")}
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              ) : null}
              {join.canJoin ? (
                <Chip
                  label={t("classes.list.roomOpen")}
                  color="success"
                  size="small"
                />
              ) : null}
              {item.recordingId ? (
                <Chip
                  icon={<IconVideo size={14} />}
                  label={t("classes.list.hasRecording")}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              ) : null}
            </Stack>

            <Typography
              variant="h5"
              mt={1.25}
              color={muted ? "text.secondary" : "text.primary"}
            >
              {topic}
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 0.5, sm: 2 }}
              mt={1}
            >
              {isTeacher ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}>
                    {students.map((person) => (
                      <Avatar key={person.userId} src={person.image ?? undefined} alt={person.name}>
                        {person.name.charAt(0)}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <Typography variant="body2" color="text.secondary">
                    {students.length
                      ? t("classes.list.withStudents", { names: students.map((person) => person.name).join(" & ") })
                      : t("classes.list.noStudents")}
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    src={item.teacherAvatar}
                    alt={item.teacherName}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.list.withTeacher", { name: item.teacherName })}
                    {partners.length
                      ? ` · ${
                          viewerIsStudent
                            ? t("classes.list.withPartner", { name: partnerNames })
                            : t("classes.list.withStudents", { names: partnerNames })
                        }`
                      : ""}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconCalendarEvent size={14} />
                <Typography variant="body2" color="text.secondary">
                  {formatClassDateShort(item.startsAt, appLocale)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconClock size={14} />
                <Typography variant="body2" color="text.secondary">
                  {formatClassTimeRange(item, appLocale)}
                </Typography>
              </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary" mt={1.25}>
              {description}
            </Typography>

            {status === "canceled" && item.cancellation ? (
              <Typography variant="body2" color="error.main" mt={1}>
                {t("classes.list.canceledBy", {
                  by: cancellationBy[item.cancellation.by],
                  reason: fixtureText(
                    t,
                    fixtureCancellationReasons,
                    item.id,
                    item.cancellation.reason,
                  ),
                  refund: item.cancellation.creditRefunded
                    ? t("classes.list.creditReturned")
                    : t("classes.list.creditNotReturned"),
                })}
              </Typography>
            ) : null}

            <Typography
              variant="body2"
              mt={1}
              fontWeight={600}
              color={join.canJoin ? "success.main" : "text.secondary"}
            >
              {formatRelativeStart(item, now, t)}
            </Typography>
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
                {t("classes.list.join")}
              </LinkButton>
            ) : null}
            <LinkButton
              href={classDetailHref(item.id)}
              variant={join.canJoin ? "outlined" : "contained"}
              endIcon={<IconArrowRight size={16} />}
            >
              {t("classes.list.details")}
            </LinkButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
