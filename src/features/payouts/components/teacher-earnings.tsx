"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { classTypeLabel } from "@/lib/class-type-label";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";

export type EarningRow = {
  id: string;
  sessionId: string;
  topic: string;
  classType: string;
  durationMinutes: number;
  amountCents: number;
  level: number;
  classEndedAt: string;
  status: "unpaid" | "in-batch" | "paid";
};

type Props = {
  earnings: EarningRow[];
  levelName: string;
  teacherSharePercent: number;
  platformTakePercent: number;
  nextLevel: { name: string; classes: number; ratings: number; rating: number } | null;
  ratingAverage: number;
  ratingCount: number;
  classesTaught: number;
  badges: { id: string; label: string; description: string }[];
  exampleCreditCents: number;
  monthStart: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const statusChip = {
  unpaid: { label: "Unpaid", color: "default" },
  "in-batch": { label: "In payout", color: "warning" },
  paid: { label: "Paid", color: "success" },
} as const;

function Stat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Box sx={{ p: "24px", bgcolor: "background.paper", borderRadius: 1.75, height: "100%" }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {helper}
      </Typography>
    </Box>
  );
}

export function TeacherEarnings(props: Props) {
  const [listPage, setListPage] = useState(1);
  const pagedEarnings = useMemo(
    () => sliceForPage(props.earnings, listPage, DEFAULT_PAGE_SIZE),
    [props.earnings, listPage],
  );
  const monthStart = new Date(props.monthStart).getTime();
  const thisMonth = props.earnings
    .filter((item) => new Date(item.classEndedAt).getTime() >= monthStart)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const unpaid = props.earnings.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0);
  const paid = props.earnings.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Earnings"
        subtitle="What you earned per delivered class and what was already paid."
        items={[{ title: "Teacher", to: "/teacher" }, { title: "Earnings" }]}
      />

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label="This month" value={money(thisMonth)} helper="Delivered classes" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label="Not paid yet" value={money(unpaid)} helper="Request a payout when you are ready" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label="Paid" value={money(paid)} helper="All time" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat
            label="Rating"
            value={props.ratingCount ? `${props.ratingAverage.toFixed(1)}★` : "—"}
            helper={`${props.ratingCount} ratings · ${props.classesTaught} classes`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Classes">
            {props.earnings.length ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedEarnings.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{dateFormat.format(new Date(item.classEndedAt))}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.topic}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.durationMinutes} min · {classTypeLabel(item.classType)} · level {item.level}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{money(item.amountCents)}</TableCell>
                        <TableCell>
                          <Chip size="small" color={statusChip[item.status].color} label={statusChip[item.status].label} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ListPagination page={listPage} total={props.earnings.length} onPageChange={setListPage} />
              </Box>
            ) : (
              <Typography color="text.secondary">No delivered classes yet.</Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              title={props.levelName}
              subtitle={`You keep ${props.teacherSharePercent}% of each credit · platform take ${props.platformTakePercent}%`}
            >
              <Stack spacing={1}>
                <Typography variant="body2">
                  On a {money(props.exampleCreditCents)} credit you earn about{" "}
                  {money(Math.round((props.exampleCreditCents * props.teacherSharePercent) / 100))} per class delivered.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actual pay follows the student’s credit value when they booked (package price ÷ credits).
                </Typography>
                {props.nextLevel ? (
                  <Typography variant="body2" color="text.secondary">
                    Next: {props.nextLevel.name} — {props.nextLevel.classes} more classes,{" "}
                    {props.nextLevel.ratings} more ratings, {props.nextLevel.rating}★ average.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Top level reached.
                  </Typography>
                )}
              </Stack>
            </SectionCard>
            <SectionCard title="Badges">
              {props.badges.length ? (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {props.badges.map((badge) => (
                    <Chip key={badge.id} color="primary" variant="outlined" label={badge.label} title={badge.description} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Teach your first class to earn a badge.
                </Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
