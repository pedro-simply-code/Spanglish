"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RoomEvent, type Participant, type Room } from "livekit-client";
import { useTranslations } from "next-intl";
import {
  getClassroomCaptionsAction,
  getClassroomTranscriptAction,
  saveClassroomTranscriptAction,
  setClassroomCaptionsAction,
} from "@/features/classes/classroom-actions";
import {
  CLASSROOM_TOPIC_CAPTIONS,
  isCaptionLang,
  type CaptionLang,
  type ClassCaptionsState,
  type ClassroomCaptionPacket,
} from "@/features/classes/classroom-protocol";
import { useAppToast } from "@/lib/use-app-toast";

/*
 * Free live captions: each participant's browser transcribes their own
 * microphone with the Web Speech API (Chrome / Edge / Safari) and shares the
 * text over the LiveKit data channel. Final lines are saved as the class
 * transcript. Swapping in a cloud speech-to-text agent later only replaces
 * the recognizer; the packets, overlay and transcript stay the same.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  /** Chrome 139+: recognize on the device instead of Google's servers. */
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type OnDeviceOptions = { langs: string[]; processLocally: boolean };

type SpeechRecognitionCtor = (new () => SpeechRecognitionLike) & {
  /** "available" | "downloadable" | "downloading" | "unavailable" (Chrome 139+). */
  available?: (options: OnDeviceOptions) => Promise<string>;
  install?: (options: OnDeviceOptions) => Promise<boolean>;
};

/** Brave exposes the API but has no speech service, so it always fails with "network". */
function isBraveBrowser() {
  return typeof navigator !== "undefined" && "brave" in navigator;
}

/** Network errors in a row before giving up on the cloud recognizer. */
const MAX_NETWORK_ERRORS = 3;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => undefined;

export type CaptionLineView = {
  id: string;
  identity: string;
  name: string;
  text: string;
  final: boolean;
  /** When the line was first heard (ms). */
  at: number;
  updatedAt: number;
};

/** Lines kept in the room's transcript panel. */
const MAX_LINES = 2000;
const INTERIM_LINE_TTL_MS = 10000;
const SAVE_INTERVAL_MS = 3000;
const INTERIM_THROTTLE_MS = 250;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type UseClassroomCaptionsArgs = {
  room: Room | null;
  classId: string;
  localName: string;
  canModerate: boolean;
  /** The local mic is live (captions follow mute). */
  micOn: boolean;
  /** This viewer can speak in the room (not a view-only guest). */
  canSpeak: boolean;
  /** Signed-in viewers save their own lines to the transcript. */
  canSave: boolean;
  guestJoinToken?: string | null;
};

