"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconCheck,
  IconMicrophone,
  IconPlayerStopFilled,
  IconRefresh,
  IconSnail,
  IconVolume,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  buildLesson,
  checkTyped,
  lessonXp,
  normalizeAnswer,
  similarity,
  SPEAK_PASS,
  type Exercise,
  type LessonOutcome,
  type LessonSettings,
} from "@/lib/lesson";
import { practiceAudioUrl, type PracticeItem } from "@/lib/practice-games";
import { speakSpanish, type SpeechRate } from "@/lib/spanish-tts";

/*
 * Duolingo-style lesson: one exercise at a time, "Check", green or red
 * feedback, mistakes come back at the end, and a summary with XP. The lesson
 * is built when the student presses Start (random order, client only).
 */


type Feedback = { correct: boolean; accentSlip: boolean; answer: string };

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The teacher's recording for the word itself; the browser voice for anything else. */
function play(item: PracticeItem, text: string, rate?: SpeechRate) {
  if (item.audio && normalizeAnswer(text) === normalizeAnswer(item.term)) {
    window.speechSynthesis?.cancel();
    void new Audio(practiceAudioUrl(item.audio)).play().catch(() => speakSpanish(text, rate));
  } else {
    speakSpanish(text, rate);
  }
}

function grade(exercise: Exercise, response: string): Feedback {
  switch (exercise.type) {
    case "meaning":
    case "reverse":
    case "listen":
    case "fill":
      return { correct: response === exercise.answer, accentSlip: false, answer: exercise.answer };
    case "build":
      return {
        correct: normalizeAnswer(response, true) === normalizeAnswer(exercise.answer, true),
        accentSlip: false,
        answer: exercise.answer,
      };
    case "write":
    case "dictation":
      return { ...checkTyped(response, exercise.answer), answer: exercise.answer };
    case "speak":
      return { correct: similarity(response, exercise.answer) >= SPEAK_PASS, accentSlip: false, answer: exercise.answer };
    case "match":
      return { correct: response === "ok", accentSlip: false, answer: "" };
  }
}

