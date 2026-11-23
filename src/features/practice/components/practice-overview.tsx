"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  IconAlarm,
  IconArrowRight,
  IconCalendarEvent,
  IconClipboardList,
  IconSchool,
  IconSend,
  IconStar,
  IconUser,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { DateBlock } from "@/components/ui/date-block";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { AssignmentStatusChip } from "@/features/learning";
import type { AssignmentSummary } from "@/lib/learning-types";

type Filter = "todo" | "submitted" | "graded";

const PAGE_SIZE = 5;

type PracticeOverviewProps = {
  assignments: AssignmentSummary[];
  timeZone: string;
};

/** Practice forms the student's teachers assigned, by status (same layout as My classes). */
export function PracticeOverview({ assignments, timeZone }: PracticeOverviewProps) {
  const t = useTranslations("student.learn.practice");
  const format = useFormatter();
  const groups: Record<Filter, AssignmentSummary[]> = {
    todo: assignments
      .filter((item) => !item.mySubmission)
      .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")),
    submitted: assignments.filter((item) => item.mySubmission?.status === "submitted"),
    graded: assignments
      .filter((item) => item.mySubmission?.status === "graded")
      .sort((a, b) => (b.mySubmission?.gradedAt ?? "").localeCompare(a.mySubmission?.gradedAt ?? "")),
  };
  const [filter, setFilter] = useState<Filter>(groups.todo.length || !assignments.length ? "todo" : "graded");
  const [page, setPage] = useState(1);
  const list = groups[filter];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone });

  const overdue = groups.todo.filter((item) => item.overdue);
  const scored = groups.graded.filter((item) => item.mySubmission?.score != null && item.maxScore > 0);
  const average = scored.length
    ? Math.round(
        (scored.reduce((sum, item) => sum + (item.mySubmission!.score! / item.maxScore), 0) / scored.length) * 100,
      )
    : null;
  const nextDue = groups.todo[0] ?? null;
  const recentGrades = groups.graded.slice(0, 3);

  return (
    <Box>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <SummaryBanner
        items={[
          { key: "todo", icon: IconClipboardList, color: "primary", value: groups.todo.length, label: t("summary.todo") },
          {
            key: "overdue",
            icon: IconAlarm,
            color: overdue.length ? "error" : "success",
            value: overdue.length,
            label: t("summary.overdue"),
          },
          { key: "submitted", icon: IconSend, color: "secondary", value: groups.submitted.length, label: t("summary.submitted") },
          {
            key: "average",
            icon: IconStar,
            color: "warning",
            value: average == null ? "—" : `${average}%`,
            label: t("summary.average"),
          },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <Box sx={{ px: 2 }}>
                <Tabs
                  value={filter}
                  onChange={(_, value: Filter) => {
                    setFilter(value);
                    setPage(1);
                  }}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab value="todo" label={t("tabTodo", { count: groups.todo.length })} />
                  <Tab value="submitted" label={t("tabSubmitted", { count: groups.submitted.length })} />
                  <Tab value="graded" label={t("tabGraded", { count: groups.graded.length })} />
                </Tabs>
              </Box>
            </Card>

            {visible.length ? (
              <Stack spacing={2}>
                {visible.map((assignment) => {
                  const when = new Date(assignment.dueAt ?? assignment.classStartsAt);
                  const submission = assignment.mySubmission;
                  return (
                    <Card key={assignment.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2.5}
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                        >
                          <DateBlock
                            date={when}
                            timeZone={timeZone}
                            highlight={!submission}
                            alert={!submission && assignment.overdue}
                          />

                          <Box flexGrow={1} minWidth={0}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                              <AssignmentStatusChip assignment={assignment} />
                              <Chip size="small" variant="outlined" label={t("questions", { count: assignment.questionCount })} />
                            </Stack>

                            <Typography variant="h5" mt={1.25}>
                              {assignment.title}
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
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconUser size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {assignment.teacherName}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconSchool size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {assignment.classTopic}
                                </Typography>
                              </Stack>
                              {assignment.dueAt ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconCalendarEvent size={14} />
                                  <Typography
                                    variant="body2"
                                    color={!submission && assignment.overdue ? "error.main" : "text.secondary"}
                                  >
                                    {t("due", { date: date(assignment.dueAt) })}
                                  </Typography>
                                </Stack>
                              ) : null}
                            </Stack>

                            {submission?.feedback ? (
                              <Typography variant="body2" mt={1.25}>
                                <Box component="span" fontWeight={600}>
                                  {t("feedbackLabel")}
                                </Box>{" "}
                                {submission.feedback}
                              </Typography>
                            ) : null}
                          </Box>

                          <LinkButton
                            href={`/practice/${assignment.id}`}
                            variant={submission ? "outlined" : "contained"}
                            endIcon={<IconArrowRight size={16} />}
                            sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "flex-start" } }}
                          >
                            {submission ? t("view") : t("start")}
                          </LinkButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Card elevation={9}>
                <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
                  <Typography color="text.secondary" py={3}>
                    {assignments.length ? t(`empty.${filter}`) : t("emptyAll")}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <ListPagination
              page={current}
              total={list.length}
              pageSize={PAGE_SIZE}
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard padding="15px" title={t("next.title")} subtitle={t("next.subtitle")}>
              {nextDue ? (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {nextDue.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("fromClass", { topic: nextDue.classTopic, teacher: nextDue.teacherName })}
                    </Typography>
                    {nextDue.dueAt ? (
                      <Typography variant="body2" color={nextDue.overdue ? "error.main" : "text.secondary"} mt={0.5}>
                        {t("due", { date: date(nextDue.dueAt) })}
                      </Typography>
                    ) : null}
                  </Box>
                  <LinkButton
                    href={`/practice/${nextDue.id}`}
                    variant="contained"
                    size="small"
                    endIcon={<IconArrowRight size={14} />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {t("start")}
                  </LinkButton>
                </Stack>
              ) : (
                <Typography color="text.secondary">{t("next.none")}</Typography>
              )}
            </SectionCard>

            <SectionCard padding="15px" title={t("recent.title")}>
              {recentGrades.length ? (
                <Stack spacing={1.5}>
                  {recentGrades.map((item) => (
                    <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                      <Box flexGrow={1} minWidth={0}>
                        <Typography variant="subtitle2" noWrap>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {item.teacherName}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label={
                          item.mySubmission?.score != null
                            ? t("score", { score: item.mySubmission.score, max: item.maxScore })
                            : t("graded")
                        }
                      />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">{t("empty.graded")}</Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
