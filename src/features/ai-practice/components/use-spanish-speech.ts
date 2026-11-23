"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_VOICE_PREFS,
  hasSpeechSynthesis,
  readVoicePrefs,
  SPANISH_LANG,
  SPEECH_RATES,
  spanishSystemVoices,
  spanishUtterance,
  VOICE_PREFS_KEY,
  type SpeechRate,
  type VoicePrefs,
} from "@/lib/spanish-tts";

/*
 * Free voice for Luna's speaking practice, all in the browser:
 * - Listening: Web Speech API recognition in Spanish (Chrome, Edge, Safari).
 *   Chrome 139+ can do it on the device; otherwise Chrome sends the audio to
 *   Google's speech service. Firefox has no recognition.
 * - Speaking: speechSynthesis with a Spanish voice from the system. The
 *   student can pick the voice and the speed (saved in this browser).
 * Nothing is sent to our server but the final text.
 */

const LANG = SPANISH_LANG;
export { SPEECH_RATES, type SpeechRate };

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type OnDeviceOptions = { langs: string[]; processLocally: boolean };
type RecognitionCtor = (new () => RecognitionLike) & {
  available?: (options: OnDeviceOptions) => Promise<string>;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  // Brave exposes the API but has no speech service behind it.
  if ("brave" in navigator) return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const hasSynthesis = hasSpeechSynthesis;

/* ---------- Spanish voices of this device (external store) ---------- */

export type SpanishVoice = { id: string; name: string; lang: string };

let voiceCache: { key: string; list: SpanishVoice[] } = { key: "", list: [] };
const NO_VOICES: SpanishVoice[] = [];

function getVoicesSnapshot(): SpanishVoice[] {
  const voices = spanishSystemVoices();
  const key = voices.map((voice) => voice.voiceURI).join("|");
  if (key !== voiceCache.key) {
    voiceCache = {
      key,
      list: voices.map((voice) => ({ id: voice.voiceURI, name: voice.name, lang: voice.lang })),
    };
  }
  return voiceCache.list;
}

function subscribeVoices(callback: () => void) {
  if (!hasSynthesis()) return () => undefined;
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", callback);
  // Chrome fills the list asynchronously.
  const timer = window.setTimeout(callback, 300);
  return () => {
    synth.removeEventListener?.("voiceschanged", callback);
    window.clearTimeout(timer);
  };
}

/* ---------- Voice and speed the student picked (external store) ---------- */

let prefsCache: VoicePrefs | null = null;
const prefsListeners = new Set<() => void>();

function getPrefsSnapshot(): VoicePrefs {
  prefsCache ??= readVoicePrefs();
  return prefsCache;
}

function setPrefs(next: VoicePrefs) {
  prefsCache = next;
  try {
    window.localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it for this visit */
  }
  prefsListeners.forEach((listener) => listener());
}

function subscribePrefs(callback: () => void) {
  prefsListeners.add(callback);
  return () => prefsListeners.delete(callback);
}

const noopSubscribe = () => () => undefined;

export type SpeechErrorKind = "permission" | "network" | "no-speech" | "other";

export function useSpanishSpeech() {
  const canListen = useSyncExternalStore(noopSubscribe, () => Boolean(getRecognitionCtor()), () => false);
  const canSpeak = useSyncExternalStore(noopSubscribe, hasSynthesis, () => false);
  const voices = useSyncExternalStore(subscribeVoices, getVoicesSnapshot, () => NO_VOICES);
  const prefs = useSyncExternalStore(subscribePrefs, getPrefsSnapshot, () => DEFAULT_VOICE_PREFS);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  // Utterances waiting or playing, with what to call when each one ends. Keeping
  // them referenced also stops Chrome from dropping their end events.
  const queueRef = useRef(new Map<SpeechSynthesisUtterance, (completed: boolean) => void>());

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (hasSynthesis()) window.speechSynthesis.cancel();
    },
    [],
  );

  /** Stops Luna; sentences still queued resolve as not completed. */
  const stopSpeaking = useCallback(() => {
    const pending = [...queueRef.current.values()];
    queueRef.current.clear();
    if (hasSynthesis()) window.speechSynthesis.cancel();
    setSpeaking(false);
    pending.forEach((resolve) => resolve(false));
  }, []);

  /**
   * Adds `text` to Luna's queue (after what she is saying). Resolves `true`
   * when it was spoken, `false` if it was cut off by `stopSpeaking`.
   */
  const speakQueued = useCallback(
    (text: string, options?: { rate?: SpeechRate }) =>
      new Promise<boolean>((resolve) => {
        if (!hasSynthesis() || !text.trim()) {
          resolve(true);
          return;
        }
        const utterance = spanishUtterance(text, prefs, options?.rate);
        const finish = (completed: boolean) => {
          if (!queueRef.current.delete(utterance)) return;
          if (!queueRef.current.size) setSpeaking(false);
          resolve(completed);
        };
        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(true);
        queueRef.current.set(utterance, (completed) => resolve(completed));
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }),
    [prefs],
  );

  /** Says `text` now (stops anything else); `onEnd` runs only if it finished. */
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      stopSpeaking();
      void speakQueued(text).then((completed) => {
        if (completed) onEnd?.();
      });
    },
    [speakQueued, stopSpeaking],
  );

  /** Asks for the microphone once (shows the browser's permission prompt). */
  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Listens until `stopListening` (or the browser ends it). `onText` gets the
   * whole answer so far every time it changes; `onEnd` runs when it stops.
   */
  const startListening = useCallback(
    async (handlers: {
      onText: (text: string, final: boolean) => void;
      onError: (kind: SpeechErrorKind) => void;
      onEnd: () => void;
    }) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor || recognitionRef.current) return;
      const recognition = new Ctor();
      recognition.lang = LANG;
      recognition.continuous = true;
      recognition.interimResults = true;
      // Prefer recognition on the device when the language pack is installed.
      try {
        const status = await Ctor.available?.({ langs: [LANG], processLocally: true });
        if (status === "available") recognition.processLocally = true;
      } catch {
        /* older browsers */
      }
      let finalText = "";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]!;
          const piece = result[0]?.transcript ?? "";
          if (result.isFinal) finalText = `${finalText} ${piece}`.trim();
          else interim += piece;
        }
        handlers.onText(`${finalText} ${interim}`.replace(/\s+/g, " ").trim(), interim === "");
      };
      recognition.onerror = (event) => {
        if (event.error === "aborted") return;
        handlers.onError(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "permission"
            : event.error === "network"
              ? "network"
              : event.error === "no-speech"
                ? "no-speech"
                : "other",
        );
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
        handlers.onEnd();
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
        setListening(true);
      } catch {
        recognitionRef.current = null;
        handlers.onError("other");
      }
    },
    [],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  /** Stops listening without delivering what was heard. */
  const cancelListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  return {
    canListen,
    canSpeak,
    listening,
    speaking,
    voices,
    prefs,
    setPrefs,
    speak,
    speakQueued,
    stopSpeaking,
    requestMicrophone,
    startListening,
    stopListening,
    cancelListening,
  };
}
