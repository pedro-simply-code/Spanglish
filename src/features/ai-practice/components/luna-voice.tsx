"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconMicrophone,
  IconPlayerPause,
  IconPlayerPlay,
  IconRepeat,
  IconCheck,
  IconHelp,
  IconMessages,
  IconVolume,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { finishVoicePracticeAction } from "@/features/ai-practice/actions";
import { ChatBubble, SPEAK_PATH, UsageMeter } from "@/features/ai-practice/components/ai-practice-parts";
import { LunaAvatar } from "@/features/ai-practice/components/luna-avatar";
import { TranslateToggle, useConversationTranslation } from "@/features/ai-practice/components/use-conversation-translation";
import {
  SPEECH_RATES,
  useSpanishSpeech,
  type SpeechErrorKind,
  type SpeechRate,
} from "@/features/ai-practice/components/use-spanish-speech";
import type { AiConversationDetail, AiVoiceFeedback } from "@/lib/ai-practice";
import { useAppToast } from "@/lib/use-app-toast";

const MIN_ANSWERS_FOR_REPORT = 2;
/** Pause (ms) after the student stops talking before the answer is sent. */
const SILENCE_MS = 2800;
/** Tries without hearing anything before waiting for a tap. */
const MAX_SILENT_TRIES = 2;
const TURN_URL = "/api/ai/voice/turn";
const VOCABULARY_PATH = "/study?tab=vocabulary";
/** What the client sends when the student asks for help (shown as a friendly line in the transcript). */
const HELP_TOKEN = "[AYUDA]";
/** Text up to the end of the last complete sentence (the rest keeps arriving). */
const SENTENCE_END = /[.!?…]+["»”)]*\s+/g;

function takeSentences(buffer: string, all: boolean): [string, string] {
  if (all) return [buffer.trim(), ""];
  let end = -1;
  for (const match of buffer.matchAll(SENTENCE_END)) end = match.index + match[0].length;
  return end < 0 ? ["", buffer] : [buffer.slice(0, end).trim(), buffer.slice(end)];
}

/**
 * Habla con la IA: a spoken room with Luna. No text: the student allows the
 * microphone, Luna says her line, then the mic listens and sends the answer
 * after a pause. A written report is shown when the practice ends.
 */
export function LunaVoice({ conversation }: { conversation: AiConversationDetail }) {
  const t = useTranslations("student.ai.luna");
  const router = useRouter();
  const { showError } = useAppToast();
  const speech = useSpanishSpeech();
  const [pending, startTransition] = useTransition();
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [missed, setMissed] = useState(false);
  const [heardSomething, setHeardSomething] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const translation = useConversationTranslation(conversation.id, conversation.messages);

  const finished = conversation.status === "finished";
  const answers = conversation.messages.filter((message) => message.role === "user").length;
  const lastLuna = [...conversation.messages].reverse().find((message) => message.role === "assistant");
  const progress = conversation.goalsTotal
    ? Math.round((Math.min(conversation.goalsDone, conversation.goalsTotal) / conversation.goalsTotal) * 100)
    : 0;

  // Latest values for the speech callbacks (they outlive a render).
  const finishedRef = useRef(finished);
  const pausedRef = useRef(paused);
  const heardRef = useRef("");
  const silentTries = useRef(0);
  const silenceTimer = useRef<number | null>(null);
  const spokenRef = useRef<string | null>(null);
  /** Increases with every turn; a turn that was paused or replaced stops there. */
  const turnRef = useRef(0);
  // Keep the latest lines of the transcript in view.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.messages.length, thinking, speech.listening]);
  useEffect(() => {
    finishedRef.current = finished;
    pausedRef.current = paused;
  });

  const clearSilence = () => {
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
  };

  const speechError = (kind: SpeechErrorKind) => {
    if (kind === "no-speech") return;
    showError({ message: t(`micErrors.${kind}`) });
  };

  /**
   * One turn: sends the answer (or a request for help) and speaks Luna's reply
   * sentence by sentence while it streams in; then opens the microphone again.
   */
  const runTurn = (body: { text?: string; help?: boolean }) => {
    const turn = ++turnRef.current;
    setThinking(true);
    setMissed(false);
    void (async () => {
      const spoken: Promise<boolean>[] = [];
      const rate = body.help ? "slow" : undefined; // help is said slowly
      let buffer = "";
      let finishedNow = false;
      let failed = false;
      const say = (all: boolean) => {
        const [ready, rest] = takeSentences(buffer, all);
        buffer = rest;
        if (ready && turn === turnRef.current) {
          setThinking(false);
          spoken.push(speech.speakQueued(ready, { rate }));
        }
      };
      try {
        const response = await fetch(TURN_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: conversation.id, text: body.text ?? "", help: Boolean(body.help) }),
        });
        if (!response.ok || !response.body) throw new Error(String(response.status));
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pendingLine = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          pendingLine += decoder.decode(value, { stream: true });
          const lines = pendingLine.split("\n");
          pendingLine = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as { t: string; v?: string; messageId?: string; finished?: boolean; message?: string };
            if (event.t === "text") {
              buffer += event.v ?? "";
              say(false);
            } else if (event.t === "done") {
              // Already spoken here: the refresh must not read it again.
              if (event.messageId) spokenRef.current = event.messageId;
              finishedNow = Boolean(event.finished);
            } else if (event.t === "error") {
              failed = true;
              showError({ message: event.message ?? t("micErrors.other") });
            }
          }
        }
      } catch {
        failed = true;
        showError({ message: t("turnError") });
      }
      say(true);
      setThinking(false);
      router.refresh();
      const completed = await Promise.all(spoken);
      if (turn !== turnRef.current || pausedRef.current) return;
      if (failed) setMissed(true);
      else if (!finishedNow && completed.every(Boolean)) listen();
    })();
  };

  /** Sends what was heard right away (after the pause, or "Ya terminé"). */
  const submitHeard = () => {
    clearSilence();
    const text = heardRef.current.trim();
    // Detach before stopping so the browser's late "end" event can't send it twice.
    speech.cancelListening();
    if (!text) {
      setMissed(true);
      return;
    }
    silentTries.current = 0;
    runTurn({ text });
  };

  const listen = () => {
    if (pausedRef.current || finishedRef.current) return;
    heardRef.current = "";
    setHeardSomething(false);
    setMissed(false);
    void speech.startListening({
      onText: (text) => {
        heardRef.current = text;
        if (text) setHeardSomething(true);
        // Send after a pause in the student's speech.
        clearSilence();
        if (text) silenceTimer.current = window.setTimeout(submitHeard, SILENCE_MS);
      },
      onError: speechError,
      onEnd: () => {
        clearSilence();
        if (pausedRef.current) return;
        const text = heardRef.current.trim();
        if (text) {
          silentTries.current = 0;
          runTurn({ text });
        } else if (silentTries.current < MAX_SILENT_TRIES) {
          silentTries.current += 1;
          window.setTimeout(listen, 300);
        } else {
          silentTries.current = 0;
          setMissed(true);
        }
      },
    });
  };

  /** Luna speaks, then the microphone opens (unless the practice ended). */
  const lunaSays = (text: string) => {
    speech.cancelListening();
    clearSilence();
    speech.speak(text, () => {
      if (!pausedRef.current && !finishedRef.current) listen();
    });
  };

  // Each new line from Luna (first line, questions, goodbye) is spoken once.
  useEffect(() => {
    if (!started || paused || !lastLuna || spokenRef.current === lastLuna.id) return;
    spokenRef.current = lastLuna.id;
    lunaSays(lastLuna.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per new line
  }, [started, paused, lastLuna?.id]);

  useEffect(() => () => clearSilence(), []);

  const begin = async () => {
    const allowed = await speech.requestMicrophone();
    if (!allowed) {
      showError({ message: t("micErrors.permission") });
      return;
    }
    spokenRef.current = null;
    setStarted(true);
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      spokenRef.current = null; // Luna repeats her last line
      return;
    }
    setPaused(true);
    turnRef.current += 1; // a reply still arriving is not spoken
    clearSilence();
    speech.cancelListening();
    speech.stopSpeaking();
  };

  const askHelp = () => {
    clearSilence();
    speech.cancelListening();
    speech.stopSpeaking();
    runTurn({ help: true });
  };

  const repeat = () => {
    if (lastLuna) lunaSays(lastLuna.content);
  };

  const finish = () => {
    clearSilence();
    speech.cancelListening();
    speech.stopSpeaking();
    setReporting(true);
    startTransition(async () => {
      const result = await finishVoicePracticeAction(conversation.id);
      if (!result.ok) showError({ message: result.message });
      router.refresh();
      setReporting(false);
    });
  };

  const status = !started && !finished
    ? t("status.ready")
    : paused
      ? t("status.paused")
      : pending || thinking
        ? reporting || finished
          ? t("status.reporting")
          : t("status.thinking")
        : speech.speaking
          ? t("status.speaking")
          : speech.listening
            ? heardSomething
              ? t("status.hearing")
              : t("status.listening")
            : missed
              ? t("status.missed")
              : finished
                ? t("status.done")
                : t("status.waiting");

  return (
    <Stack spacing={2} mt={3}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Button
          component={Link}
          href={SPEAK_PATH}
          startIcon={<IconArrowLeft size={16} />}
          size="small"
          onClick={() => {
            speech.cancelListening();
            speech.stopSpeaking();
          }}
        >
          {finished ? t("back") : t("leave")}
        </Button>
        {started && !finished && answers >= MIN_ANSWERS_FOR_REPORT ? (
          <Button size="small" variant="outlined" disabled={pending} onClick={finish}>
            {t("finish")}
          </Button>
        ) : null}
      </Stack>

      {/* Two columns like My classes (8 / 4), same height: Luna and the controls, then the conversation. */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={9} sx={{ height: "100%", background: "linear-gradient(160deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
            <CardContent sx={{ p: { xs: "20px", md: "24px" } }}>
              <Stack alignItems="center" spacing={2} textAlign="center">
                <LunaAvatar size={200} talking={speech.speaking} listening={speech.listening} />
                <Typography variant="h5">{conversation.title}</Typography>
                <Typography
                  variant="h6"
                  color={speech.listening ? "success.main" : "text.secondary"}
                  fontWeight={500}
                  aria-live="polite"
                  minHeight={32}
                >
                  {status}
                </Typography>

                {!finished && !speech.canListen ? (
                  <Alert severity="warning" sx={{ textAlign: "left" }}>
                    {t("noMic")}
                  </Alert>
                ) : !finished && !started ? (
                  <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body2" color="text.secondary" maxWidth={460}>
                      {t("gate")}
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<IconMicrophone size={22} />}
                      onClick={begin}
                      sx={{ borderRadius: 8, px: 4, py: 1.5 }}
                    >
                      {t("allowAndStart")}
                    </Button>
                  </Stack>
                ) : !finished ? (
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" useFlexGap>
                    {speech.listening && heardSomething ? (
                      <Button variant="contained" color="success" startIcon={<IconCheck size={18} />} onClick={submitHeard}>
                        {t("doneTalking")}
                      </Button>
                    ) : null}
                    {missed && !pending && !thinking && !paused ? (
                      <Button variant="contained" startIcon={<IconMicrophone size={18} />} onClick={listen}>
                        {t("tryAgain")}
                      </Button>
                    ) : null}
                    <Button
                      variant="outlined"
                      startIcon={<IconHelp size={18} />}
                      disabled={pending || thinking || paused}
                      onClick={askHelp}
                    >
                      {t("help")}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<IconRepeat size={18} />}
                      disabled={pending || thinking || paused || !lastLuna}
                      onClick={repeat}
                    >
                      {t("repeat")}
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                      disabled={pending}
                      onClick={togglePause}
                    >
                      {paused ? t("resume") : t("pause")}
                    </Button>
                  </Stack>
                ) : null}

                <Box width="100%" maxWidth={520} pt={1}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {t("progress")}
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {finished ? 100 : progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={finished ? 100 : progress}
                    color="success"
                    sx={{ height: 8, borderRadius: 4, mb: 2 }}
                  />
                  <UsageMeter conversation={conversation} />
                </Box>

                {!finished && speech.canSpeak ? (
                  <Box width="100%" maxWidth={520}>
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<IconAdjustmentsHorizontal size={16} />}
                      onClick={() => setShowSettings((value) => !value)}
                    >
                      {t("voiceSettings")}
                    </Button>
                    <Collapse in={showSettings}>
                      <VoiceSettings speech={speech} />
                    </Collapse>
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* What has been said so far, like a chat; it fills the column and scrolls. */}
          <Card elevation={9} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <IconMessages size={20} />
              <Typography variant="subtitle1" fontWeight={600} flexGrow={1}>
                {t("transcript.title")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("transcript.answers", { count: answers })}
              </Typography>
              <TranslateToggle
                english={translation.english}
                loading={translation.loading}
                onToggle={() => translation.setEnglish((value) => !value)}
              />
            </Stack>
            <Box ref={transcriptRef} sx={{
                height: { xs: 420, lg: 0 },
                flex: { lg: "1 1 0" },
                minHeight: { lg: 320 },
                overflow: "auto",
                p: 2,
                bgcolor: "grey.50",
              }}>
              <Stack spacing={1.5}>
                {conversation.messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    role={message.role}
                    content={
                      message.role === "user" && message.content === HELP_TOKEN
                        ? t("transcript.helpAsked")
                        : translation.textOf(message)
                    }
                    avatar={message.role === "assistant" ? <LunaAvatar size={30} /> : undefined}
                  />
                ))}
                {thinking || pending ? (
                  <Typography variant="caption" color="primary.main">
                    {t("status.thinking")}
                  </Typography>
                ) : speech.listening ? (
                  <Typography variant="caption" color="success.main">
                    {heardSomething ? t("status.hearing") : t("status.listening")}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {finished ? (
        conversation.feedback ? (
          <VoiceReport feedback={conversation.feedback} />
        ) : (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" variant="outlined" disabled={pending} onClick={finish}>
                {t("retryReport")}
              </Button>
            }
          >
            {pending ? t("status.reporting") : t("reportMissing")}
          </Alert>
        )
      ) : null}
    </Stack>
  );
}

