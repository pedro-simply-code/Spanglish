"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconBrain,
  IconCards,
  IconCircleCheck,
  IconDeviceGamepad2,
  IconLanguage,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { addWordAction, deleteWordAction, reviewWordAction } from "@/features/learning/actions";
import type { StudentWord } from "@/lib/learning-types";
import { useAppToast } from "@/lib/use-app-toast";

const PAGE_SIZE = 10;
const LEARNED_BOX = 3;

type Source = "all" | "class" | "mine";
type StageFilter = "all" | "new" | "learning" | "learned";

const stageOf = (box: number): Exclude<StageFilter, "all"> =>
  box >= LEARNED_BOX ? "learned" : box > 0 ? "learning" : "new";

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
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
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
      if (stageFilter !== "all" && stageOf(word.box) !== stageFilter) return false;
      if (!query) return true;
      return `${word.term} ${word.translation} ${word.example}`.toLowerCase().includes(query);
    });
  }, [words, search, source, stageFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /** Setter that also goes back to the first page. */
  const update =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const run = (action: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        showSuccess({ message: result.message });
        after?.();
        router.refresh();
      } else showError({ message: result.message });
    });

  const stage = (box: number) => t(`stage.${stageOf(box)}`);

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

  const learning = words.filter((word) => word.box > 0 && word.box < LEARNED_BOX).length;
  const fromClasses = words.filter((word) => word.sourceSessionId).length;
  const learnedPercent = words.length ? Math.round((learned / words.length) * 100) : 0;

  return (
    <Box>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <SummaryBanner
        items={[
          { key: "total", icon: IconLanguage, color: "primary", value: words.length, label: t("summary.total") },
          { key: "due", icon: IconCards, color: due.length ? "warning" : "success", value: due.length, label: t("summary.due") },
          { key: "learning", icon: IconBrain, color: "secondary", value: learning, label: t("stage.learning") },
          { key: "learned", icon: IconCircleCheck, color: "success", value: learned, label: t("stage.learned") },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<IconCards size={18} />}
            disabled={!due.length}
            onClick={() => setReviewing(due.slice(0, 30))}
          >
            {t("startReview")}
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                {/* One line on desktop, like the filters in "Lo que he aprendido". */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("search")}
                    value={search}
                    onChange={(event) => update(setSearch)(event.target.value)}
                    slotProps={{ input: { startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} /> } }}
                    sx={{ flex: { md: "1 1 auto" }, minWidth: { md: 140 } }}
                  />
                  <TextField
                    select
                    size="small"
                    label={t("source")}
                    value={source}
                    onChange={(event) => update(setSource)(event.target.value as Source)}
                    sx={{ flex: { md: "0 0 170px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("sourceAll")}</MenuItem>
                    <MenuItem value="class">{t("sourceClass")}</MenuItem>
                    <MenuItem value="mine">{t("sourceMine")}</MenuItem>
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label={t("stageLabel")}
                    value={stageFilter}
                    onChange={(event) => update(setStageFilter)(event.target.value as StageFilter)}
                    sx={{ flex: { md: "0 0 150px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("stageAll")}</MenuItem>
                    <MenuItem value="new">{t("stage.new")}</MenuItem>
                    <MenuItem value="learning">{t("stage.learning")}</MenuItem>
                    <MenuItem value="learned">{t("stage.learned")}</MenuItem>
                  </TextField>
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                {visible.length ? (
                  <Stack divider={<Divider flexItem />} spacing={1.5}>
                    {visible.map((word) => (
                      <Stack key={word.id} direction="row" spacing={2} alignItems="center">
                        <Box flexGrow={1} minWidth={0}>
                          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                            <Typography variant="subtitle1" fontWeight={700}>
                              {word.term}
                            </Typography>
                            {word.translation ? (
                              <Typography variant="body2" color="text.secondary">
                                · {word.translation}
                              </Typography>
                            ) : null}
                          </Stack>
                          {word.example ? (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              {word.example}
                            </Typography>
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            {t("from")}:{" "}
                            {word.sourceSessionId ? (
                              <Typography
                                component={Link}
                                href={`/classes/${word.sourceSessionId}`}
                                variant="caption"
                                color="primary"
                                sx={{ textDecoration: "none" }}
                              >
                                {word.sourceTopic ?? t("aClass")}
                              </Typography>
                            ) : (
                              t("mine")
                            )}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={word.box >= LEARNED_BOX ? "success" : word.box > 0 ? "warning" : "default"}
                          label={stage(word.box)}
                        />
                        <IconButton
                          size="small"
                          aria-label={t("remove")}
                          disabled={pending}
                          onClick={() => run(() => deleteWordAction(word.id))}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" py={3} textAlign="center">
                    {words.length ? t("noMatches") : t("empty")}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <ListPagination page={current} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard padding="15px" title={t("addTitle")}>
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

            <SectionCard padding="15px" title={t("progress.title")} subtitle={t("stats", { total: words.length, learned })}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("progress.learned")}
                  </Typography>
                  <Typography variant="subtitle2">{learnedPercent}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={learnedPercent} sx={{ height: 8, borderRadius: 4 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("sourceClass")}
                  </Typography>
                  <Chip size="small" variant="outlined" label={fromClasses} />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("sourceMine")}
                  </Typography>
                  <Chip size="small" variant="outlined" label={words.length - fromClasses} />
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard padding="15px" title={t("games.title")} subtitle={t("games.subtitle")}>
              <LinkButton
                href="/materials/my-words"
                variant="outlined"
                size="small"
                startIcon={<IconDeviceGamepad2 size={16} />}
                disabled={!words.length}
              >
                {t("games.play")}
              </LinkButton>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
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
    <Box>
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