export function useClassroomCaptions({
  room,
  classId,
  localName,
  canModerate,
  micOn,
  canSpeak,
  canSave,
  guestJoinToken,
}: UseClassroomCaptionsArgs) {
  const t = useTranslations("classroom");
  const { showError, showInfo, showSuccess } = useAppToast();
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getRecognitionCtor()),
    () => false,
  );
  const [state, setState] = useState<ClassCaptionsState>({ enabled: false, lang: "es-ES" });
  const [lines, setLines] = useState<CaptionLineView[]>([]);
  const [busy, setBusy] = useState(false);
  const saveQueue = useRef<{ id: string; text: string; at: string }[]>([]);
  const warnedUnsupported = useRef(false);
  const warnedNetwork = useRef(false);

  /** Adds a line, or updates it in place while it is still being spoken. */
  const upsertLine = useCallback((line: Omit<CaptionLineView, "updatedAt" | "at">) => {
    setLines((prev) => {
      const now = Date.now();
      const index = prev.findIndex((item) => item.id === line.id);
      if (index >= 0) {
        const next = prev.slice();
        const current = next[index]!;
        next[index] = { ...current, ...line, updatedAt: now };
        return next;
      }
      return [...prev, { ...line, at: now, updatedAt: now }].slice(-MAX_LINES);
    });
  }, []);

  const publish = useCallback(
    (packet: ClassroomCaptionPacket, reliable: boolean) => {
      if (!room) return;
      void room.localParticipant
        .publishData(encoder.encode(JSON.stringify(packet)), {
          reliable,
          topic: CLASSROOM_TOPIC_CAPTIONS,
        })
        .catch(() => undefined);
    },
    [room],
  );

  // Current switch and what was said before this person joined.
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    void getClassroomCaptionsAction(classId, guestJoinToken).then((current) => {
      if (!cancelled && current) setState(current);
    });
    void getClassroomTranscriptAction(classId, guestJoinToken).then((saved) => {
      if (cancelled || !saved.length) return;
      setLines((prev) => {
        const live = new Set(prev.map((line) => line.id));
        const history = saved
          .filter((line) => !live.has(line.id))
          .map((line) => {
            const at = Date.parse(line.at);
            return {
              id: line.id,
              identity: line.speakerIdentity,
              name: line.speakerName,
              text: line.text,
              final: true,
              at,
              updatedAt: at,
            };
          });
        return [...history, ...prev].slice(-MAX_LINES);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [room, classId, guestJoinToken]);

  // Lines and switch changes from the other participants.
  useEffect(() => {
    if (!room) return;
    const onData = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== CLASSROOM_TOPIC_CAPTIONS) return;
      try {
        const packet = JSON.parse(decoder.decode(payload)) as ClassroomCaptionPacket;
        if (packet.kind === "state") {
          setState({
            enabled: Boolean(packet.enabled),
            lang: isCaptionLang(packet.lang) ? packet.lang : "es-ES",
          });
          return;
        }
        if (packet.kind === "line" && typeof packet.text === "string") {
          upsertLine({
            id: String(packet.id),
            identity: participant?.identity ?? String(packet.identity),
            name: participant?.name || String(packet.name),
            text: packet.text.slice(0, 500),
            final: Boolean(packet.final),
          });
        }
      } catch {
        /* ignore malformed packets */
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, upsertLine]);

  // Drop half-heard lines that never became final (speaker left, mic muted).
  useEffect(() => {
    if (!state.enabled) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setLines((prev) => {
        const next = prev.filter(
          (line) => line.final || now - line.updatedAt < INTERIM_LINE_TTL_MS,
        );
        return next.length === prev.length ? prev : next;
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, [state.enabled]);

  const flushTranscript = useCallback(async () => {
    const batch = saveQueue.current.splice(0, 40);
    if (!batch.length || !canSave) return;
    await saveClassroomTranscriptAction(classId, batch, guestJoinToken).catch(() => undefined);
  }, [canSave, classId, guestJoinToken]);

  useEffect(() => {
    if (!state.enabled || !canSave) return;
    const id = window.setInterval(() => void flushTranscript(), SAVE_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      void flushTranscript();
    };
  }, [state.enabled, canSave, flushTranscript]);

  // Tell speakers on browsers without speech recognition, once.
  useEffect(() => {
    if (!state.enabled || !canSpeak || supported || warnedUnsupported.current) return;
    warnedUnsupported.current = true;
    showInfo({ message: t("captions.unsupported") });
  }, [state.enabled, canSpeak, supported, showInfo, t]);

  // Transcribe the local microphone while captions are on and the mic is live.
  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!room || !Ctor || !state.enabled || !micOn || !canSpeak) return;
    const identity = room.localParticipant.identity;
    const newId = () => `${identity}-${crypto.randomUUID()}`;
    const recognition = new Ctor();
    recognition.lang = state.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let stopped = false;
    let utteranceId = newId();
    let lastInterimAt = 0;
    let restartTimer: number | undefined;
    let networkErrors = 0;
    const onDevice = { langs: [state.lang], processLocally: true };

    recognition.onresult = (event) => {
      networkErrors = 0;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript?.trim();
        if (!result || !text) continue;
        const line = {
          id: utteranceId,
          identity,
          name: localName,
          text,
          final: result.isFinal,
        };
        upsertLine(line);
        if (result.isFinal) {
          publish({ kind: "line", ...line }, true);
          saveQueue.current.push({ id: utteranceId, text, at: new Date().toISOString() });
          utteranceId = newId();
          lastInterimAt = 0;
        } else if (Date.now() - lastInterimAt > INTERIM_THROTTLE_MS) {
          lastInterimAt = Date.now();
          publish({ kind: "line", ...line }, false);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        showError({ message: t("captions.micBlocked") });
        return;
      }
      if (event.error === "network") {
        networkErrors += 1;
        // The browser could not reach its speech service (Brave, Chromium
        // builds, Opera, firewalls/VPNs). Stop instead of retrying forever.
        if (networkErrors >= MAX_NETWORK_ERRORS && !warnedNetwork.current) {
          warnedNetwork.current = true;
          stopped = true;
          showError({ message: t("captions.network") });
        }
      }
    };
    // Browsers end continuous recognition after silence; keep it going.
    recognition.onend = () => {
      if (stopped) return;
      restartTimer = window.setTimeout(
        () => {
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        },
        networkErrors ? 1500 * networkErrors : 300,
      );
    };

    const begin = async () => {
      if (isBraveBrowser()) {
        if (!warnedNetwork.current) {
          warnedNetwork.current = true;
          showError({ message: t("captions.braveUnsupported") });
        }
        return;
      }
      // Prefer on-device recognition (no Google servers, works on more
      // networks); download the language pack in the background if needed.
      try {
        if (Ctor.available) {
          const status = await Ctor.available(onDevice);
          if (status === "available") {
            recognition.processLocally = true;
          } else if (status === "downloadable" && Ctor.install) {
            void Ctor.install(onDevice)
              .then((installed) => {
                // Picked up on the next automatic restart.
                if (installed) recognition.processLocally = true;
              })
              .catch(() => undefined);
          }
        }
      } catch {
        /* older browsers: use the cloud recognizer */
      }
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    };
    void begin();

    return () => {
      stopped = true;
      window.clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    };
  }, [room, state.enabled, state.lang, micOn, canSpeak, localName, publish, upsertLine, showError, t]);

  const setCaptions = useCallback(
    async (enabled: boolean, lang: CaptionLang = state.lang) => {
      if (!canModerate) return;
      setBusy(true);
      // Save what was already said before the server stops accepting lines.
      if (!enabled) await flushTranscript();
      const result = await setClassroomCaptionsAction(classId, { enabled, lang });
      setBusy(false);
      if (!result.ok || !result.state) {
        showError({ message: result.message });
        return;
      }
      setState(result.state);
      publish({ kind: "state", ...result.state }, true);
      showSuccess({ message: result.message });
    },
    [canModerate, classId, flushTranscript, publish, showError, showSuccess, state.lang],
  );

  return { state, supported, lines, busy, setCaptions };
}
