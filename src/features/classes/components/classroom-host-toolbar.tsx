"use client";

import { useCallback, useEffect, useState } from "react";
import { LabeledToolbarTool } from "@/features/classes/components/classroom-toolbar-labeled-tool";
import { useRouter } from "next/navigation";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconBroadcast,
  IconDoorEnter,
  IconLayoutGrid,
  IconLayoutList,
  IconLogout,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlayerRecord,
  IconPlayerStop,
  IconScreenShare,
} from "@tabler/icons-react";
import {
  approveClassroomAdmissionAction,
  denyClassroomAdmissionAction,
  getClassroomEgressStatusAction,
  getClassroomHostCapabilitiesAction,
  listClassroomWaitingAction,
  muteAllClassroomAudioAction,
  startClassroomCloudRecordingAction,
  startClassroomRtmpStreamAction,
  endClassLiveSessionAction,
  stopClassroomCloudRecordingAction,
  stopClassroomRtmpStreamAction,
} from "@/features/classes/classroom-actions";
import type { ClassroomLayoutMode } from "@/features/classes/classroom-protocol";
import { useAppToast } from "@/lib/use-app-toast";

type ClassroomHostToolbarProps = {
  classId: string;
  meetingRoom: string;
  layoutMode: ClassroomLayoutMode;
  onLayoutChange: (mode: ClassroomLayoutMode) => void;
  onBroadcastLayout: (mode: ClassroomLayoutMode) => void;
  canEndLiveSession?: boolean;
  screenShareRequests?: { identity: string; name: string }[];
  onApproveScreenShare?: (identity: string) => void;
  onDenyScreenShare?: (identity: string) => void;
  localRecordingRequests?: { identity: string; name: string }[];
  onApproveLocalRecording?: (identity: string) => void;
  onDenyLocalRecording?: (identity: string) => void;
  onMuteAllApplied?: () => void;
  audienceMicLocked?: boolean;
  onReleaseAudienceMics?: () => void;
};

