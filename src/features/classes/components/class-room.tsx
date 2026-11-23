"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Portal from "@mui/material/Portal";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconMaximize,
  IconMinimize,
  IconVideoOff,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { isAppLocale, type AppLocale } from "@/i18n/config";
import { useAppToast } from "@/lib/use-app-toast";
import { ClassroomVideoStageLazy } from "@/features/classes/components/classroom-video-stage-lazy";
import { useClassroomPageLifecycle } from "@/features/classes/components/use-classroom-page-lifecycle";
import { ClassStatusChip } from "@/features/classes/components/class-status-chip";
import { classDetailHref } from "@/features/classes/data";
import {
  formatClassDateTime,
  formatClassTimeRange,
  formatDuration,
} from "@/features/classes/format";
import { getClassStatus, getJoinState } from "@/features/classes/policy";
import type { ClassPolicy } from "@/features/classes/policy";
import type {
  ClassroomVideoMode,
  LiveClass,
  LiveKitClassroomSession,
  RecordingClientConfig,
} from "@/features/classes/types";

type ClassRoomProps = {
  item: LiveClass;
  now: string;
  policy: ClassPolicy;
  viewerName: string;
  providerLabel: string;
  providerConfigured: boolean;
  videoMode: ClassroomVideoMode;
  liveKit: LiveKitClassroomSession | null;
  recordingConfig: RecordingClientConfig;
  tokenExpiresAt: string | null;
  guestJoinUrl: string | null;
  guestViewer: boolean;
  guestSelfServeMedia: boolean;
  canModerate: boolean;
  waitingInLobby: boolean;
  viewerAvatarUrl: string;
  teacherMustStartSession: boolean;
  awaitingTeacherSession: boolean;
  /** The teacher ended the call (students see "class ended", not "waiting"). */
  liveSessionEnded?: boolean;
  liveSessionActive: boolean;
  canEndLiveSession: boolean;
};

/**
 * Classroom with in-app video in the main stage. Pop-out remains optional.
 */
