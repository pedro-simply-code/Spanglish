"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ClassroomLiveKitStage } from "@/features/classes/components/classroom-livekit-stage";
import { ClassroomAwaitTeacherLobby } from "@/features/classes/components/classroom-await-teacher-lobby";
import { ClassroomTeacherStartLobby } from "@/features/classes/components/classroom-teacher-start-lobby";
import { ClassroomWaitingLobby } from "@/features/classes/components/classroom-waiting-lobby";
import { ClassroomMediaToolbar } from "@/features/classes/components/classroom-media-toolbar";
import { useClassroomRecording } from "@/features/classes/components/use-classroom-recording";
import type {
  ClassroomVideoMode,
  LiveKitClassroomSession,
  RecordingClientConfig,
} from "@/features/classes/types";
import { friendlyMediaError } from "@/lib/media-devices";
import { useAppToast } from "@/lib/use-app-toast";

export type ClassroomVideoStageProps = {
  mode: ClassroomVideoMode;
  liveKit: LiveKitClassroomSession | null;
  classId: string;
  meetingRoom: string;
  viewerName: string;
  topic: string;
  teacherName: string;
  recordingConfig: RecordingClientConfig;
  guestViewer?: boolean;
  guestSelfServeMedia?: boolean;
  canModerate?: boolean;
  waitingInLobby?: boolean;
  viewerAvatarUrl: string;
  teacherMustStartSession?: boolean;
  awaitingTeacherSession?: boolean;
  canEndLiveSession?: boolean;
  guestJoinToken?: string | null;
};

export function ClassroomVideoStage(props: ClassroomVideoStageProps) {
  if (props.teacherMustStartSession) {
    return <ClassroomTeacherStartLobby classId={props.classId} topic={props.topic} />;
  }

  if (props.awaitingTeacherSession) {
    return (
      <ClassroomAwaitTeacherLobby
        classId={props.classId}
        topic={props.topic}
        teacherName={props.teacherName}
      />
    );
  }

  if (props.waitingInLobby) {
    return <ClassroomWaitingLobby classId={props.classId} topic={props.topic} />;
  }

  if (props.mode === "livekit" && props.liveKit) {
    return (
      <ClassroomLiveKitStage
        liveKit={props.liveKit}
        classId={props.classId}
        meetingRoom={props.meetingRoom}
        viewerName={props.viewerName}
        topic={props.topic}
        teacherName={props.teacherName}
        recordingConfig={props.recordingConfig}
        guestViewer={Boolean(props.guestViewer)}
        guestSelfServeMedia={Boolean(props.guestSelfServeMedia)}
        canModerate={Boolean(props.canModerate)}
        canEndLiveSession={Boolean(props.canEndLiveSession)}
        viewerAvatarUrl={props.viewerAvatarUrl}
        guestJoinToken={props.guestJoinToken ?? null}
      />
    );
  }

  return (
    <LocalMediaStage
      classId={props.classId}
      viewerName={props.viewerName}
      topic={props.topic}
      teacherName={props.teacherName}
      recordingConfig={props.recordingConfig}
      viewerAvatarUrl={props.viewerAvatarUrl}
    />
  );
}

