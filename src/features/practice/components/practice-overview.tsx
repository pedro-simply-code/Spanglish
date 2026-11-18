"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { IconArrowRight, IconClipboardList } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { AssignmentStatusChip } from "@/features/learning";
import type { AssignmentSummary } from "@/lib/learning-types";

type Filter = "todo" | "submitted" | "graded";

type PracticeOverviewProps = {
  assignments: AssignmentSummary[];
  timeZone: string;
};

/** Practice forms the student's teachers assigned, by status. */
export function PracticeOverview({ assignments, timeZone }: PracticeOverviewProps) {
  const t = useTranslations("student.learn.practice");
  const format = useFormatter();
  const groups: Record<Filter, AssignmentSummary[]> = {
    todo: assignments.filter((item) => !item.mySubmission),
    submitted: assignments.filter((item) => item.mySubmission?.status === "submitted"),
    graded: assignments.filter((item) => item.mySubmission?.status === "graded"),
  };
  const [filter, setFilter] = useState<Filter>(groups.todo.length || !assignments.length ? "todo" : "graded");
  const list =
    filter === "todo"
      ? [...groups.todo].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
      : groups[filter];
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone });

  return (
    <Box mt={3}>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />
      <Tabs value={filter} onChange={(_, value: Filter) => setFilter(value)} sx={{ mb: 3 }}>
        <Tab value="todo" label={t("tabTodo", { count: groups.todo.length })} />
        <Tab value="submitted" label={t("tabSubmitted", { count: groups.submitted.length })} />
        <Tab value="graded" label={t("tabGraded", { count: groups.graded.length })} />
      </Tabs>

      <Grid container spacing={3}>
        {list.map((assignment) => (
          <Grid key={assignment.id} size={{ xs: 12, md: 6 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "24px" }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
                      <IconClipboardList size={22} />
                      <Typography variant="h6" noWrap>
                        {assignment.title}
                      </Typography>
                    </Stack>
                    <AssignmentStatusChip assignment={assignment} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t("fromClass", { topic: assignment.classTopic, teacher: assignment.teacherName })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("questions", { count: assignment.questionCount })}
                    {assignment.dueAt ? ` · ${t("due", { date: date(assignment.dueAt) })}` : ""}
                  </Typography>
                  {assignment.mySubmission?.feedback ? (
                    <Typography variant="body2" sx={{ p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}>
                      {assignment.mySubmission.feedback}
                    </Typography>
                  ) : null}
                  <LinkButton
                    href={`/practice/${assignment.id}`}
                    variant={assignment.mySubmission ? "outlined" : "contained"}
                    size="small"
                    endIcon={<IconArrowRight size={14} />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {assignment.mySubmission ? t("view") : t("start")}
                  </LinkButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!list.length ? (
          <Grid size={12}>
            <Card elevation={9}>
              <CardContent sx={{ p: "30px" }}>
                <Typography color="text.secondary">
                  {assignments.length ? t(`empty.${filter}`) : t("emptyAll")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );
}
