"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconChecklist,
  IconFileText,
  IconLanguage,
  IconVideo,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import type { LessonEntry } from "@/lib/learning-types";

const PAGE_SIZE = 10;

type LessonsOverviewProps = {
  lessons: LessonEntry[];
  timeZone: string;
};

/** The student's lessons: every past class with what it left behind. */
export function LessonsOverview({ lessons, timeZone }: LessonsOverviewProps) {
  const t = useTranslations("student.learn.lessons");
  const tStudent = useTranslations("student");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (pendingOnly && !lesson.pendingAssignments) return false;
      if (!query) return true;
      return [lesson.topic, lesson.teacherName, lesson.recap ?? "", lesson.homework ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [lessons, search, pendingOnly]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <Box mt={3}>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          label={t("search")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          sx={{ flexGrow: 1, maxWidth: { sm: 420 } }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={pendingOnly}
              onChange={(event) => {
                setPendingOnly(event.target.checked);
                setPage(1);
              }}
            />
          }
          label={t("pendingOnly")}
        />
      </Stack>

      <Stack spacing={2}>
        {visible.map((lesson) => (
          <Card key={lesson.id} elevation={9}>
            <CardContent sx={{ p: "24px" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <Box minWidth={0} flexGrow={1}>
                  <Typography variant="caption" color="text.secondary">
                    {format.dateTime(new Date(lesson.startsAt), {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone,
                    })}{" "}
                    · {t("with", { name: lesson.teacherName })}
                  </Typography>
                  <Typography variant="h6" mt={0.5}>
                    {lesson.topic}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      color={lesson.attended ? "success" : "default"}
                      variant="outlined"
                      label={
                        lesson.attended
                          ? t("attended", { minutes: lesson.minutesPresent })
                          : t("missed")
                      }
                    />
                    {lesson.hasRecording ? (
                      <Chip size="small" variant="outlined" icon={<IconVideo size={14} />} label={t("recording")} />
                    ) : null}
                    {lesson.hasTranscript ? (
                      <Chip size="small" variant="outlined" icon={<IconFileText size={14} />} label={t("transcript")} />
                    ) : null}
                    {lesson.vocabularyCount ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<IconLanguage size={14} />}
                        label={t("words", { count: lesson.vocabularyCount })}
                      />
                    ) : null}
                    {lesson.assignmentCount ? (
                      <Chip
                        size="small"
                        color={lesson.pendingAssignments ? "warning" : "success"}
                        variant="outlined"
                        icon={<IconChecklist size={14} />}
                        label={
                          lesson.pendingAssignments
                            ? t("practicePending", { count: lesson.pendingAssignments })
                            : t("practiceDone")
                        }
                      />
                    ) : null}
                  </Stack>
                  {lesson.recap ? (
                    <Typography variant="body2" color="text.secondary" mt={1.5} sx={{ whiteSpace: "pre-wrap" }}>
                      {lesson.recap.length > 320 ? `${lesson.recap.slice(0, 320)}…` : lesson.recap}
                    </Typography>
                  ) : null}
                  {lesson.homework ? (
                    <Typography variant="body2" mt={1}>
                      <strong>{tStudent("classes.detail.homework")}:</strong> {lesson.homework}
                    </Typography>
                  ) : null}
                </Box>
                <Box flexShrink={0}>
                  <LinkButton
                    href={`/classes/${lesson.id}`}
                    variant="outlined"
                    size="small"
                    endIcon={<IconArrowRight size={14} />}
                  >
                    {t("open")}
                  </LinkButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {!visible.length ? (
          <Card elevation={9}>
            <CardContent sx={{ p: "30px" }}>
              <Typography color="text.secondary">
                {lessons.length ? t("noMatches") : t("empty")}
              </Typography>
              {!lessons.length ? (
                <LinkButton href="/schedule" variant="contained" size="small" sx={{ mt: 2 }}>
                  {t("book")}
                </LinkButton>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </Stack>

      {pages > 1 ? (
        <Stack alignItems="center" mt={3}>
          <Pagination count={pages} page={current} onChange={(_, value) => setPage(value)} />
        </Stack>
      ) : null}
    </Box>
  );
}