export function LessonPlayer({
  items,
  settings,
  onFinish,
  title,
}: {
  items: PracticeItem[];
  settings: LessonSettings;
  /** Called once at the end (saving the result). */
  onFinish?: (outcome: LessonOutcome) => void;
  title?: string;
}) {
  const t = useTranslations("educator.materials.lesson");
  const [queue, setQueue] = useState<Exercise[] | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [firstTry, setFirstTry] = useState(0);
  const [graded, setGraded] = useState(0);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [skippedSpeech, setSkippedSpeech] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [outcome, setOutcome] = useState<LessonOutcome | null>(null);
  const [firstLength, setFirstLength] = useState(0);

  const start = () => {
    const lesson = buildLesson(items, settings, { speechSupported: Boolean(recognitionCtor()) });
    setFirstLength(lesson.length);
    setQueue(lesson);
    setIndex(0);
    setResponse(null);
    setFeedback(null);
    setFirstTry(0);
    setGraded(0);
    setRetried(new Set());
    setSkippedSpeech(false);
    setOutcome(null);
    setStartedAt(Date.now());
  };

  const exercise = queue?.[index] ?? null;

  const finish = (correct: number, total: number) => {
    const result = { correct, total, xp: lessonXp(correct), seconds: Math.round((Date.now() - startedAt) / 1000) };
    setOutcome(result);
    onFinish?.(result);
  };

  const check = (answer = response) => {
    if (!exercise || answer === null || feedback) return;
    const result = grade(exercise, answer);
    setFeedback(result);
    const isRetry = retried.has(exercise.id);
    if (!isRetry) setGraded((value) => value + 1);
    if (result.correct && !isRetry) setFirstTry((value) => value + 1);
    // A wrong answer comes back once at the end of the lesson.
    if (!result.correct && !isRetry && queue) {
      setRetried((set) => new Set(set).add(exercise.id));
      setQueue([...queue, exercise]);
    }
  };

  const next = () => {
    if (!queue) return;
    // Skip the speaking ones the student turned off.
    let nextIndex = index + 1;
    while (skippedSpeech && queue[nextIndex]?.type === "speak") nextIndex += 1;
    if (nextIndex >= queue.length) {
      finish(firstTry, graded);
      return;
    }
    setIndex(nextIndex);
    setResponse(null);
    setFeedback(null);
  };

  const skipSpeaking = () => {
    setSkippedSpeech(true);
    if (!queue) return;
    let nextIndex = index + 1;
    while (queue[nextIndex]?.type === "speak") nextIndex += 1;
    if (nextIndex >= queue.length) {
      finish(firstTry, graded);
      return;
    }
    setIndex(nextIndex);
    setResponse(null);
    setFeedback(null);
  };

  /* --- Start --- */
  if (!queue) {
    return (
      <Card elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 3, md: 4 }, textAlign: "center" }}>
        <Typography fontSize={48} lineHeight={1}>
          🦜
        </Typography>
        <Typography variant="h5" mt={1.5}>
          {title ?? t("title")}
        </Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          {t("intro", { count: settings.length, words: items.length })}
        </Typography>
        <Button variant="contained" size="large" onClick={start} sx={{ px: 5, borderRadius: 8 }}>
          {t("start")}
        </Button>
      </Card>
    );
  }

  /* --- Summary --- */
  if (outcome || !exercise) {
    const result = outcome ?? { correct: 0, total: 0, xp: 0, seconds: 0 };
    const ratio = result.total ? result.correct / result.total : 0;
    return (
      <Card elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 3, md: 4 }, textAlign: "center" }}>
        <Typography fontSize={56} lineHeight={1}>
          {ratio >= 0.9 ? "🏆" : ratio >= 0.6 ? "🎉" : "💪"}
        </Typography>
        <Typography variant="h4" mt={1.5}>
          {t("done")}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" mt={3} mb={3} flexWrap="wrap" useFlexGap>
          {[
            { label: t("xp"), value: `+${result.xp}`, color: "#f5a623" },
            { label: t("accuracy"), value: `${Math.round(ratio * 100)}%`, color: "#2fb67c" },
            {
              label: t("time"),
              value: `${Math.floor(result.seconds / 60)}:${String(result.seconds % 60).padStart(2, "0")}`,
              color: "#4a90d9",
            },
          ].map((stat) => (
            <Box key={stat.label} sx={{ border: 2, borderColor: stat.color, borderRadius: 2, minWidth: 110, overflow: "hidden" }}>
              <Typography variant="caption" fontWeight={700} sx={{ display: "block", bgcolor: stat.color, color: "#fff", py: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography variant="h5" py={1}>
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Typography color="text.secondary" mb={3}>
          {ratio >= 0.9 ? t("great") : ratio >= 0.6 ? t("good") : t("keepGoing")}
        </Typography>
        <Button variant="contained" size="large" startIcon={<IconRefresh size={18} />} onClick={start} sx={{ borderRadius: 8 }}>
          {t("again")}
        </Button>
      </Card>
    );
  }

  /* --- Exercise --- */
  const progress = (Math.min(index, firstLength) / Math.max(1, queue.length)) * 100;
  const isRetry = retried.has(exercise.id) && index >= firstLength;

  return (
    <Card
      elevation={0}
      data-testid="lesson"
      sx={{ border: 1, borderColor: "divider", overflow: "hidden" }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        if (feedback) next();
        else check();
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
        <IconButton size="small" aria-label={t("quit")} onClick={() => setQueue(null)}>
          <IconX size={20} />
        </IconButton>
        <LinearProgress
          variant="determinate"
          value={progress}
          color="success"
          sx={{ flex: 1, height: 14, borderRadius: 7, bgcolor: "grey.200", "& .MuiLinearProgress-bar": { borderRadius: 7 } }}
        />
      </Stack>

      <Box sx={{ px: { xs: 2, md: 5 }, py: 3, minHeight: 320 }}>
        {isRetry ? (
          <Typography variant="caption" fontWeight={700} color="warning.main" sx={{ textTransform: "uppercase" }}>
            {t("retry")}
          </Typography>
        ) : null}
        <ExerciseView
          key={`${exercise.id}-${index}`}
          exercise={exercise}
          locked={Boolean(feedback)}
          onResponse={setResponse}
          onAutoCheck={(value) => {
            setResponse(value);
            check(value);
          }}
        />
      </Box>

      <Box
        sx={{
          px: { xs: 2, md: 5 },
          py: 2.5,
          borderTop: 1,
          borderColor: feedback ? "transparent" : "divider",
          bgcolor: feedback ? (feedback.correct ? "#d7ffb8" : "#ffdfe0") : "transparent",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Box minHeight={44} display="flex" alignItems="center">
            {feedback ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: "#fff",
                    color: feedback.correct ? "#58a700" : "#ea2b2b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {feedback.correct ? <IconCheck size={26} /> : <IconX size={26} />}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ color: feedback.correct ? "#58a700" : "#ea2b2b" }}>
                    {feedback.correct ? t("correct") : t("incorrect")}
                  </Typography>
                  {!feedback.correct && feedback.answer ? (
                    <Typography variant="body2" sx={{ color: "#ea2b2b" }}>
                      <b>{feedback.answer}</b>
                    </Typography>
                  ) : null}
                  {feedback.correct && feedback.accentSlip ? (
                    <Typography variant="body2" sx={{ color: "#58a700" }}>
                      {t("accentSlip")} <b>{feedback.answer}</b>
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            ) : exercise.type === "speak" ? (
              <Button color="inherit" onClick={skipSpeaking}>
                {t("cantSpeak")}
              </Button>
            ) : null}
          </Box>
          {exercise.type === "match" && !feedback ? null : (
            <Button
              variant="contained"
              size="large"
              color={feedback ? (feedback.correct ? "success" : "error") : "primary"}
              disabled={!feedback && response === null}
              onClick={() => (feedback ? next() : check())}
              sx={{ minWidth: 160, borderRadius: 3, fontWeight: 700 }}
            >
              {feedback ? t("continue") : t("check")}
            </Button>
          )}
        </Stack>
      </Box>
    </Card>
  );
}

/* ----------------------------------------------------------------------- */

function SpeakerButton({ item, text, big = false }: { item: PracticeItem; text: string; big?: boolean }) {
  const t = useTranslations("educator.materials.lesson");
  return (
    <Stack direction="row" spacing={1}>
      <IconButton
        aria-label={t("listen")}
        onClick={() => play(item, text)}
        sx={{
          bgcolor: "primary.main",
          color: "#fff",
          width: big ? 88 : 44,
          height: big ? 88 : 44,
          "&:hover": { bgcolor: "primary.dark" },
        }}
      >
        <IconVolume size={big ? 40 : 22} />
      </IconButton>
      {big ? (
        <IconButton
          aria-label={t("slow")}
          onClick={() => play(item, text, "slow")}
          sx={{ bgcolor: "primary.light", color: "primary.main", width: 56, height: 56, alignSelf: "flex-end" }}
        >
          <IconSnail size={26} />
        </IconButton>
      ) : null}
    </Stack>
  );
}

function OptionGrid({
  options,
  locked,
  onPick,
  speakItem,
}: {
  options: string[];
  locked: boolean;
  onPick: (value: string) => void;
  /** Read each Spanish option aloud when tapped. */
  speakItem?: PracticeItem;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mt: 3 }}>
      {options.map((option, position) => (
        <Button
          key={option}
          variant="outlined"
          color={picked === option ? "primary" : "inherit"}
          disabled={locked && picked !== option}
          onClick={() => {
            setPicked(option);
            onPick(option);
            if (speakItem) play(speakItem, option);
          }}
          sx={{
            justifyContent: "flex-start",
            py: 1.5,
            px: 2,
            borderWidth: 2,
            borderRadius: 3,
            textTransform: "none",
            fontSize: 17,
            bgcolor: picked === option ? "primary.light" : "transparent",
            "&:hover": { borderWidth: 2 },
          }}
        >
          <Box component="span" sx={{ mr: 1.5, px: 1, border: 1, borderColor: "divider", borderRadius: 1, fontSize: 13, color: "text.secondary" }}>
            {position + 1}
          </Box>
          {option}
        </Button>
      ))}
    </Box>
  );
}

function Instruction({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h5" fontWeight={700} mb={2}>
      {children}
    </Typography>
  );
}

function ExerciseView({
  exercise,
  locked,
  onResponse,
  onAutoCheck,
}: {
  exercise: Exercise;
  locked: boolean;
  onResponse: (value: string | null) => void;
  onAutoCheck: (value: string) => void;
}) {
  const t = useTranslations("educator.materials.lesson");

  switch (exercise.type) {
    case "meaning":
      return (
        <>
          <Instruction>{t("type.meaning")}</Instruction>
          <Stack direction="row" spacing={2} alignItems="center">
            <SpeakerButton item={exercise.item} text={exercise.item.term} />
            <Typography variant="h4">{exercise.item.term}</Typography>
          </Stack>
          <OptionGrid options={exercise.options} locked={locked} onPick={onResponse} />
        </>
      );
    case "reverse":
      return (
        <>
          <Instruction>{t("type.reverse", { word: exercise.item.translation })}</Instruction>
          <OptionGrid options={exercise.options} locked={locked} onPick={onResponse} speakItem={exercise.item} />
        </>
      );
    case "listen":
      return (
        <ListenChoose exercise={exercise} locked={locked} onResponse={onResponse} />
      );
    case "fill":
      return <FillBlank exercise={exercise} locked={locked} onResponse={onResponse} />;
    case "build":
      return <BuildSentence exercise={exercise} locked={locked} onResponse={onResponse} />;
    case "write":
      return (
        <>
          <Instruction>{t("type.write")}</Instruction>
          <Typography variant="h4" mb={3}>
            {exercise.item.translation}
          </Typography>
          <TypedAnswer locked={locked} onResponse={onResponse} placeholder={t("typeSpanish")} />
        </>
      );
    case "dictation":
      return <Dictation exercise={exercise} locked={locked} onResponse={onResponse} />;
    case "speak":
      return <Speak exercise={exercise} locked={locked} onResponse={onResponse} />;
    case "match":
      return <MatchPairs exercise={exercise} onDone={(perfect) => onAutoCheck(perfect ? "ok" : "mistakes")} />;
  }
}

function ListenChoose({
  exercise,
  locked,
  onResponse,
}: {
  exercise: Extract<Exercise, { type: "listen" }>;
  locked: boolean;
  onResponse: (value: string | null) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  // Plays once when the exercise appears (a user action started the lesson).
  useEffect(() => {
    const timer = window.setTimeout(() => play(exercise.item, exercise.item.term), 300);
    return () => window.clearTimeout(timer);
  }, [exercise]);
  return (
    <>
      <Instruction>{t("type.listen")}</Instruction>
      <SpeakerButton item={exercise.item} text={exercise.item.term} big />
      <OptionGrid options={exercise.options} locked={locked} onPick={onResponse} />
    </>
  );
}

function FillBlank({
  exercise,
  locked,
  onResponse,
}: {
  exercise: Extract<Exercise, { type: "fill" }>;
  locked: boolean;
  onResponse: (value: string | null) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <>
      <Instruction>{t("type.fill")}</Instruction>
      <Typography variant="h5" sx={{ lineHeight: 2.2 }}>
        {exercise.before}
        <Box
          component="span"
          sx={{
            display: "inline-block",
            minWidth: 90,
            mx: 0.5,
            px: 1.5,
            borderBottom: 3,
            borderColor: chosen ? "primary.main" : "grey.400",
            color: "primary.main",
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {chosen ?? " "}
        </Box>
        {exercise.after}
      </Typography>
      {exercise.item.exampleTranslation ? (
        <Typography color="text.secondary" mt={1}>
          {exercise.item.exampleTranslation}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mt={3}>
        {exercise.options.map((option) => (
          <Button
            key={option}
            variant="outlined"
            color={chosen === option ? "primary" : "inherit"}
            disabled={locked}
            onClick={() => {
              setChosen(option);
              onResponse(option);
            }}
            sx={{ borderWidth: 2, borderRadius: 3, textTransform: "none", fontSize: 17, "&:hover": { borderWidth: 2 } }}
          >
            {option}
          </Button>
        ))}
      </Stack>
    </>
  );
}

function BuildSentence({
  exercise,
  locked,
  onResponse,
}: {
  exercise: Extract<Exercise, { type: "build" }>;
  locked: boolean;
  onResponse: (value: string | null) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  // Tiles by position, so repeated words stay separate.
  const [placed, setPlaced] = useState<number[]>([]);
  const update = (next: number[]) => {
    setPlaced(next);
    onResponse(next.length ? next.map((position) => exercise.tiles[position]).join(" ") : null);
  };
  const tileSx = {
    borderWidth: 2,
    borderRadius: 3,
    textTransform: "none",
    fontSize: 17,
    minWidth: 0,
    px: 1.5,
    "&:hover": { borderWidth: 2 },
  } as const;
  return (
    <>
      <Instruction>{exercise.prompt ? t("type.buildTranslate") : t("type.buildListen")}</Instruction>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <SpeakerButton item={exercise.item} text={exercise.answer} />
        {exercise.prompt ? <Typography variant="h6">{exercise.prompt}</Typography> : null}
      </Stack>
      <Box
        sx={{
          minHeight: 64,
          borderTop: 2,
          borderBottom: 2,
          borderColor: "grey.300",
          py: 1,
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
        }}
      >
        {placed.map((position, at) => (
          <Button
            key={`${position}-${at}`}
            variant="outlined"
            color="inherit"
            disabled={locked}
            onClick={() => update(placed.filter((_, other) => other !== at))}
            sx={tileSx}
          >
            {exercise.tiles[position]}
          </Button>
        ))}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={3} justifyContent="center">
        {exercise.tiles.map((tile, position) => {
          const used = placed.includes(position);
          return (
            <Button
              key={`${tile}-${position}`}
              variant="outlined"
              color="inherit"
              disabled={locked || used}
              onClick={() => update([...placed, position])}
              sx={{ ...tileSx, visibility: used ? "hidden" : "visible" }}
            >
              {tile}
            </Button>
          );
        })}
      </Stack>
    </>
  );
}

function TypedAnswer({
  locked,
  onResponse,
  placeholder,
}: {
  locked: boolean;
  onResponse: (value: string | null) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  return (
    <TextField
      autoFocus
      fullWidth
      multiline
      minRows={2}
      value={value}
      disabled={locked}
      placeholder={placeholder}
      onChange={(event) => {
        setValue(event.target.value);
        onResponse(event.target.value.trim() ? event.target.value : null);
      }}
      slotProps={{ htmlInput: { autoCapitalize: "off", autoCorrect: "off", spellCheck: false, lang: "es" } }}
      sx={{ "& .MuiInputBase-root": { fontSize: 19, borderRadius: 3, bgcolor: "grey.50" } }}
    />
  );
}

function Dictation({
  exercise,
  locked,
  onResponse,
}: {
  exercise: Extract<Exercise, { type: "dictation" }>;
  locked: boolean;
  onResponse: (value: string | null) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  useEffect(() => {
    const timer = window.setTimeout(() => play(exercise.item, exercise.answer), 300);
    return () => window.clearTimeout(timer);
  }, [exercise]);
  return (
    <>
      <Instruction>{t("type.dictation")}</Instruction>
      <Box mb={3}>
        <SpeakerButton item={exercise.item} text={exercise.answer} big />
      </Box>
      <TypedAnswer locked={locked} onResponse={onResponse} placeholder={t("typeWhatYouHear")} />
    </>
  );
}

function Speak({
  exercise,
  locked,
  onResponse,
}: {
  exercise: Extract<Exercise, { type: "speak" }>;
  locked: boolean;
  onResponse: (value: string | null) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recognition = useRef<RecognitionLike | null>(null);

  useEffect(() => () => recognition.current?.abort(), []);

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.abort();
      setListening(false);
      return;
    }
    const recognizer = new Ctor();
    recognizer.lang = "es-MX";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setHeard(text);
      onResponse(text.trim() ? text : null);
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend = () => setListening(false);
    recognition.current = recognizer;
    setListening(true);
    recognizer.start();
  };

  return (
    <>
      <Instruction>{t("type.speak")}</Instruction>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <SpeakerButton item={exercise.item} text={exercise.answer} />
        <Typography variant="h5">{exercise.answer}</Typography>
      </Stack>
      <Button
        fullWidth
        variant="outlined"
        disabled={locked}
        onClick={listen}
        startIcon={listening ? <IconPlayerStopFilled size={22} /> : <IconMicrophone size={22} />}
        sx={{ py: 2, borderWidth: 2, borderRadius: 3, fontSize: 17, "&:hover": { borderWidth: 2 } }}
      >
        {listening ? t("listening") : t("tapToSpeak")}
      </Button>
      {heard ? (
        <Typography color="text.secondary" mt={1.5}>
          {t("weHeard")} “{heard}”
        </Typography>
      ) : null}
    </>
  );
}

function MatchPairs({
  exercise,
  onDone,
}: {
  exercise: Extract<Exercise, { type: "match" }>;
  onDone: (perfect: boolean) => void;
}) {
  const t = useTranslations("educator.materials.lesson");
  const right = useMemo(
    () => [...exercise.pairs].sort((a, b) => a.right.localeCompare(b.right)).map((pair) => pair.right),
    [exercise],
  );
  const [selected, setSelected] = useState<{ side: "left" | "right"; value: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);

  const pick = (side: "left" | "right", value: string) => {
    if (!selected || selected.side === side) {
      setSelected({ side, value });
      setWrong([]);
      return;
    }
    const left = side === "left" ? value : selected.value;
    const meaning = side === "right" ? value : selected.value;
    const pair = exercise.pairs.find((item) => item.left === left);
    setSelected(null);
    if (pair && pair.right === meaning) {
      const next = new Set(matched).add(left);
      setMatched(next);
      if (next.size === exercise.pairs.length) onDone(mistakes === 0);
    } else {
      setMistakes((count) => count + 1);
      setWrong([left, meaning]);
    }
  };

  const button = (side: "left" | "right", value: string, done: boolean) => {
    const active = selected?.side === side && selected.value === value;
    const isWrong = wrong.includes(value);
    return (
      <Button
        key={`${side}-${value}`}
        variant="outlined"
        disabled={done}
        color={isWrong ? "error" : active ? "primary" : "inherit"}
        onClick={() => pick(side, value)}
        sx={{
          py: 1.5,
          borderWidth: 2,
          borderRadius: 3,
          textTransform: "none",
          fontSize: 17,
          bgcolor: active ? "primary.light" : done ? "grey.100" : "transparent",
          "&:hover": { borderWidth: 2 },
        }}
      >
        {value}
      </Button>
    );
  };

  return (
    <>
      <Instruction>{t("type.match")}</Instruction>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <Stack spacing={1.5}>
          {exercise.pairs.map((pair) => button("left", pair.left, matched.has(pair.left)))}
        </Stack>
        <Stack spacing={1.5}>
          {right.map((meaning) =>
            button("right", meaning, exercise.pairs.some((pair) => pair.right === meaning && matched.has(pair.left))),
          )}
        </Stack>
      </Box>
    </>
  );
}