function LocalMediaStage({
  classId,
  viewerName,
  topic,
  teacherName,
  recordingConfig,
  viewerAvatarUrl,
}: {
  classId: string;
  viewerName: string;
  topic: string;
  teacherName: string;
  recordingConfig: RecordingClientConfig;
  viewerAvatarUrl: string;
}) {
  const { showError, showSuccess, showInfo } = useAppToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const getMediaStream = useCallback(() => {
    return screenRef.current ?? cameraRef.current;
  }, []);

  const recording = useClassroomRecording({
    classId,
    topic,
    recordingConfig,
    getMediaStream,
  });

  const attachVideo = useCallback(async (stream: MediaStream | null) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (stream) {
      await videoRef.current.play();
      setHasPreview(true);
    } else {
      setHasPreview(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      screenRef.current?.getTracks().forEach((track) => track.stop());
      cameraRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      cameraRef.current?.getVideoTracks().forEach((track) => {
        track.stop();
      });
      if (cameraRef.current) {
        const audioTracks = cameraRef.current.getAudioTracks();
        cameraRef.current =
          audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
      }
      setCameraOn(false);
      if (screenRef.current) {
        await attachVideo(screenRef.current);
      } else if (cameraRef.current) {
        await attachVideo(cameraRef.current);
      } else {
        await attachVideo(null);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: micOn,
      });
      stopTracks(cameraRef.current);
      cameraRef.current = stream;
      setCameraOn(true);
      setMicOn(stream.getAudioTracks().length > 0);
      if (!sharingScreen) {
        await attachVideo(stream);
      }
    } catch (cause) {
      showError({ message: friendlyMediaError(cause) });
    }
  };

  const toggleMic = async () => {
    if (micOn) {
      cameraRef.current?.getAudioTracks().forEach((track) => track.stop());
      setMicOn(false);
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error("No microphone track returned.");

      if (cameraRef.current) {
        cameraRef.current.addTrack(audioTrack);
      } else if (screenRef.current) {
        screenRef.current.addTrack(audioTrack);
      } else {
        cameraRef.current = new MediaStream([audioTrack]);
      }

      setMicOn(true);
    } catch (cause) {
      showError({ message: friendlyMediaError(cause) });
    }
  };

  const stopScreenShare = async () => {
    stopTracks(screenRef.current);
    screenRef.current = null;
    setSharingScreen(false);
    if (cameraRef.current) {
      await attachVideo(cameraRef.current);
    } else {
      await attachVideo(null);
    }
    showInfo({ message: "Screen sharing stopped." });
  };

  const startScreenShare = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      stopTracks(screenRef.current);
      screenRef.current = display;
      await attachVideo(display);
      setSharingScreen(true);
      display.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopScreenShare();
      });
      showSuccess({ message: "You are sharing your screen." });
    } catch (cause) {
      showError({ message: friendlyMediaError(cause) });
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "#17181C",
      }}
    >
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, bgcolor: "#000" }}>
        {!cameraOn && viewerAvatarUrl ? (
          <Box
            component="img"
            src={viewerAvatarUrl}
            alt=""
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          />
        ) : null}
        <Box
          component="video"
          ref={videoRef}
          muted
          playsInline
          autoPlay
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            bgcolor: "transparent",
            display: "block",
            position: "relative",
            zIndex: 1,
          }}
        />
        {!hasPreview ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              color: "rgba(255,255,255,0.45)",
              px: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="body2">
              Camera preview area (black when off). Use the toolbar to share screen or enable devices.
            </Typography>
          </Stack>
        ) : null}

        <ClassroomMediaToolbar
          variant="floating"
          recording={recording.recording}
          persisting={recording.persisting}
          sharingScreen={sharingScreen}
          cameraOn={cameraOn}
          micOn={micOn}
          onToggleCamera={() => {
            void toggleCamera();
          }}
          onToggleMic={() => {
            void toggleMic();
          }}
          onToggleRecord={() =>
            recording.recording ? recording.stopRecording() : recording.startRecording()
          }
          onToggleScreen={() => {
            if (sharingScreen) void stopScreenShare();
            else void startScreenShare();
          }}
          localUrl={recording.localUrl}
          cloudUrl={recording.cloudUrl}
          topic={topic}
          onUploadCloud={recording.uploadToCloud}
          canUploadToCloud={recording.canUploadToCloud}
        />
      </Box>

      <Box sx={{ px: 2, py: 1.25, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Typography variant="subtitle2" color="#fff" fontWeight={600}>
          {topic}
        </Typography>
        <Typography variant="caption" color="rgba(255,255,255,0.65)">
          {viewerName} · {teacherName}
          {recordingConfig.storage === "local"
            ? " · recordings saved locally"
            : recordingConfig.cloudReady
              ? " · recordings upload to B2"
              : " · set B2 keys for cloud recordings"}
        </Typography>
      </Box>
    </Box>
  );
}

export default ClassroomVideoStage;