/** Voice and speed for Luna (the browser's own Spanish voices, saved per device). */
function VoiceSettings({ speech }: { speech: ReturnType<typeof useSpanishSpeech> }) {
  const t = useTranslations("student.ai.luna");
  const busy = speech.listening;
  return (
    <Stack spacing={2} pt={1.5} textAlign="left">
      <TextField
        select
        size="small"
        label={t("voice")}
        value={speech.voices.some((voice) => voice.id === speech.prefs.voiceId) ? speech.prefs.voiceId : ""}
        onChange={(event) => speech.setPrefs({ ...speech.prefs, voiceId: event.target.value || null })}
        helperText={speech.voices.length ? t("voiceHelp") : t("noVoices")}
        slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
      >
        <MenuItem value="">{t("voiceAuto")}</MenuItem>
        {speech.voices.map((voice) => (
          <MenuItem key={voice.id} value={voice.id}>
            {voice.name} ({voice.lang})
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2">{t("speed")}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={speech.prefs.rate}
          onChange={(_, value: SpeechRate | null) => {
            if (value) speech.setPrefs({ ...speech.prefs, rate: value });
          }}
        >
          {(Object.keys(SPEECH_RATES) as SpeechRate[]).map((rate) => (
            <ToggleButton key={rate} value={rate} sx={{ textTransform: "none", px: 2 }}>
              {t(`speeds.${rate}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          size="small"
          startIcon={<IconVolume size={16} />}
          disabled={busy || speech.speaking}
          onClick={() => speech.speak(t("sample"))}
        >
          {t("testVoice")}
        </Button>
      </Stack>
    </Stack>
  );
}

function VoiceReport({ feedback }: { feedback: AiVoiceFeedback }) {
  const t = useTranslations("student.ai.luna.report");
  return (
    <SectionCard title={t("title")} subtitle={t("subtitle")}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: feedback.score >= 70 ? "success.light" : feedback.score >= 40 ? "warning.light" : "error.light",
              flexShrink: 0,
            }}
          >
            <Typography variant="h4">{feedback.score}</Typography>
          </Box>
          <Typography variant="body1">{feedback.summary}</Typography>
        </Stack>

        {feedback.strengths.length ? (
          <Box>
            <Typography variant="subtitle2" mb={0.5}>
              ✅ {t("strengths")}
            </Typography>
            {feedback.strengths.map((item) => (
              <Typography key={item} variant="body2" color="text.secondary">
                • {item}
              </Typography>
            ))}
          </Box>
        ) : null}

        {feedback.improve.length ? (
          <Box>
            <Typography variant="subtitle2" mb={0.5}>
              🎯 {t("improve")}
            </Typography>
            {feedback.improve.map((item) => (
              <Typography key={item} variant="body2" color="text.secondary">
                • {item}
              </Typography>
            ))}
          </Box>
        ) : null}

        {feedback.words?.length ? (
          <Box>
            <Typography variant="subtitle2" mb={1}>
              📚 {t("words")}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {feedback.words.map((word) => (
                <Box key={word.term} sx={{ px: 1.5, py: 0.75, borderRadius: 1, bgcolor: "primary.light" }}>
                  <Typography variant="body2" fontWeight={600} lang="es">
                    {word.term}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {word.translation}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Button component={Link} href={VOCABULARY_PATH} size="small" sx={{ mt: 1 }}>
              {t("wordsLink")}
            </Button>
          </Box>
        ) : null}

        {feedback.corrections.length ? (
          <Box>
            <Typography variant="subtitle2" mb={1}>
              💡 {t("corrections")}
            </Typography>
            <Stack spacing={1}>
              {feedback.corrections.map((item) => (
                <Box key={item.original} sx={{ p: 1.5, borderRadius: 1, bgcolor: "grey.100" }}>
                  <Typography variant="body2" sx={{ textDecoration: "line-through", color: "text.secondary" }} lang="es">
                    {item.original}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} lang="es">
                    {item.better}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