export function ClassroomHostToolbar({
  classId,
  meetingRoom,
  layoutMode,
  onLayoutChange,
  onBroadcastLayout,
  canEndLiveSession = false,
  screenShareRequests = [],
  onApproveScreenShare,
  onDenyScreenShare,
  localRecordingRequests = [],
  onApproveLocalRecording,
  onDenyLocalRecording,
  onMuteAllApplied,
  audienceMicLocked = false,
  onReleaseAudienceMics,
}: ClassroomHostToolbarProps) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, setPending] = useState<{ userId: string; name: string }[]>([]);
  const [caps, setCaps] = useState({ egressReady: false, rtmpReady: false });
  const [egressKind, setEgressKind] = useState<"file" | "rtmp" | null>(null);
  const [waitingAnchor, setWaitingAnchor] = useState<HTMLElement | null>(null);
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);
  const [recordingAnchor, setRecordingAnchor] = useState<HTMLElement | null>(null);

  const refreshWaiting = () => {
    void listClassroomWaitingAction(classId).then((result) => {
      if (result.ok) setPending(result.pending);
    });
  };

  const refreshEgress = useCallback(() => {
    void getClassroomEgressStatusAction(classId).then((status) => {
      setEgressKind(status?.kind ?? null);
    });
  }, [classId]);

  useEffect(() => {
    refreshWaiting();
    refreshEgress();
    void getClassroomHostCapabilitiesAction().then(setCaps);
    const id = window.setInterval(() => {
      refreshWaiting();
      refreshEgress();
    }, 4000);
    return () => window.clearInterval(id);
  }, [classId, refreshEgress]);

  const run = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    const result = await action();
    if (result.ok) {
      showSuccess({ message: result.message });
      refreshEgress();
    } else showError({ message: result.message });
  };

  const cloudRecordingActive = egressKind === "file";
  const rtmpActive = egressKind === "rtmp";

  const setLayout = (mode: ClassroomLayoutMode) => {
    onLayoutChange(mode);
    onBroadcastLayout(mode);
  };

  const vDivider = (
    <Divider
      flexItem
      orientation="vertical"
      sx={{ borderColor: "rgba(255,255,255,0.12)", mx: 0.25, alignSelf: "center", height: 32 }}
    />
  );

  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
      <LabeledToolbarTool
        label="Speaker"
        tooltip="Sync speaker view for the whole class (one main video + filmstrip)"
      >
        <IconButton
          size="small"
          onClick={() => setLayout("speaker")}
          sx={{ color: layoutMode === "speaker" ? "primary.main" : "#fff" }}
        >
          <IconLayoutList size={20} />
        </IconButton>
      </LabeledToolbarTool>
      <LabeledToolbarTool
        label="Gallery"
        tooltip="Sync gallery view for the whole class (grid of everyone)"
      >
        <IconButton
          size="small"
          onClick={() => setLayout("gallery")}
          sx={{ color: layoutMode === "gallery" ? "primary.main" : "#fff" }}
        >
          <IconLayoutGrid size={20} />
        </IconButton>
      </LabeledToolbarTool>

      {vDivider}

      <LabeledToolbarTool
        label={audienceMicLocked ? "Allow mic" : "Mute all"}
        tooltip={
          audienceMicLocked
            ? "Let students turn their microphones back on"
            : "Mute every student microphone on the server (teachers stay unmuted)"
        }
      >
        <IconButton
          size="small"
          onClick={() => {
            if (audienceMicLocked) {
              onReleaseAudienceMics?.();
              showSuccess({ message: "Students can turn their microphones on again." });
              return;
            }
            void (async () => {
              const result = await muteAllClassroomAudioAction(classId, meetingRoom);
              if (result.ok) {
                showSuccess({ message: result.message });
                onMuteAllApplied?.();
              } else {
                showError({ message: result.message });
              }
            })();
          }}
          sx={{ color: audienceMicLocked ? "primary.main" : "#fff" }}
        >
          {audienceMicLocked ? (
            <IconMicrophone size={20} />
          ) : (
            <IconMicrophoneOff size={20} />
          )}
        </IconButton>
      </LabeledToolbarTool>

      {caps.egressReady ? (
        <>
          {vDivider}
          {cloudRecordingActive ? (
            <LabeledToolbarTool
              label="Stop cloud"
              tooltip="Stop server recording; the MP4 will finish uploading to Backblaze B2"
            >
              <IconButton
                size="small"
                onClick={() => {
                  void run(() => stopClassroomCloudRecordingAction(classId, meetingRoom));
                }}
                sx={{ color: "error.main" }}
              >
                <IconPlayerStop size={20} />
              </IconButton>
            </LabeledToolbarTool>
          ) : (
            <LabeledToolbarTool
              label="Cloud rec"
              tooltip="Start full-room recording on LiveKit (saved as MP4 in B2)"
            >
              <IconButton
                size="small"
                disabled={rtmpActive}
                onClick={() => {
                  void run(() => startClassroomCloudRecordingAction(classId, meetingRoom));
                }}
                sx={{ color: "#fff" }}
              >
                <IconPlayerRecord size={20} />
              </IconButton>
            </LabeledToolbarTool>
          )}
        </>
      ) : null}

      {caps.rtmpReady ? (
        rtmpActive ? (
          <LabeledToolbarTool label="Stop RTMP" tooltip="Stop streaming the class layout to your RTMP URL">
            <IconButton
              size="small"
              onClick={() => {
                void run(() => stopClassroomRtmpStreamAction(classId, meetingRoom));
              }}
              sx={{ color: "error.main" }}
            >
              <IconBroadcast size={20} />
            </IconButton>
          </LabeledToolbarTool>
        ) : (
          <LabeledToolbarTool
            label="RTMP"
            tooltip="Stream the composite class layout to LIVEKIT_RTMP_URL (e.g. YouTube)"
          >
            <IconButton
              size="small"
              disabled={cloudRecordingActive}
              onClick={() => {
                void run(() => startClassroomRtmpStreamAction(classId, meetingRoom));
              }}
              sx={{ color: "#fff" }}
            >
              <IconBroadcast size={20} />
            </IconButton>
          </LabeledToolbarTool>
        )
      ) : null}

      {screenShareRequests.length ? (
        <>
          {vDivider}
          <LabeledToolbarTool
            label="Share ask"
            tooltip="Students waiting for permission to share their screen"
          >
            <IconButton
              size="small"
              onClick={(event) => setShareAnchor(event.currentTarget)}
              sx={{ color: "warning.main" }}
            >
              <Badge badgeContent={screenShareRequests.length} color="warning">
                <IconScreenShare size={20} />
              </Badge>
            </IconButton>
          </LabeledToolbarTool>
          <Menu
            anchorEl={shareAnchor}
            open={Boolean(shareAnchor)}
            onClose={() => setShareAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            {screenShareRequests.map((person) => (
              <MenuItem
                key={person.identity}
                onClick={() => setShareAnchor(null)}
                sx={{ display: "block" }}
                disableRipple
              >
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  {person.name}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Typography
                    component="button"
                    variant="caption"
                    sx={{ color: "primary.main", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                    onClick={() => onApproveScreenShare?.(person.identity)}
                  >
                    Allow
                  </Typography>
                  <Typography
                    component="button"
                    variant="caption"
                    sx={{ color: "text.secondary", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                    onClick={() => onDenyScreenShare?.(person.identity)}
                  >
                    Deny
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}

      {localRecordingRequests.length ? (
        <>
          <LabeledToolbarTool
            label="Rec ask"
            tooltip="Students asking to record on their device (not cloud)"
          >
            <IconButton
              size="small"
              onClick={(event) => setRecordingAnchor(event.currentTarget)}
              sx={{ color: "#fff" }}
            >
              <Badge badgeContent={localRecordingRequests.length} color="secondary">
                <IconPlayerRecord size={20} />
              </Badge>
            </IconButton>
          </LabeledToolbarTool>
          <Menu
            anchorEl={recordingAnchor}
            open={Boolean(recordingAnchor)}
            onClose={() => setRecordingAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            {localRecordingRequests.map((person) => (
              <MenuItem
                key={person.identity}
                onClick={() => setRecordingAnchor(null)}
                sx={{ display: "block" }}
                disableRipple
              >
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  {person.name}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Typography
                    component="button"
                    variant="caption"
                    sx={{ color: "primary.main", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                    onClick={() => onApproveLocalRecording?.(person.identity)}
                  >
                    Allow
                  </Typography>
                  <Typography
                    component="button"
                    variant="caption"
                    sx={{ color: "text.secondary", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                    onClick={() => onDenyLocalRecording?.(person.identity)}
                  >
                    Deny
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}

      {pending.length ? (
        <LabeledToolbarTool label="Lobby" tooltip="People in the waiting room — admit or deny">
          <IconButton
            size="small"
            onClick={(event) => setWaitingAnchor(event.currentTarget)}
            sx={{ color: "#fff" }}
          >
            <Badge badgeContent={pending.length} color="primary">
              <IconDoorEnter size={20} />
            </Badge>
          </IconButton>
        </LabeledToolbarTool>
      ) : null}
      <Menu
        anchorEl={waitingAnchor}
        open={Boolean(waitingAnchor)}
        onClose={() => setWaitingAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        {pending.map((person) => (
          <MenuItem
            key={person.userId}
            onClick={() => setWaitingAnchor(null)}
            sx={{ display: "block" }}
            disableRipple
          >
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              {person.name}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Typography
                component="button"
                variant="caption"
                sx={{ color: "primary.main", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                onClick={() => {
                  void approveClassroomAdmissionAction(classId, person.userId).then((result) => {
                    if (result.ok) showSuccess({ message: result.message });
                    refreshWaiting();
                  });
                }}
              >
                Admit
              </Typography>
              <Typography
                component="button"
                variant="caption"
                sx={{ color: "text.secondary", border: 0, bgcolor: "transparent", cursor: "pointer" }}
                onClick={() => {
                  void denyClassroomAdmissionAction(classId, person.userId).then(refreshWaiting);
                }}
              >
                Deny
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      {canEndLiveSession ? (
        <>
          {vDivider}
          <LabeledToolbarTool
            label="End class"
            tooltip="End the live session so students can no longer join the call"
          >
            <IconButton
              size="small"
              onClick={() => {
                void endClassLiveSessionAction(classId).then((result) => {
                  if (result.ok) {
                    showSuccess({ message: result.message });
                    router.refresh();
                  } else {
                    showError({ message: result.message });
                  }
                });
              }}
              sx={{ color: "warning.main" }}
            >
              <IconLogout size={20} />
            </IconButton>
          </LabeledToolbarTool>
        </>
      ) : null}
    </Stack>
  );
}