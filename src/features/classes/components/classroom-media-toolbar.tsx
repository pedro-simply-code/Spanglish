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
  const downloadLocal = () => {
    if (!localUrl) return;
    const anchor = document.createElement("a");
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    anchor.href = localUrl;
    anchor.download = `spanglish-${slug || "recording"}.webm`;
    anchor.click();
  };

  const screenTip =
    screenShareTooltip ?? (sharingScreen ? "Stop sharing your screen" : "Share your screen");

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
          label={cameraOn ? "Cam off" : "Camera"}
          tooltip={cameraOn ? "Turn camera off" : "Turn camera on"}
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
          label={micOn ? "Mute" : "Mic on"}
          tooltip={micOn ? "Mute microphone" : "Turn microphone on"}
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
            label={sharingScreen ? "Stop share" : "Share"}
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
            label="Speaker"
            tooltip="Speaker view for you only (does not change the class)"
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
            label="Gallery"
            tooltip="Gallery view for you only — click a tile to spotlight someone on the main stage"
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
              label="Follow"
              tooltip="Use the teacher's layout again when they change view"
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
            label={localRecordingRequestPending ? "Waiting" : "Ask rec"}
            tooltip={
              localRecordingRequestPending
                ? "Waiting for the teacher to allow personal recording"
                : "Ask the teacher for permission to record on your device (not cloud)"
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
              label="Record"
              tooltip={
                localRecordingOnly
                  ? "Record on your device only (WebM). Not uploaded to the cloud."
                  : "Record what you see in this browser (WebM file)"
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
            <LabeledToolbarTool label="Stop rec" tooltip="Stop browser recording">
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
            <LabeledToolbarTool label="Download" tooltip="Download recording to your device">
              <IconButton size="small" onClick={downloadLocal} sx={{ color: "#fff" }}>
                <IconDownload size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : null}
          {localUrl && canUploadToCloud && !cloudUrl ? (
            <LabeledToolbarTool label="Upload" tooltip="Upload recording to Backblaze B2">
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
            <LabeledToolbarTool label="Cloud" tooltip="Open uploaded copy in a new tab">
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