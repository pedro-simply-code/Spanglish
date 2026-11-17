"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconCreditCard,
  IconHelpCircle,
  IconShieldCheck,
  IconVideo,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { classTypeLabel } from "@/lib/class-type-label";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { ClassListCard } from "@/features/classes/components/class-list-card";
import { getClassStatus, type ClassPolicy } from "@/features/classes/policy";
import type { LiveClass, LiveClassStatus } from "@/features/classes/types";

const statusOrder: LiveClassStatus[] = [
  "upcoming",
  "in-progress",
  "completed",
  "canceled",
];

const statusLabels: Record<LiveClassStatus, string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

export type ClassCreditSummary = {
  classType: "one-on-one" | "paired";
  durationMinutes: number;
  balance: number;
  shared: boolean;
};

type ClassesOverviewProps = {
  policy: ClassPolicy;
  items: LiveClass[];
  now: string;
  viewMode?: "student" | "staff";
  /** Student credits; null for teachers and staff (no booking hero). */
  credits: ClassCreditSummary[] | null;
};

export function ClassesOverview({
  policy,
  items,
  now,
  viewMode = "student",
  credits,
}: ClassesOverviewProps) {
  const [tab, setTab] = useState<LiveClassStatus>("upcoming");

  const counts = statusOrder.reduce<Record<LiveClassStatus, number>>(
    (accumulator, status) => {
      accumulator[status] = items.filter(
        (item) => getClassStatus(item, now) === status,
      ).length;
      return accumulator;
    },
    { upcoming: 0, "in-progress": 0, completed: 0, canceled: 0 },
  );

  const visible = items
    .filter((item) => getClassStatus(item, now) === tab)
    .sort((a, b) => {
      const first = new Date(a.startsAt).getTime();
      const second = new Date(b.startsAt).getTime();
      return tab === "upcoming" || tab === "in-progress"
        ? first - second
        : second - first;
    });

  const totalCredits = (credits ?? []).reduce(
    (sum, item) => sum + item.balance,
    0,
  );

  return (
    <Box mt={3}>
      <Breadcrumb
        title={viewMode === "staff" ? "Academy classes" : "My classes"}
        subtitle={
          viewMode === "staff"
            ? "All scheduled sessions across the academy. Switch to Manager in the top bar for day-to-day operations."
            : "Join, review, reschedule, or cancel your live classes."
        }
      />

      {credits ? (
        <Card
          elevation={9}
          sx={{
            mb: 3,
            background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)",
          }}
        >
          <CardContent sx={{ p: { xs: "30px", md: "35px" } }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: "primary.main",
                      color: "#fff",
                    }}
                  >
                    <IconVideo size={26} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {totalCredits} class credit{totalCredits === 1 ? "" : "s"}{" "}
                      left
                    </Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" mt={0.75}>
                      {credits.length ? (
                        credits.map((item) => (
                          <Chip
                            key={`${item.classType}-${item.durationMinutes}`}
                            size="small"
                            variant="outlined"
                            label={`${item.durationMinutes} min ${classTypeLabel(item.classType)}: ${item.balance}${item.shared ? " (shared)" : ""}`}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Get a package to start booking classes.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent={{ xs: "flex-start", md: "flex-end" }}
                >
                  <LinkButton
                    href="/schedule"
                    variant="contained"
                    startIcon={<IconCalendarPlus size={18} />}
                  >
                    Book a class
                  </LinkButton>
                  <LinkButton
                    href="/pricing"
                    variant="outlined"
                    startIcon={<IconCreditCard size={18} />}
                  >
                    View plans
                  </LinkButton>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
                <Tabs
                  value={tab}
                  onChange={(_, value: LiveClassStatus) => setTab(value)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  aria-label="Class status"
                >
                  {statusOrder.map((status) => (
                    <Tab
                      key={status}
                      value={status}
                      label={`${statusLabels[status]} (${counts[status]})`}
                    />
                  ))}
                </Tabs>
              </Box>
            </Card>

            {visible.length ? (
              <Stack spacing={2}>
                {visible.map((item) => (
                  <ClassListCard
                    key={item.id}
                    item={item}
                    now={now}
                    policy={policy}
                  />
                ))}
              </Stack>
            ) : (
              <Card elevation={9}>
                <CardContent sx={{ p: "40px", textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                      bgcolor: "primary.light",
                      color: "primary.main",
                    }}
                  >
                    <IconCalendarEvent size={28} />
                  </Avatar>
                  <Typography variant="h5">
                    No {statusLabels[tab].toLowerCase()} classes
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mt={1}
                    mb={2.5}
                  >
                    {tab === "upcoming"
                      ? "Book your next live class and keep the momentum going."
                      : "Classes will appear here as your schedule moves forward."}
                  </Typography>
                  {tab === "upcoming" || tab === "canceled" ? (
                    <LinkButton href="/schedule" variant="contained">
                      Book a class
                    </LinkButton>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              title="Class policy"
              subtitle="Checked on the server"
              action={
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "primary.light",
                    color: "primary.main",
                  }}
                >
                  <IconShieldCheck size={20} />
                </Avatar>
              }
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Cancellations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At least {policy.cancelCutoffHours} hours before the class
                    starts.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Rescheduling
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At least {policy.rescheduleCutoffHours} hours before the
                    class starts.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Join window
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Opens {policy.joinWindowBeforeMinutes} minutes before and
                    stays open {policy.joinWindowAfterMinutes} minutes after the
                    start.
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Credits
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    One credit per class. Cancel at least {policy.cancelCutoffHours}{" "}
                    hours ahead and the credit returns to your package.
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>

            <SectionCard
              title="At a glance"
              subtitle="Your class activity"
              action={
                <Chip
                  label={`${items.length} total`}
                  size="small"
                  variant="outlined"
                />
              }
            >
              <Stack spacing={1.5}>
                {statusOrder.map((status) => (
                  <Stack
                    key={status}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      {statusLabels[status]}
                    </Typography>
                    <Chip
                      label={counts[status]}
                      size="small"
                      variant={status === tab ? "filled" : "outlined"}
                      color={status === tab ? "primary" : "default"}
                    />
                  </Stack>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Need a hand?" subtitle="We are here to help">
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "warning.light",
                    color: "warning.main",
                  }}
                >
                  <IconHelpCircle size={20} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Outside the change window?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Message support from Settings and the academy team will
                    review your case.
                  </Typography>
                  <LinkButton
                    href="/settings"
                    size="small"
                    sx={{ mt: 1.5, px: 0 }}
                    endIcon={null}
                  >
                    Open settings
                  </LinkButton>
                </Box>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