export function ClassRoom({
  item,
  now,
  policy,
  viewerName,
  providerLabel,
  providerConfigured,
  videoMode,
  liveKit,
  recordingConfig,
  tokenExpiresAt,
  guestJoinUrl,
  guestViewer,
  guestSelfServeMedia,
  canModerate,
  waitingInLobby,
  viewerAvatarUrl,
  teacherMustStartSession,
  awaitingTeacherSession,
  liveSessionEnded = false,
  liveSessionActive,
  canEndLiveSession,
}: ClassRoomProps) {
  const theme = useTheme();
  const t = useTranslations("classroom.room");
  const tStudent = useTranslations("student");
  const rawLocale = useLocale();
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : "en";
  const searchParams = useSearchParams();
  const guestJoinToken = guestViewer ? searchParams.get("join") : null;
  const { showInfo } = useAppToast();
  const [copied, setCopied] = useState(false);
  const [guestCopied, setGuestCopied] = useState(false);
  const [focusVideo, setFocusVideo] = useState(false);
  const status = getClassStatus(item, now);
  const join = getJoinState(item, now, policy, tStudent);
  const open = join.canJoin;
  const inLiveCall =
    open &&
    liveSessionActive &&
    !waitingInLobby &&
    !teacherMustStartSession &&
    !awaitingTeacherSession &&
    (videoMode === "livekit" ? Boolean(liveKit) : true);

  useClassroomPageLifecycle({
    classId: item.id,
    active: inLiveCall,
    onLeaveRoute: () => {
      setFocusVideo(false);
      showInfo({ message: t("leftClassroom") });
    },
  });

  useEffect(() => {
    if (!focusVideo) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [focusVideo]);

  const copyRoom = async () => {
    const value = liveKit?.serverUrl;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(
        t("roomInfoClipboard", { url: value, name: liveKit.roomName }),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const copyGuestLink = async () => {
    if (!guestJoinUrl) return;
    try {
      await navigator.clipboard.writeText(guestJoinUrl);
      setGuestCopied(true);
      window.setTimeout(() => setGuestCopied(false), 2000);
    } catch {
      setGuestCopied(false);
    }
  };

  return (
    <Box sx={{ mt: focusVideo ? 0 : 3 }}>
      <Box sx={{ display: focusVideo ? "none" : "block" }}>
        <Breadcrumb
          title={t("breadcrumb")}
          subtitle={`${item.topic} · ${formatClassTimeRange(item, locale)}`}
          items={[
            { title: t("myClasses"), to: "/classes" },
            { title: item.topic, to: classDetailHref(item.id) },
            { title: t("breadcrumb") },
          ]}
        />
      </Box>

      <Grid container spacing={focusVideo ? 0 : 3}>
        <Grid size={{ xs: 12, lg: focusVideo ? 12 : 8 }}>
          <Portal disablePortal={!focusVideo}>
            <Card
              square={focusVideo}
              elevation={focusVideo ? 0 : 9}
              sx={{
                overflow: "hidden",
                p: 0,
                ...(focusVideo
                  ? {
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100dvh",
                      maxWidth: "none",
                      margin: 0,
                      zIndex: theme.zIndex.modal + 2,
                      borderRadius: "0 !important",
                      boxShadow: "none",
                      display: "flex",
                      flexDirection: "column",
                      "& > .MuiBox-root": { borderRadius: "0 !important" },
                    }
                  : {}),
              }}
            >
            {focusVideo ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1,
                  bgcolor: "#0f1014",
                  color: "#fff",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "0 !important",
                  flexShrink: 0,
                }}
              >
                <Typography variant="subtitle2" noWrap>
                  {item.topic} · {t("focusMode")}
                </Typography>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<IconMinimize size={16} />}
                  onClick={() => setFocusVideo(false)}
                >
                  {t("exitFullView")}
                </Button>
              </Box>
            ) : null}
            <Box
              sx={{
                position: "relative",
                bgcolor: "#17181C",
                color: "#fff",
                aspectRatio: focusVideo ? "unset" : "16 / 9",
                flex: focusVideo ? 1 : undefined,
                minHeight: focusVideo ? 0 : undefined,
                width: "100%",
                overflow: "hidden",
                ...(focusVideo
                  ? {
                      borderRadius: "0 !important",
                      "& .MuiBox-root": { borderRadius: "0 !important" },
                    }
                  : {}),
              }}
            >
              {open && !focusVideo ? (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<IconMaximize size={16} />}
                  onClick={() => setFocusVideo(true)}
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    zIndex: 5,
                    bgcolor: "rgba(0,0,0,0.55)",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                  }}
                >
                  {t("fullView")}
                </Button>
              ) : null}
              {open ? (
                <ClassroomVideoStageLazy
                  mode={videoMode}
                  liveKit={liveKit}
                  classId={item.id}
                  meetingRoom={item.meetingRoom}
                  viewerName={viewerName}
                  topic={item.topic}
                  teacherName={item.teacherName}
                  recordingConfig={recordingConfig}
                  guestViewer={guestViewer}
                  guestSelfServeMedia={guestSelfServeMedia}
                  canModerate={canModerate}
                  waitingInLobby={waitingInLobby}
                  viewerAvatarUrl={viewerAvatarUrl}
                  teacherMustStartSession={teacherMustStartSession}
                  awaitingTeacherSession={awaitingTeacherSession}
                  liveSessionEnded={liveSessionEnded}
                  canEndLiveSession={canEndLiveSession}
                  guestJoinToken={guestJoinToken}
                />
              ) : (
                <Stack
                  spacing={2}
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  px={2}
                  sx={{ position: "absolute", inset: 0, p: 3 }}
                >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    <IconVideoOff size={34} />
                  </Avatar>
                  <Typography variant="h5" color="#fff">
                    {t("notOpenYet")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 420 }}
                  >
                    {join.message}
                  </Typography>
                  <LinkButton
                    href={classDetailHref(item.id)}
                    variant="contained"
                    color="primary"
                    startIcon={<IconArrowLeft size={16} />}
                  >
                    {t("backToDetails")}
                  </LinkButton>
                </Stack>
              )}
            </Box>

            <CardContent sx={{ p: { xs: "20px", md: "24px" }, display: focusVideo ? "none" : "block" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={item.teacherAvatar}
                    alt={item.teacherName}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Box minWidth={0}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      gap={0.75}
                    >
                      <ClassStatusChip status={status} />
                      <Chip
                        label={formatDuration(item.duration, tStudent)}
                        size="small"
                        variant="outlined"
                      />
                      {open && teacherMustStartSession ? (
                        <Chip
                          label={t("startTheCall")}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ) : null}
                      {open && awaitingTeacherSession ? (
                        <Chip
                          label={liveSessionEnded ? t("classEnded") : t("waitingForTeacher")}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ) : null}
                      {open && liveSessionActive && !teacherMustStartSession ? (
                        <Chip
                          label={t("liveInApp")}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="h6" mt={0.5}>
                      {item.topic}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.teacherName} · {formatClassTimeRange(item, locale)}
                    </Typography>
                  </Box>
                </Stack>

                {open ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={copyRoom}
                      disabled={!liveKit}
                      startIcon={
                        copied ? <IconCheck size={15} /> : <IconCopy size={15} />
                      }
                    >
                      {copied ? t("roomCopied") : t("copyRoomInfo")}
                    </Button>
                    {guestJoinUrl ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={copyGuestLink}
                        startIcon={
                          guestCopied ? (
                            <IconCheck size={15} />
                          ) : (
                            <IconCopy size={15} />
                          )
                        }
                      >
                        {guestCopied ? t("guestLinkCopied") : t("copyGuestLink")}
                      </Button>
                    ) : null}
                  </Stack>
                ) : (
                  <LinkButton
                    href={classDetailHref(item.id)}
                    variant="outlined"
                    startIcon={<IconArrowLeft size={16} />}
                  >
                    {t("classDetails")}
                  </LinkButton>
                )}
              </Stack>
            </CardContent>
            </Card>
          </Portal>
          {focusVideo ? (
            <Box sx={{ aspectRatio: "16 / 9", visibility: "hidden" }} aria-hidden />
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: focusVideo ? "none" : undefined }}>
          <Stack spacing={3}>
            <SectionCard
              title={t("roomStatus")}
              subtitle={providerConfigured ? t("videoInPage") : t("localPreview")}
              action={
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: open ? "success.light" : "primary.light",
                    color: open ? "success.main" : "primary.main",
                  }}
                >
                  <IconClock size={20} />
                </Avatar>
              }
            >
              <Stack spacing={2}>
                <Alert severity={open ? "success" : "info"}>
                  {open
                    ? guestViewer
                      ? guestSelfServeMedia
                        ? t("guestStaffAlert")
                        : t("guestSignedAlert")
                      : t("privateClassroomAlert")
                    : join.message}
                </Alert>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("opens")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.opensAt, locale, tStudent)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("closes")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatClassDateTime(join.closesAt, locale, tStudent)}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("provider")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {providerLabel}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("room")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {item.meetingRoom}
                  </Typography>
                </Stack>
                {open && tokenExpiresAt ? (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t("accessExpires")}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatClassDateTime(tokenExpiresAt, locale, tStudent)}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </SectionCard>

            <SectionCard title={t("beforeYouJoin")} subtitle={t("smoothClass")}>
              <Stack spacing={1.5} divider={<Divider />}>
                <Typography variant="body2" color="text.secondary">
                  {t("tipHeadphones")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {providerConfigured ? t("tipLiveKit") : t("tipFallback")}{" "}
                  {t("tipToolbar")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("tipLayout")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("tipAccess")}{" "}
                  <Typography component="span" variant="body2" fontWeight={600}>
                    {t("tipGuestLinks")}
                  </Typography>{" "}
                  {t("tipAccessSuffix")}{" "}
                  {recordingConfig.storage === "cloud"
                    ? t("tipCloudRecording")
                    : t("tipLocalRecording")}
                </Typography>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}