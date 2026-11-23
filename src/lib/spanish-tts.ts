/*
 * The browser's Spanish voice (free), shared by Luna and the practice games.
 * Default: Marta (Guatemala, Edge/Windows), then other Latin American voices.
 * The student's choice of voice and speed is saved in this browser.
 */

export const SPANISH_LANG = "es-MX";
const PREFERRED_VOICE = /marta/i;
const PREFERRED_LANGS = ["es-GT", "es-MX", "es-US", "es-419", "es-ES"];
// v2: everyone starts again on the default voice (Marta) at normal speed.
export const VOICE_PREFS_KEY = "spanglish.luna.voice.v2";

export const SPEECH_RATES = { slow: 0.85, normal: 1, fast: 1.15 } as const;
export type SpeechRate = keyof typeof SPEECH_RATES;
export type VoicePrefs = { voiceId: string | null; rate: SpeechRate };
export const DEFAULT_VOICE_PREFS: VoicePrefs = { voiceId: null, rate: "normal" };

export const hasSpeechSynthesis = () => typeof window !== "undefined" && "speechSynthesis" in window;

function voiceRank(voice: SpeechSynthesisVoice) {
  const index = PREFERRED_LANGS.findIndex((lang) => voice.lang.toLowerCase() === lang.toLowerCase());
  const quality = /natural|online|google|premium|enhanced/i.test(voice.name) ? 0 : 10;
  const favorite = PREFERRED_VOICE.test(voice.name) && voice.lang.toLowerCase() === "es-gt" ? -100 : 0;
  return favorite + (index < 0 ? PREFERRED_LANGS.length : index) + quality;
}

/** Spanish voices of this device, best first. */
export function spanishSystemVoices() {
  if (!hasSpeechSynthesis()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("es"))
    .sort((a, b) => voiceRank(a) - voiceRank(b));
}

export function readVoicePrefs(): VoicePrefs {
  try {
    const saved = JSON.parse(window.localStorage.getItem(VOICE_PREFS_KEY) ?? "null") as Partial<VoicePrefs> | null;
    return {
      voiceId: typeof saved?.voiceId === "string" ? saved.voiceId : null,
      rate: saved?.rate && saved.rate in SPEECH_RATES ? saved.rate : "normal",
    };
  } catch {
    return DEFAULT_VOICE_PREFS;
  }
}

/** A Spanish utterance with the student's voice and speed (or `rate`). */
export function spanishUtterance(text: string, prefs: VoicePrefs, rate?: SpeechRate) {
  const utterance = new SpeechSynthesisUtterance(text);
  const all = spanishSystemVoices();
  const voice = all.find((item) => item.voiceURI === prefs.voiceId) ?? all[0];
  utterance.lang = voice?.lang ?? SPANISH_LANG;
  if (voice) utterance.voice = voice;
  utterance.rate = SPEECH_RATES[rate ?? prefs.rate];
  return utterance;
}

/** Reads `text` once with the saved voice (stops anything playing). */
export function speakSpanish(text: string, rate?: SpeechRate) {
  if (!hasSpeechSynthesis() || !text.trim()) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(spanishUtterance(text, readVoicePrefs(), rate));
}
