"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconArrowLeft, IconCheck, IconRefresh, IconVolume, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  MIN_PRACTICE_ITEMS,
  practiceAudioUrl,
  type PracticeGame,
  type PracticeItem,
} from "@/lib/practice-games";
import { speakSpanish, type SpeechRate } from "@/lib/spanish-tts";

/*
 * Practice games over a list of words and phrases (a teacher's set or the
 * student's own vocabulary). Audio: the teacher's recording when there is
 * one, otherwise the browser's Spanish voice.
 */

const GAME_EMOJI: Record<PracticeGame, string> = {
  flashcards: "🃏",
  memory: "🧠",
  listen: "🎧",
  dictation: "✍️",
  order: "🧩",
};
const ROUNDS = 10;
const MEMORY_PAIRS = 6;

function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
/** Lowercase, no punctuation; `accents: false` also ignores tildes. */
function normalize(text: string, accents = true) {
  const base = text.toLowerCase().replace(/[¿¡.,!?;:"“”«»()]/g, " ").replace(/\s+/g, " ").trim();
  return accents ? base : base.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Plays an item: the teacher's recording, or the browser voice. */
function playItem(item: PracticeItem, rate?: SpeechRate) {
  if (item.audio) {
    window.speechSynthesis?.cancel();
    void new Audio(practiceAudioUrl(item.audio)).play().catch(() => speakSpanish(item.term, rate));
  } else {
    speakSpanish(item.term, rate);
  }
}

/** The sentence used by dictation and "order": the example, or the phrase itself. */
const sentenceOf = (item: PracticeItem) => (item.example?.trim() ? item.example.trim() : item.term.trim());
const orderSentences = (items: PracticeItem[]) => items.filter((item) => words(sentenceOf(item)).length >= 3);

export function PracticeGames({ items }: { items: PracticeItem[] }) {
  const t = useTranslations("educator.materials.games");
  const [game, setGame] = useState<PracticeGame | null>(null);
  const [round, setRound] = useState(0); // remounts a game to play again

  if (items.length < MIN_PRACTICE_ITEMS) {
    return <Alert severity="info">{t("tooFew", { min: MIN_PRACTICE_ITEMS })}</Alert>;
  }

  const available: Record<PracticeGame, boolean> = {
    flashcards: true,
    memory: true,
    listen: true,
    dictation: true,
    order: orderSentences(items).length > 0,
  };

  if (!game) {
    return (
      <Grid container spacing={2}>
        {(Object.keys(GAME_EMOJI) as PracticeGame[]).map((key) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardActionArea
                disabled={!available[key]}
                onClick={() => setGame(key)}
                sx={{ height: "100%", p: 2.5, opacity: available[key] ? 1 : 0.5 }}
              >
                <Typography fontSize={34}>{GAME_EMOJI[key]}</Typography>
                <Typography variant="h6" mt={1}>
                  {t(`${key}.title`)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {available[key] ? t(`${key}.description`) : t("order.unavailable")}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  const back = () => {
    window.speechSynthesis?.cancel();
    setGame(null);
  };
  const again = () => setRound((value) => value + 1);
  const shared = { items, onBack: back, onAgain: again };

  return (
    <Stack spacing={2}>
      <Box>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={back}>
          {t("chooseGame")}
        </Button>
      </Box>
      {game === "flashcards" ? <Flashcards key={round} {...shared} /> : null}
      {game === "memory" ? <Memory key={round} {...shared} /> : null}
      {game === "listen" ? <ListenChoose key={round} {...shared} /> : null}
      {game === "dictation" ? <Dictation key={round} {...shared} /> : null}
      {game === "order" ? <OrderSentence key={round} {...shared} /> : null}
    </Stack>
  );
}

type GameProps = { items: PracticeItem[]; onBack: () => void; onAgain: () => void };

/** A shuffled copy made once per game (after mount, so server and client agree). */
function useShuffled<T>(make: () => T[]) {
  const [list, setList] = useState<T[] | null>(null);
  const makeRef = useRef(make);
  // Random order only in the browser, so the server render matches.
  useEffect(() => {
    setList(makeRef.current());
  }, []);
  return list;
}

function Summary({ score, total, onBack, onAgain }: { score: number; total: number; onBack: () => void; onAgain: () => void }) {
  const t = useTranslations("educator.materials.games");
  const ratio = total ? score / total : 0;
  return (
    <Card elevation={9}>
      <Stack alignItems="center" spacing={1.5} p={4} textAlign="center">
        <Typography fontSize={48}>{ratio >= 0.8 ? "🏆" : ratio >= 0.5 ? "👏" : "💪"}</Typography>
        <Typography variant="h5">{t("score", { score, total })}</Typography>
        <Typography color="text.secondary">
          {ratio >= 0.8 ? t("great") : ratio >= 0.5 ? t("good") : t("keepGoing")}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" startIcon={<IconRefresh size={16} />} onClick={onAgain}>
            {t("playAgain")}
          </Button>
          <Button variant="outlined" onClick={onBack}>
            {t("chooseGame")}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

function Progress({ index, total }: { index: number; total: number }) {
  const t = useTranslations("educator.materials.games");
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {t("progress", { current: Math.min(index + 1, total), total })}
      </Typography>
      <LinearProgress variant="determinate" value={(index / total) * 100} sx={{ height: 6, borderRadius: 3 }} />
    </Box>
  );
}

/* ---------- 🃏 Flashcards ---------- */

function Flashcards({ items, onBack, onAgain }: GameProps) {
  const t = useTranslations("educator.materials.games");
  const deck = useShuffled(() => items);
  const [queue, setQueue] = useState<PracticeItem[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const cards = queue ?? deck;
  const card = cards?.[0];

  useEffect(() => {
    if (card) playItem(card);
  }, [card]);

  if (!cards) return null;
  if (!card) return <Summary score={known} total={items.length} onBack={onBack} onAgain={onAgain} />;

  const next = (knewIt: boolean) => {
    setFlipped(false);
    if (knewIt) setKnown((value) => value + 1);
    // A word they didn't know comes back at the end.
    setQueue(knewIt ? cards.slice(1) : [...cards.slice(1), card]);
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {t("flashcards.left", { count: cards.length })}
      </Typography>
      <Card
        elevation={9}
        onClick={() => setFlipped((value) => !value)}
        sx={{ width: "100%", maxWidth: 520, minHeight: 240, cursor: "pointer", display: "grid", placeItems: "center", p: 3 }}
      >
        <Stack alignItems="center" spacing={1} textAlign="center">
          {flipped ? (
            <>
              <Typography variant="h4">{card.translation}</Typography>
              {card.example ? (
                <Typography color="text.secondary" lang="es">
                  “{card.example}”
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="h3" lang="es">
              {card.term}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {flipped ? t("flashcards.tapBack") : t("flashcards.tapFlip")}
          </Typography>
        </Stack>
      </Card>
      <Stack direction="row" spacing={1.5}>
        <IconButton onClick={() => playItem(card)} aria-label={t("hear")}>
          <IconVolume />
        </IconButton>
        <Button variant="outlined" color="warning" onClick={() => next(false)}>
          {t("flashcards.again")}
        </Button>
        <Button variant="contained" color="success" onClick={() => next(true)}>
          {t("flashcards.knew")}
        </Button>
      </Stack>
    </Stack>
  );
}

/* ---------- 🧠 Memory ---------- */

type MemoryCard = { id: string; pair: string; text: string; spanish: boolean; item: PracticeItem };

function Memory({ items, onBack, onAgain }: GameProps) {
  const t = useTranslations("educator.materials.games");
  const cards = useShuffled<MemoryCard>(() =>
    shuffle(
      shuffle(items)
        .slice(0, MEMORY_PAIRS)
        .flatMap((item) => [
          { id: `${item.id}-es`, pair: item.id, text: item.term, spanish: true, item },
          { id: `${item.id}-en`, pair: item.id, text: item.translation, spanish: false, item },
        ]),
    ),
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const busy = open.length === 2;

  if (!cards) return null;
  const pairs = cards.length / 2;
  if (matched.length === pairs) {
    return (
      <Stack spacing={1}>
        <Typography textAlign="center" color="text.secondary">
          {t("memory.moves", { moves })}
        </Typography>
        <Summary score={pairs} total={pairs} onBack={onBack} onAgain={onAgain} />
      </Stack>
    );
  }

  const flip = (card: MemoryCard) => {
    if (busy || open.includes(card.id) || matched.includes(card.pair)) return;
    if (card.spanish) playItem(card.item);
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((value) => value + 1);
    const [a, b] = next.map((id) => cards.find((item) => item.id === id)!);
    if (a!.pair === b!.pair) {
      setMatched((value) => [...value, a!.pair]);
      setOpen([]);
    } else {
      window.setTimeout(() => setOpen([]), 900);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("memory.help")} · {t("memory.moves", { moves })}
      </Typography>
      <Grid container spacing={1.5}>
        {cards.map((card) => {
          const shown = open.includes(card.id) || matched.includes(card.pair);
          return (
            <Grid key={card.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card
                elevation={shown ? 2 : 9}
                sx={{
                  height: 96,
                  bgcolor: matched.includes(card.pair) ? "success.light" : shown ? "background.paper" : "primary.main",
                  transition: "background-color .2s",
                }}
              >
                <CardActionArea onClick={() => flip(card)} sx={{ height: "100%", p: 1.5, textAlign: "center" }}>
                  {shown ? (
                    <Typography variant="subtitle1" fontWeight={600} lang={card.spanish ? "es" : "en"}>
                      {card.text}
                    </Typography>
                  ) : (
                    <Typography fontSize={28} color="#fff">
                      ?
                    </Typography>
                  )}
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

/* ---------- 🎧 Listen and choose ---------- */

function ListenChoose({ items, onBack, onAgain }: GameProps) {
  const t = useTranslations("educator.materials.games");
  const rounds = useShuffled(() =>
    shuffle(items)
      .slice(0, ROUNDS)
      .map((item) => ({
        item,
        options: shuffle([
          item.translation,
          ...shuffle(items.filter((other) => other.translation !== item.translation))
            .slice(0, 3)
            .map((other) => other.translation),
        ]),
      })),
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const current = rounds?.[index];

  useEffect(() => {
    if (current) playItem(current.item);
  }, [current]);

  if (!rounds) return null;
  if (!current) return <Summary score={score} total={rounds.length} onBack={onBack} onAgain={onAgain} />;

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    if (option === current.item.translation) setScore((value) => value + 1);
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Box width="100%">
        <Progress index={index} total={rounds.length} />
      </Box>
      <Button size="large" variant="contained" startIcon={<IconVolume />} onClick={() => playItem(current.item)} sx={{ borderRadius: 8, px: 4 }}>
        {t("listen.play")}
      </Button>
      <Button size="small" onClick={() => playItem(current.item, "slow")}>
        {t("listen.slow")}
      </Button>
      {picked ? (
        <Typography variant="h5" lang="es">
          {current.item.term}
        </Typography>
      ) : (
        <Typography color="text.secondary">{t("listen.question")}</Typography>
      )}
      <Grid container spacing={1.5} width="100%" maxWidth={620}>
        {current.options.map((option) => {
          const right = option === current.item.translation;
          return (
            <Grid key={option} size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant={picked && (right || option === picked) ? "contained" : "outlined"}
                color={picked ? (right ? "success" : option === picked ? "error" : "inherit") : "primary"}
                onClick={() => choose(option)}
                sx={{ py: 1.5, textTransform: "none", fontSize: 16 }}
              >
                {option}
              </Button>
            </Grid>
          );
        })}
      </Grid>
      {picked ? (
        <Button
          variant="contained"
          onClick={() => {
            setPicked(null);
            setIndex((value) => value + 1);
          }}
        >
          {t("next")}
        </Button>
      ) : null}
    </Stack>
  );
}

/* ---------- ✍️ Dictation ---------- */

function Dictation({ items, onBack, onAgain }: GameProps) {
  const t = useTranslations("educator.materials.games");
  const rounds = useShuffled(() => shuffle(items).slice(0, ROUNDS));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"right" | "accents" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const current = rounds?.[index];
  const sentence = current ? sentenceOf(current) : "";

  const play = (rate?: SpeechRate) => {
    if (!current) return;
    // The teacher recorded the word; a sentence is read by the browser voice.
    if (current.example?.trim()) speakSpanish(sentence, rate ?? "slow");
    else playItem(current, rate);
  };

  useEffect(() => {
    if (current) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per round
  }, [current]);

  if (!rounds) return null;
  if (!current) return <Summary score={score} total={rounds.length} onBack={onBack} onAgain={onAgain} />;

  const check = () => {
    if (!answer.trim() || result) return;
    const exact = normalize(answer) === normalize(sentence);
    const close = normalize(answer, false) === normalize(sentence, false);
    setResult(exact ? "right" : close ? "accents" : "wrong");
    if (exact || close) setScore((value) => value + (exact ? 1 : 0.5));
  };

  const expected = words(sentence);
  const typed = words(answer).map((word) => normalize(word));

  return (
    <Stack spacing={2} alignItems="center">
      <Box width="100%">
        <Progress index={index} total={rounds.length} />
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" startIcon={<IconVolume />} onClick={() => play()} sx={{ borderRadius: 8, px: 3 }}>
          {t("listen.play")}
        </Button>
        <Button onClick={() => play("slow")}>{t("listen.slow")}</Button>
      </Stack>
      <TextField
        fullWidth
        autoFocus
        label={t("dictation.label")}
        value={answer}
        disabled={result !== null}
        inputProps={{ lang: "es", autoCapitalize: "off", spellCheck: false }}
        onChange={(event) => setAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") check();
        }}
        sx={{ maxWidth: 620 }}
      />
      {result ? (
        <Alert severity={result === "right" ? "success" : result === "accents" ? "warning" : "error"} sx={{ width: "100%", maxWidth: 620 }}>
          <Typography variant="body2" mb={0.5}>
            {t(`dictation.${result}`)}
          </Typography>
          <Typography lang="es">
            {expected.map((word, position) => (
              <Box
                component="span"
                key={`${word}-${position}`}
                sx={{ fontWeight: 600, color: typed[position] === normalize(word) ? "inherit" : "error.main", mr: 0.5 }}
              >
                {word}
              </Box>
            ))}
          </Typography>
        </Alert>
      ) : null}
      {result ? (
        <Button
          variant="contained"
          onClick={() => {
            setAnswer("");
            setResult(null);
            setIndex((value) => value + 1);
          }}
        >
          {t("next")}
        </Button>
      ) : (
        <Button variant="contained" disabled={!answer.trim()} onClick={check}>
          {t("check")}
        </Button>
      )}
    </Stack>
  );
}

/* ---------- 🧩 Order the sentence ---------- */

function OrderSentence({ items, onBack, onAgain }: GameProps) {
  const t = useTranslations("educator.materials.games");
  const sentences = useMemo(() => orderSentences(items), [items]);
  const rounds = useShuffled(() =>
    shuffle(sentences)
      .slice(0, ROUNDS)
      .map((item) => {
        const pieces = words(sentenceOf(item)).map((word, position) => ({ id: `${position}`, word }));
        let mixed = shuffle(pieces);
        // Never start with the sentence already in order.
        for (let tries = 0; tries < 5 && mixed.every((piece, position) => piece.id === `${position}`); tries += 1) {
          mixed = shuffle(pieces);
        }
        return { item, sentence: sentenceOf(item), pieces: mixed };
      }),
  );
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const current = rounds?.[index];

  if (!rounds) return null;
  if (!current) return <Summary score={score} total={rounds.length} onBack={onBack} onAgain={onAgain} />;

  const built = chosen.map((id) => current.pieces.find((piece) => piece.id === id)!.word).join(" ");
  const check = () => {
    const right = normalize(built) === normalize(current.sentence);
    setResult(right);
    if (right) setScore((value) => value + 1);
    speakSpanish(current.sentence);
  };

  return (
    <Stack spacing={2.5} alignItems="center">
      <Box width="100%">
        <Progress index={index} total={rounds.length} />
      </Box>
      <Typography color="text.secondary">{t("order.help")}</Typography>
      {current.item.example?.trim() && current.item.translation ? (
        <Typography variant="body2" color="text.secondary">
          {t("order.hint", { word: current.item.term, translation: current.item.translation })}
        </Typography>
      ) : null}
      <Box
        sx={{
          minHeight: 64,
          width: "100%",
          maxWidth: 680,
          p: 1.5,
          borderRadius: 2,
          border: 2,
          borderStyle: "dashed",
          borderColor: result === null ? "divider" : result ? "success.main" : "error.main",
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {chosen.map((id) => (
          <Chip
            key={id}
            label={current.pieces.find((piece) => piece.id === id)!.word}
            color="primary"
            onClick={result === null ? () => setChosen((value) => value.filter((other) => other !== id)) : undefined}
            sx={{ fontSize: 16, height: 36 }}
          />
        ))}
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" maxWidth={680}>
        {current.pieces
          .filter((piece) => !chosen.includes(piece.id))
          .map((piece) => (
            <Chip
              key={piece.id}
              label={piece.word}
              variant="outlined"
              disabled={result !== null}
              onClick={() => setChosen((value) => [...value, piece.id])}
              sx={{ fontSize: 16, height: 36 }}
            />
          ))}
      </Stack>
      {result === null ? (
        <Button variant="contained" disabled={chosen.length !== current.pieces.length} onClick={check}>
          {t("check")}
        </Button>
      ) : (
        <Stack alignItems="center" spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" color={result ? "success.main" : "error.main"}>
            {result ? <IconCheck /> : <IconX />}
            <Typography fontWeight={600} lang="es">
              {result ? t("order.right") : current.sentence}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            onClick={() => {
              setChosen([]);
              setResult(null);
              setIndex((value) => value + 1);
            }}
          >
            {t("next")}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
