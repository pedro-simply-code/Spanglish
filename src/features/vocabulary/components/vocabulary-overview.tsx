"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconCards, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { addWordAction, deleteWordAction, reviewWordAction } from "@/features/learning/actions";
import type { StudentWord } from "@/lib/learning-types";
import { useAppToast } from "@/lib/use-app-toast";

const PAGE_SIZE = 10;
const LEARNED_BOX = 3;

type Source = "all" | "class" | "mine";

type VocabularyOverviewProps = {
  words: StudentWord[];
  /** Server time when the page was rendered (decides which words are due). */
  now: string;
};

/** The student's word list: words from classes plus their own, with spaced review. */
export function VocabularyOverview({ words, now }: VocabularyOverviewProps) {
  const t = useTranslations("student.learn.vocabulary");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ term: "", translation: "", example: "" });
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Source>("all");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<StudentWord[] | null>(null);

  const nowMs = Date.parse(now);
  const due = useMemo(() => words.filter((word) => Date.parse(word.dueAt) <= nowMs), [words, nowMs]);
  const learned = words.filter((word) => word.box >= LEARNED_BOX).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return words.filter((word) => {
      if (source === "class" && !word.sourceSessionId) return false;
      if (source === "mine" && word.sourceSessionId) return false;
      if (!query) return true;
      return `${word.term} ${word.translation} ${word.example}`.toLowerCase().includes(query);
    });
  }, [words, search, source]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const run = (action: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        showSuccess({ message: result.message });
        after?.();
        router.refresh();
      } else showError({ message: result.message });
    });

  const stage = (box: number) =>
    box >= LEARNED_BOX ? t("stage.learned") : box > 0 ? t("stage.learning") : t("stage.new");

  if (reviewing) {
    return (
      <ReviewSession
        words={reviewing}
        onDone={() => {
          setReviewing(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <Box mt={3}>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={9} sx={{ height: "100%" }}>
            <CardContent sx={{ p: "30px" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
                <Box flexGrow={1}>
                  <Typography variant="h5">{t("reviewTitle", { count: due.length })}</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {t("stats", { total: words.length, learned })}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={words.length ? (learned / words.length) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4, mt: 2 }}
                  />
                </Box>
                <Button
                  variant="contained"
                  startIcon={<IconCards size={18} />}
                  disabled={!due.length}
                  onClick={() => setReviewing(due.slice(0, 30))}
                >
                  {t("startReview")}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title={t("addTitle")}>
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label={t("term")}
                value={draft.term}
                onChange={(event) => setDraft({ ...draft, term: event.target.value })}
              />
              <TextField
                size="small"
                label={t("translation")}
                value={draft.translation}
                onChange={(event) => setDraft({ ...draft, translation: event.target.value })}
              />
              <TextField
                size="small"
                label={t("example")}
                value={draft.example}
                onChange={(event) => setDraft({ ...draft, example: event.target.value })}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconPlus size={14} />}
                disabled={pending || !draft.term.trim()}
                onClick={() =>
                  run(() => addWordAction(draft), () => setDraft({ term: "", translation: "", example: "" }))
                }
              >
                {t("add")}
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard title={t("listTitle")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <TextField
            size="small"
            label={t("search")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select
            size="small"
            label={t("source")}
            value={source}
            onChange={(event) => {
              setSource(event.target.value as Source);
              setPage(1);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">{t("sourceAll")}</MenuItem>
            <MenuItem value="class">{t("sourceClass")}</MenuItem>
            <MenuItem value="mine">{t("sourceMine")}</MenuItem>
          </TextField>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("term")}</TableCell>
                <TableCell>{t("translation")}</TableCell>
                <TableCell>{t("example")}</TableCell>
                <TableCell>{t("from")}</TableCell>
                <TableCell>{t("stageLabel")}</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((word) => (
                <TableRow key={word.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{word.term}</TableCell>
                  <TableCell>{word.translation}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{word.example}</TableCell>
                  <TableCell>
                    {word.sourceSessionId ? (
                      <Typography
                        component={Link}
                        href={`/classes/${word.sourceSessionId}`}
                        variant="body2"
                        color="primary"
                        sx={{ textDecoration: "none" }}
                      >
                        {word.sourceTopic ?? t("aClass")}
                      </Typography>
                    ) : (
                      t("mine")
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={word.box >= LEARNED_BOX ? "success" : word.box > 0 ? "warning" : "default"}
                      label={stage(word.box)}
                    />
                  </TableCell>
                  <TableCell padding="checkbox">
                    <IconButton
                      size="small"
                      aria-label={t("remove")}
                      disabled={pending}
                      onClick={() => run(() => deleteWordAction(word.id))}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!visible.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" py={2}>
                      {words.length ? t("noMatches") : t("empty")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>
        {pages > 1 ? (
          <Stack alignItems="center" mt={2}>
            <Pagination count={pages} page={current} onChange={(_, value) => setPage(value)} />
          </Stack>
        ) : null}
      </SectionCard>
    </Box>
  );
}

/** Flashcards: see the word, reveal the meaning, say if you knew it. */
function ReviewSession({ words, onDone }: { words: StudentWord[]; onDone: () => void }) {
  const t = useTranslations("student.learn.vocabulary");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knew, setKnew] = useState(0);
  const [saving, startTransition] = useTransition();
  const word = words[index];

  const answer = (knewIt: boolean) => {
    if (!word) return;
    startTransition(async () => {
      await reviewWordAction(word.id, knewIt);
      if (knewIt) setKnew((value) => value + 1);
      setRevealed(false);
      setIndex((value) => value + 1);
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb title={t("reviewing")} subtitle={t("reviewHint")} />
      <Card elevation={9} sx={{ maxWidth: 640, mx: "auto" }}>
        <CardContent sx={{ p: "40px", textAlign: "center" }}>
          {word ? (
            <Stack spacing={3} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {t("cardCount", { current: index + 1, total: words.length })}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(index / words.length) * 100}
                sx={{ width: "100%", height: 6, borderRadius: 3 }}
              />
              <Typography variant="h3">{word.term}</Typography>
              {revealed ? (
                <>
                  <Typography variant="h5" color="primary">
                    {word.translation || "—"}
                  </Typography>
                  {word.example ? (
                    <Typography color="text.secondary" fontStyle="italic">
                      {word.example}
                    </Typography>
                  ) : null}
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" color="error" disabled={saving} onClick={() => answer(false)}>
                      {t("didntKnow")}
                    </Button>
                    <Button variant="contained" color="success" disabled={saving} onClick={() => answer(true)}>
                      {t("knewIt")}
                    </Button>
                  </Stack>
                </>
              ) : (
                <Button variant="contained" onClick={() => setRevealed(true)}>
                  {t("reveal")}
                </Button>
              )}
            </Stack>
          ) : (
            <Stack spacing={2} alignItems="center">
              <Typography variant="h4">{t("doneTitle")}</Typography>
              <Typography color="text.secondary">
                {t("doneSummary", { knew, total: words.length })}
              </Typography>
              <Button variant="contained" onClick={onDone}>
                {t("backToList")}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
