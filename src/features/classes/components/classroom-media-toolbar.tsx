import { useTranslations } from "next-intl";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import {
  IconCloudUpload,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlayerRecord,
  IconPlayerStop,
  IconRefresh,
  IconScreenShare,
  IconScreenShareOff,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";
import type { ClassroomLayoutMode } from "@/features/classes/classroom-protocol";
import { LabeledToolbarTool } from "@/features/classes/components/classroom-toolbar-labeled-tool";

type ClassroomMediaToolbarProps = {
  recording: boolean;
  persisting: boolean;
  sharingScreen: boolean;
  cameraOn: boolean;
  micOn: boolean;
  canControlDevices?: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleRecord: () => void;
  onToggleScreen: () => void;
  localUrl: string | null;
  cloudUrl: string | null;
  topic: string;
  onUploadCloud?: () => void;
  canUploadToCloud: boolean;
  /** Browser MediaRecorder; hidden for hosts when LiveKit server recording is available. */
  showBrowserRecording?: boolean;
  variant?: "floating" | "bar" | "inline";
  screenShareTooltip?: string;
  /** Student-only local layout (does not sync the room). */
  layoutMode?: ClassroomLayoutMode;
  onLayoutModeChange?: (mode: ClassroomLayoutMode) => void;
  followHostLayout?: boolean;
  onFollowHostLayout?: () => void;
  showRecordingRequest?: boolean;
  localRecordingRequestPending?: boolean;
  onRequestLocalRecording?: () => void;
  /** Hide cloud upload buttons (student local recordings). */
  localRecordingOnly?: boolean;
};

const vDivider = (
  <Divider
    flexItem
    orientation="vertical"
    sx={{ borderColor: "rgba(255,255,255,0.12)", mx: 0.25, alignSelf: "center", height: 32 }}
  />
);

export function ClassroomMediaToolbar({
  recording,
  persisting,
  sharingScreen,
  cameraOn,
  micOn,
  canControlDevices = true,
  onToggleCamera,
  onToggleMic,
  onToggleRecord,
  onToggleScreen,
  localUrl,
  cloudUrl,
  topic,
  onUploadCloud,
  canUploadToCloud,
  showBrowserRecording = true,
  variant = "bar",
  screenShareTooltip,
  layoutMode,
  onLayoutModeChange,
  followHostLayout = true,
  onFollowHostLayout,
  showRecordingRequest = false,
  localRecordingRequestPending = false,
  onRequestLocalRecording,
  localRecordingOnly = false,
}: ClassroomMediaToolbarProps) {
  const t = useTranslations("classroom");

  const downloadLocal = () => {
    if (!localUrl) return;
    const anchor = document.createElement("a");
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    anchor.href = localUrl;
    anchor.download = `spanglish-${slug || t("recording.fallbackFileSlug")}.webm`;
    anchor.click();
  };

  const screenTip =
    screenShareTooltip ??
    (sharingScreen ? t("toolbar.stopSharingScreen") : t("toolbar.shareYourScreen"));

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="flex-start"
      justifyContent="center"
      flexWrap="wrap"
      useFlexGap
      sx={
        variant === "floating"
          ? {
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "rgba(17,17,17,0.88)",
              borderRadius: 999,
              px: 1.25,
              py: 0.75,
              border: "1px solid rgba(255,255,255,0.12)",
              zIndex: 2,
            }
          : variant === "inline"
            ? undefined
            : {
                px: 1.5,
                py: 1,
                bgcolor: "#0b0b0f",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }
      }
    >
      {canControlDevices ? (
        <LabeledToolbarTool
          label={cameraOn ? t("toolbar.cameraOff") : t("toolbar.camera")}
          tooltip={cameraOn ? t("toolbar.turnCameraOff") : t("toolbar.turnCameraOn")}
        >
          <IconButton
            size="small"
            onClick={onToggleCamera}
            sx={{ color: cameraOn ? "primary.main" : "#fff" }}
          >
            {cameraOn ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
          </IconButton>
        </LabeledToolbarTool>
      ) : null}
      {canControlDevices ? (
        <LabeledToolbarTool
          label={micOn ? t("toolbar.mute") : t("toolbar.micOn")}
          tooltip={micOn ? t("toolbar.muteMicrophone") : t("toolbar.turnMicrophoneOn")}
        >
          <IconButton
            size="small"
            onClick={onToggleMic}
            sx={{ color: micOn ? "primary.main" : "#fff" }}
          >
            {micOn ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
          </IconButton>
        </LabeledToolbarTool>
      ) : null}
      {canControlDevices ? (
        <>
          {vDivider}
          <LabeledToolbarTool
            label={sharingScreen ? t("toolbar.stopShare") : t("toolbar.share")}
            tooltip={screenTip}
          >
            <IconButton
              size="small"
              onClick={onToggleScreen}
              sx={{ color: sharingScreen ? "primary.main" : "#fff" }}
            >
              {sharingScreen ? (
                <IconScreenShareOff size={20} />
              ) : (
                <IconScreenShare size={20} />
              )}
            </IconButton>
          </LabeledToolbarTool>
        </>
      ) : null}
      {onLayoutModeChange && layoutMode ? (
        <>
          {vDivider}
          <LabeledToolbarTool
            label={t("toolbar.speaker")}
            tooltip={t("toolbar.speakerLocalTooltip")}
          >
            <IconButton
              size="small"
              onClick={() => onLayoutModeChange("speaker")}
              sx={{ color: layoutMode === "speaker" ? "primary.main" : "#fff" }}
            >
              <IconLayoutList size={20} />
            </IconButton>
          </LabeledToolbarTool>
          <LabeledToolbarTool
            label={t("toolbar.gallery")}
            tooltip={t("toolbar.galleryLocalTooltip")}
          >
            <IconButton
              size="small"
              onClick={() => onLayoutModeChange("gallery")}
              sx={{ color: layoutMode === "gallery" ? "primary.main" : "#fff" }}
            >
              <IconLayoutGrid size={20} />
            </IconButton>
          </LabeledToolbarTool>
          {!followHostLayout && onFollowHostLayout ? (
            <LabeledToolbarTool
              label={t("toolbar.follow")}
              tooltip={t("toolbar.followTooltip")}
            >
              <IconButton size="small" onClick={onFollowHostLayout} sx={{ color: "warning.main" }}>
                <IconRefresh size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : null}
        </>
      ) : null}
      {showRecordingRequest && onRequestLocalRecording ? (
        <>
          {vDivider}
          <LabeledToolbarTool
            label={
              localRecordingRequestPending ? t("toolbar.waiting") : t("toolbar.askRec")
            }
            tooltip={
              localRecordingRequestPending
                ? t("toolbar.waitingRecTooltip")
                : t("toolbar.askRecTooltip")
            }
          >
            <IconButton
              size="small"
              disabled={localRecordingRequestPending}
              onClick={onRequestLocalRecording}
              sx={{ color: localRecordingRequestPending ? "warning.main" : "#fff" }}
            >
              <IconPlayerRecord size={20} />
            </IconButton>
          </LabeledToolbarTool>
        </>
      ) : null}
      {showBrowserRecording ? (
        <>
          {vDivider}
          {!recording ? (
            <LabeledToolbarTool
              label={t("toolbar.record")}
              tooltip={
                localRecordingOnly
                  ? t("toolbar.recordLocalTooltip")
                  : t("toolbar.recordBrowserTooltip")
              }
            >
              <IconButton
                size="small"
                onClick={onToggleRecord}
                disabled={persisting}
                sx={{ color: "#fff" }}
              >
                <IconPlayerRecord size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : (
            <LabeledToolbarTool
              label={t("toolbar.stopRec")}
              tooltip={t("toolbar.stopBrowserRec")}
            >
              <IconButton
                size="small"
                onClick={onToggleRecord}
                disabled={persisting}
                sx={{ color: "error.main" }}
              >
                <IconPlayerStop size={20} />
              </IconButton>
            </LabeledToolbarTool>
          )}
          {persisting ? (
            <Stack alignItems="center" spacing={0.25} sx={{ minWidth: 48, pt: 0.75 }}>
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            </Stack>
          ) : null}
          {localUrl ? (
            <LabeledToolbarTool
              label={t("toolbar.download")}
              tooltip={t("toolbar.downloadTooltip")}
            >
              <IconButton size="small" onClick={downloadLocal} sx={{ color: "#fff" }}>
                <IconDownload size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : null}
          {localUrl && canUploadToCloud && !cloudUrl ? (
            <LabeledToolbarTool
              label={t("toolbar.upload")}
              tooltip={t("toolbar.uploadTooltip")}
            >
              <IconButton
                size="small"
                onClick={onUploadCloud}
                disabled={persisting}
                sx={{ color: "#fff" }}
              >
                <IconCloudUpload size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : null}
          {cloudUrl ? (
            <LabeledToolbarTool
              label={t("toolbar.cloud")}
              tooltip={t("toolbar.cloudTooltip")}
            >
              <IconButton
                component="a"
                href={cloudUrl}
                target="_blank"
                rel="noreferrer"
                size="small"
                sx={{ color: "#fff" }}
              >
                <IconCloudUpload size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}