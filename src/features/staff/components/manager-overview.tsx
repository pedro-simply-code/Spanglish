"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCash,
  IconReceipt2,
  IconSchool,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { ManagerDashboardSnapshot } from "@/features/staff/types";

type ManagerOverviewProps = {
  firstName: string;
  snapshot: ManagerDashboardSnapshot;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const quickLinks = [
  { label: "Academy schedule", href: "/apps/calendar", icon: IconVideo },
  { label: "Students & credits", href: "/manager/students", icon: IconUsers },
  { label: "Teacher payouts", href: "/manager/payouts", icon: IconCash },
  { label: "Applications", href: "/manager/applications", icon: IconSchool },
  { label: "Billing", href: "/manager/billing", icon: IconReceipt2 },
] as const;

export function ManagerOverview({ firstName, snapshot }: ManagerOverviewProps) {
  const { stats, team, attention, operations, billing } = snapshot;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={`Operations, ${firstName}`}
        subtitle="Operations only — you do not teach or take classes. Review staff, students, billing, and schedules here."
      />

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              {stat.href ? (
                <CardActionArea href={stat.href} sx={{ height: "100%" }}>
                  <CardContent sx={{ p: "30px" }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="primary.main" mt={1}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {stat.helper}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              ) : (
                <CardContent sx={{ p: "30px" }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main" mt={1}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {stat.helper}
                  </Typography>
                </CardContent>
              )}
            </Card>
          </Grid>
        ))}

        <Grid size={12}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {quickLinks.map((link) => (
              <LinkButton
                key={link.href}
                href={link.href}
                size="small"
                variant="outlined"
                startIcon={<link.icon size={16} />}
              >
                {link.label}
              </LinkButton>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Teachers"
            subtitle={`${snapshot.teacherCount} on staff · by classes delivered`}
            action={
              <LinkButton size="small" href="/manager/staff" endIcon={<IconArrowRight size={14} />}>
                Staff
              </LinkButton>
            }
          >
            <Stack spacing={2} divider={<Divider />}>
              {!team.length ? (
                <Typography variant="body2" color="text.secondary">
                  No teachers on the roster yet.
                </Typography>
              ) : null}
              {team.map((teacher) => (
                <Stack key={teacher.id} direction="row" spacing={2} alignItems="center">
                  <Avatar src={teacher.image ?? undefined} alt={teacher.name}>
                    {teacher.name.charAt(0)}
                  </Avatar>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {teacher.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {teacher.headline || "Profile not completed"} · {teacher.levelName}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="subtitle2" fontWeight={600}>
                      {teacher.ratingCount ? `${teacher.ratingAverage.toFixed(1)} ★` : "No ratings"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {teacher.classesTaught} classes
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Your queue" subtitle="Items you can resolve as a manager">
            <Stack spacing={2.5}>
              {!attention.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing waiting on you right now.
                </Typography>
              ) : null}
              {attention.map((item) => (
                <Box key={item.id} component="a" href={item.href} sx={{ color: "inherit", textDecoration: "none" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.detail}
                      </Typography>
                    </Box>
                    <Chip
                      label={item.severity}
                      size="small"
                      color={
                        item.severity === "high" ? "error" : item.severity === "normal" ? "warning" : "default"
                      }
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Academy schedule"
            subtitle="Headline counts — open Calendar to filter by teacher"
            action={
              <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.light", color: "primary.main" }}>
                <IconVideo size={20} />
              </Avatar>
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Reschedules inside the policy window are automatic. Paired class proposals appear under Rooms.
              </Typography>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Scheduled this week
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {operations.classesThisWeek}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Upcoming (all)
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {operations.upcoming}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Delivered this week
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {operations.deliveredThisWeek}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Open paired change requests
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {operations.pendingChangeRequests}
                </Typography>
              </Stack>
              <LinkButton
                href="/apps/calendar"
                size="small"
                endIcon={<IconArrowRight size={14} />}
                sx={{ alignSelf: "flex-start", px: 0 }}
              >
                Open calendar
              </LinkButton>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Billing & payouts"
            subtitle="Paid orders, credits, and teacher earnings you prepare"
            action={
              <Avatar sx={{ width: 38, height: 38, bgcolor: "success.light", color: "success.main" }}>
                <IconReceipt2 size={20} />
              </Avatar>
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Revenue and teacher pay come from paid orders and delivered classes. Payout batches are sent to the admin
                for approval and payment.
              </Typography>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Paid checkout revenue
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatUsd(billing.revenueCents)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Paid orders
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {billing.paidOrders}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Credits outstanding
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {billing.creditsOutstanding}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Teacher earnings this month
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatUsd(billing.teacherEarnedThisMonthCents)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Not in a payout batch yet
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatUsd(billing.teacherUnbatchedCents)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <LinkButton href="/manager/billing" size="small" sx={{ px: 0 }}>
                  Billing
                </LinkButton>
                <LinkButton href="/manager/payouts" size="small" endIcon={<IconArrowRight size={14} />} sx={{ px: 0 }}>
                  Prepare payouts
                </LinkButton>
              </Stack>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}