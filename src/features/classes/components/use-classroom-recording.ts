import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  completeRecordingUploadAction,
  createRecordingUploadAction,
  saveClassRecordingLocalAction,
  type RecordingUploadResult,
} from "@/features/classes/actions";
import type { RecordingClientConfig } from "@/features/classes/types";
import { useAppToast } from "@/lib/use-app-toast";

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function buildRecordingFile(
  classId: string,
  topic: string,
  blob: Blob,
  mimeType: string,
  t: (key: string) => string,
) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const formData = new FormData();
  formData.append("classId", classId);
  formData.append(
    "file",
    new File([blob], `spanglish-${slug || t("recording.fallbackClassSlug")}.webm`, {
      type: mimeType,
    }),
  );
  return formData;
}

function recordingFileName(topic: string, t: (key: string) => string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `spanglish-${slug || t("recording.fallbackClassSlug")}.webm`;
}

/** Signed URL from the server, then a direct PUT to B2 (no server upload). */
async function uploadRecordingToCloud(
  classId: string,
  topic: string,
  blob: Blob,
  mimeType: string,
  t: (key: string) => string,
): Promise<RecordingUploadResult> {
  const ticket = await createRecordingUploadAction({
    classId,
    fileName: recordingFileName(topic, t),
    sizeBytes: blob.size,
    contentType: mimeType,
  });
  if (!ticket.ok) {
    return { ok: false, title: t("recording.uploadUnavailable"), message: ticket.message };
  }

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ticket.contentType },
      body: blob,
    });
    if (!response.ok) throw new Error(String(response.status));
  } catch {
    return {
      ok: false,
      title: t("recording.uploadFailed"),
      message: t("recording.uploadError"),
    };
  }

  return completeRecordingUploadAction(ticket.recordingId);
}

export function useClassroomRecording(options: {
  classId: string;
  topic: string;
  recordingConfig: RecordingClientConfig;
  getMediaStream: () => MediaStream | null;
  /** Student with host permission: download only, no server or B2 upload. */
  localOnly?: boolean;
}) {
  const { showError, showInfo, showSuccess } = useAppToast();
  const t = useTranslations("classroom");
  const [recording, setRecording] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [lastMime, setLastMime] = useState("");
  const [cloudSaved, setCloudSaved] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const stream = options.getMediaStream();
    if (!stream) {
      showError({ message: t("recording.noStream") });
      return;
    }

    const mimeType = pickRecorderMime();
    if (!mimeType) {
      showError({ message: t("recording.unsupported") });
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (localUrl) URL.revokeObjectURL(localUrl);
      setLocalUrl(URL.createObjectURL(blob));
      setLastBlob(blob);
      setLastMime(mimeType);
      if (options.localOnly) {
        showSuccess({
          title: t("recording.ready"),
          message: t("recording.localReady"),
        });
        return;
      }

      showSuccess({
        title: t("recording.ready"),
        message:
          options.recordingConfig.storage === "local"
            ? t("recording.serverReady")
            : t("recording.downloadReady"),
      });

      const formData = buildRecordingFile(options.classId, options.topic, blob, mimeType, t);

      if (options.recordingConfig.storage === "local") {
        setPersisting(true);
        void saveClassRecordingLocalAction(formData).then((result) => {
          setPersisting(false);
          if (result.ok) {
            showSuccess({ title: result.title, message: result.message });
          } else {
            showError({ title: result.title, message: result.message });
          }
        });
      }

      if (options.recordingConfig.autoCloudUpload) {
        setPersisting(true);
        void uploadRecordingToCloud(options.classId, options.topic, blob, mimeType, t).then((result) => {
          setPersisting(false);
          if (result.ok) {
            setCloudSaved(true);
            showSuccess({ title: result.title, message: result.message });
          } else {
            showError({ title: result.title, message: result.message });
          }
        });
      }
    };

    recorder.start(1000);
    setRecording(true);
    showInfo({ message: t("recording.started") });
  }, [localUrl, options, showError, showInfo, showSuccess, t]);

  const uploadToCloud = useCallback(() => {
    if (!lastBlob || !options.recordingConfig.cloudReady) {
      showError({ message: t("recording.configureB2") });
      return;
    }

    setPersisting(true);
    void uploadRecordingToCloud(options.classId, options.topic, lastBlob, lastMime, t).then((result) => {
      setPersisting(false);
      if (result.ok) {
        setCloudSaved(true);
        showSuccess({ title: result.title, message: result.message });
      } else {
        showError({ title: result.title, message: result.message });
      }
    });
  }, [lastBlob, lastMime, options, showError, showSuccess, t]);

  return {
    recording,
    persisting,
    localUrl,
    /** Recordings live in the Recordings page once saved (links are signed per view). */
    cloudUrl: cloudSaved ? "/teacher/recordings" : null,
    startRecording,
    stopRecording,
    uploadToCloud,
    canUploadToCloud:
      !options.localOnly &&
      options.recordingConfig.cloudReady &&
      !options.recordingConfig.autoCloudUpload,
  };
}