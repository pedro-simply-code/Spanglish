"use client";

import { useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconClock,
  IconFileText,
  IconFilterOff,
  IconLanguage,
  IconSchool,
  IconSearch,
  IconVideo,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { classTypeLabel } from "@/lib/class-type-label";
import type { LessonEntry } from "@/lib/learning-types";

/**
 * Node and browsers disagree on the thin / narrow spaces in time ranges
 * ("6:30 – 6:55 PM"), which breaks hydration; use plain spaces.
 */
const plainSpaces = (text: string) => text.replace(/[\u2009\u202f]/g, " ");

/** Lessons per page. */
const PAGE_SIZE = 5;

type LessonsOverviewProps = {
  lessons: LessonEntry[];
  timeZone: string;
};

type StatusFilter = "all" | "attended" | "missed" | "pending";

/** The student's lessons: every past class with what it left behind. */
export function LessonsOverview({ lessons, timeZone }: LessonsOverviewProps) {
  const t = useTranslations("student.learn.lessons");
  const tStudent = useTranslations("student");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const [teacher, setTeacher] = useState("all");
  const [classType, setClassType] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const teachers = useMemo(
    () => [...new Set(lessons.map((lesson) => lesson.teacherName))].sort((a, b) => a.localeCompare(b)),
    [lessons],
  );
  const classTypes = useMemo(() => [...new Set(lessons.map((lesson) => lesson.classType))], [lessons]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (teacher !== "all" && lesson.teacherName !== teacher) return false;
      if (classType !== "all" && lesson.classType !== classType) return false;
      if (status === "attended" && !lesson.attended) return false;
      if (status === "missed" && lesson.attended) return false;
      if (status === "pending" && !lesson.pendingAssignments) return false;
      if (!query) return true;
      return [lesson.topic, lesson.teacherName, lesson.recap ?? "", lesson.summary ?? "", lesson.homework ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [lessons, search, teacher, classType, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const attendedLessons = filtered.filter((lesson) => lesson.attended);
  const pendingPractice = filtered.reduce((sum, lesson) => sum + lesson.pendingAssignments, 0);
  const summary: {
    key: string;
    icon: typeof IconSchool;
    color: "primary" | "secondary" | "success" | "warning";
    value: string | number;
    label: string;
    href?: string;
  }[] = [
    {
      key: "attended",
      icon: IconSchool,
      color: "primary",
      value: t("summary.attendedValue", { attended: attendedLessons.length, total: filtered.length }),
      label: t("summary.attended"),
    },
    {
      key: "minutes",
      icon: IconClock,
      color: "secondary",
      value: t("summary.minutesValue", {
        minutes: attendedLessons.reduce((sum, lesson) => sum + lesson.minutesPresent, 0),
      }),
      label: t("summary.minutes"),
    },
    {
      key: "words",
      icon: IconLanguage,
      color: "success",
      value: filtered.reduce((sum, lesson) => sum + lesson.vocabularyCount, 0),
      label: t("summary.words"),
    },
    {
      key: "practice",
      icon: IconChecklist,
      color: pendingPractice ? "warning" : "success",
      value: pendingPractice,
      label: t("summary.pending"),
      href: pendingPractice ? "/study?tab=practice" : undefined,
    },
  ];
  /** Lessons per teacher (all lessons, not the filtered ones); a click filters by that teacher. */
  const teacherStats = useMemo(() => {
    const byName = new Map<string, { name: string; avatar: string | null; lessons: number; attended: number; minutes: number }>();
    for (const lesson of lessons) {
      const entry = byName.get(lesson.teacherName) ?? {
        name: lesson.teacherName,
        avatar: lesson.teacherAvatar,
        lessons: 0,
        attended: 0,
        minutes: 0,
      };
      entry.lessons += 1;
      if (lesson.attended) {
        entry.attended += 1;
        entry.minutes += lesson.minutesPresent;
      }
      byName.set(lesson.teacherName, entry);
    }
    return [...byName.values()].sort((a, b) => b.lessons - a.lessons || a.name.localeCompare(b.name));
  }, [lessons]);
  const filtering = Boolean(search.trim()) || teacher !== "all" || classType !== "all" || status !== "all";

  /** Any filter change goes back to the first page. */
  const update = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch("");
    setTeacher("all");
    setClassType("all");
    setStatus("all");
    setPage(1);
  };

  return (
    <Box>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      {/* What the (filtered) lessons add up to, full width like the credits hero in My classes. */}
      <Card elevation={9} sx={{ mb: 3, background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
        <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
          <Grid container spacing={3} alignItems="center">
            {summary.map((item) => {
              const Icon = item.icon;
              const content = (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 44, height: 44, bgcolor: `${item.color}.light`, color: `${item.color}.main` }}>
                    <Icon size={22} />
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="h6" lineHeight={1.2}>
                      {item.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Box>
                </Stack>
              );
              return (
                <Grid key={item.key} size={{ xs: 6, md: 3 }}>
                  {item.href ? (
                    <Box component={Link} href={item.href} sx={{ textDecoration: "none", color: "inherit" }}>
                      {content}
                    </Box>
                  ) : (
                    content
                  )}
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                {/* One line on desktop: search grows, the three selects keep their width. */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("search")}
                    sx={{ flex: { md: "1 1 auto" }, minWidth: { md: 140 } }}
                    value={search}
                    onChange={(event) => update(setSearch)(event.target.value)}
                    slotProps={{ input: { startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} /> } }}
                  />
                  <TextField
                    select
                    size="small"
                    label={t("filters.teacher")}
                    value={teacher}
                    onChange={(event) => update(setTeacher)(event.target.value)}
                    sx={{ flex: { md: "0 0 125px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("filters.allTeachers")}</MenuItem>
                    {teachers.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label={t("filters.type")}
                    value={classType}
                    onChange={(event) => update(setClassType)(event.target.value)}
                    sx={{ flex: { md: "0 0 125px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("filters.allTypes")}</MenuItem>
                    {classTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {classTypeLabel(type, tStudent)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label={t("filters.status")}
                    value={status}
                    onChange={(event) => update(setStatus)(event.target.value as StatusFilter)}
                    sx={{ flex: { md: "0 0 125px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("filters.allLessons")}</MenuItem>
                    <MenuItem value="attended">{t("filters.attended")}</MenuItem>
                    <MenuItem value="missed">{t("filters.missed")}</MenuItem>
                    <MenuItem value="pending">{t("filters.pending")}</MenuItem>
                  </TextField>
                  {filtering ? (
                    <Tooltip title={t("filters.clear")}>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label={t("filters.clear")}
                        onClick={clearFilters}
                        sx={{ flexShrink: 0, alignSelf: { xs: "flex-end", md: "center" } }}
                      >
                        <IconFilterOff size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={2}>
                    {visible.map((lesson) => {
                      const start = new Date(lesson.startsAt);
                      const end = new Date(start.getTime() + lesson.durationMinutes * 60_000);
                      return (
                        <Card key={lesson.id} elevation={9}>
                          <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={2.5}
                              alignItems={{ xs: "stretch", sm: "flex-start" }}
                            >
                              {/* Same date block as the cards in "Mis clases" */}
                              <Box
                                sx={{
                                  width: { xs: "100%", sm: 72 },
                                  py: 1.25,
                                  px: { xs: 2, sm: 1 },
                                  textAlign: "center",
                                  bgcolor: lesson.attended ? "primary.light" : "grey.200",
                                  color: lesson.attended ? "primary.main" : "text.secondary",
                                  flexShrink: 0,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  display="block"
                                  fontWeight={600}
                                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                                >
                                  {format.dateTime(start, { weekday: "short", timeZone })}
                                </Typography>
                                <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                                  {format.dateTime(start, { day: "numeric", timeZone })}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {format.dateTime(start, { month: "short", timeZone })}{" "}
                                  {format.dateTime(start, { year: "numeric", timeZone })}
                                </Typography>
                              </Box>

                              <Box flexGrow={1} minWidth={0}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75} alignItems="center">
                                  <Chip
                                    size="small"
                                    color={lesson.attended ? "success" : "default"}
                                    label={lesson.attended ? t("attended", { minutes: lesson.minutesPresent }) : t("missed")}
                                  />
                                  <Chip size="small" variant="outlined" label={classTypeLabel(lesson.classType, tStudent)} />
                                  <Chip size="small" variant="outlined" label={t("minutes", { minutes: lesson.durationMinutes })} />
                                  {lesson.hasRecording ? (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      icon={<IconVideo size={14} />}
                                      label={t("recording")}
                                    />
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

                                <Typography variant="h5" mt={1.25}>
                                  {lesson.topic}
                                </Typography>

                                <Stack
                                  direction="row"
                                  flexWrap="wrap"
                                  useFlexGap
                                  columnGap={2}
                                  rowGap={0.5}
                                  mt={1}
                                  sx={{ "& .MuiTypography-root": { whiteSpace: "nowrap" } }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Avatar
                                      src={lesson.teacherAvatar ?? undefined}
                                      alt={lesson.teacherName}
                                      sx={{ width: 24, height: 24, fontSize: 12 }}
                                    >
                                      {lesson.teacherName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2" color="text.secondary">
                                      {t("with", { name: lesson.teacherName })}
                                    </Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconCalendarEvent size={14} />
                                    <Typography variant="body2" color="text.secondary">
                                      {format.dateTime(start, { weekday: "short", month: "short", day: "numeric", timeZone })}
                                    </Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconClock size={14} />
                                    <Typography variant="body2" color="text.secondary">
                                      {plainSpaces(
                                        format.dateTimeRange(start, end, { hour: "numeric", minute: "2-digit", timeZone }),
                                      )}
                                    </Typography>
                                  </Stack>
                                </Stack>

                                {lesson.recap ? (
                                  <Typography variant="body2" color="text.secondary" mt={1.25} sx={{ whiteSpace: "pre-wrap" }}>
                                    <Box component="strong" color="text.primary">
                                      {t("recapLabel")}:
                                    </Box>{" "}
                                    {lesson.recap.length > 320 ? `${lesson.recap.slice(0, 320)}…` : lesson.recap}
                                  </Typography>
                                ) : null}
                                {lesson.summary ? (
                                  <Typography variant="body2" color="text.secondary" mt={1}>
                                    <Box component="strong" color="text.primary">
                                      {t("summaryLabel")}:
                                    </Box>{" "}
                                    {lesson.summary}
                                  </Typography>
                                ) : null}
                                {lesson.homework ? (
                                  <Typography variant="body2" color="text.secondary" mt={1}>
                                    <Box component="strong" color="text.primary">
                                      {tStudent("classes.detail.homework")}:
                                    </Box>{" "}
                                    {lesson.homework}
                                  </Typography>
                                ) : null}
                              </Box>

                              <Stack
                                direction={{ xs: "row", sm: "column" }}
                                spacing={1.5}
                                width={{ xs: "100%", sm: "auto" }}
                                flexShrink={0}
                              >
                                <LinkButton
                                  href={`/classes/${lesson.id}`}
                                  variant="contained"
                                  endIcon={<IconArrowRight size={16} />}
                                >
                                  {t("open")}
                                </LinkButton>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {!visible.length ? (
                      <Card elevation={9}>
                        <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                          <Typography color="text.secondary">
                            {lessons.length ? t("noMatches") : t("empty")}
                          </Typography>
                          {!lessons.length ? (
                            <LinkButton href="/classes?tab=book" variant="contained" size="small" sx={{ mt: 2 }}>
                              {t("book")}
                            </LinkButton>
                          ) : (
                            <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>
                              {t("filters.clear")}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : null}

                    <ListPagination
                      page={current}
                      total={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={(next) => {
                        setPage(next);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {teacherStats.length ? (
              <SectionCard padding="15px" title={t("teachers.title")} subtitle={t("teachers.subtitle")}>
                <Stack spacing={1}>
                  {teacherStats.map((item) => {
                    const selected = teacher === item.name;
                    return (
                      <Stack
                        key={item.name}
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        role="button"
                        tabIndex={0}
                        onClick={() => update(setTeacher)(selected ? "all" : item.name)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") update(setTeacher)(selected ? "all" : item.name);
                        }}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          cursor: "pointer",
                          bgcolor: selected ? "primary.light" : "transparent",
                          "&:hover": { bgcolor: selected ? "primary.light" : "grey.100" },
                        }}
                      >
                        <Avatar src={item.avatar ?? undefined} alt={item.name} sx={{ width: 32, height: 32, fontSize: 14 }}>
                          {item.name.charAt(0)}
                        </Avatar>
                        <Box flexGrow={1} minWidth={0}>
                          <Typography variant="subtitle2" noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("teachers.detail", { lessons: item.lessons, minutes: item.minutes })}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={t("summary.attendedValue", { attended: item.attended, total: item.lessons })}
                          color={selected ? "primary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
