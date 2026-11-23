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
  IconMail,
  IconShieldCheck,
  IconVideo,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useTranslations } from "next-intl";
import { classTypeLabel } from "@/lib/class-type-label";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { buildAcademyComposeUrl } from "@/lib/academy-contact";
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

const statusKeys: Record<
  LiveClassStatus,
  "status.upcoming" | "status.inProgress" | "status.completed" | "status.canceled"
> = {
  upcoming: "status.upcoming",
  "in-progress": "status.inProgress",
  completed: "status.completed",
  canceled: "status.canceled",
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
  /** Signed-in user, so each card can say who the class is with. */
  viewerId?: string;
  /** Students: who to write to about a change outside the window (opens the site's Email). */
  support?: { email: string; name: string; fromName: string } | null;
};

/** Classes shown per page in each status tab. */
const CLASSES_PER_PAGE = 5;

export function ClassesOverview({
  policy,
  items,
  now,
  viewMode = "student",
  credits,
  viewerId,
  support = null,
}: ClassesOverviewProps) {
  const [tab, setTab] = useState<LiveClassStatus>("upcoming");
  const [page, setPage] = useState(1);
  const t = useTranslations("student");
  const statusLabels: Record<LiveClassStatus, string> = {
    upcoming: t(statusKeys.upcoming),
    "in-progress": t(statusKeys["in-progress"]),
    completed: t(statusKeys.completed),
    canceled: t(statusKeys.canceled),
  };

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

  // A page left past the end (e.g. a class changed tab) falls back to the last one.
  const pageCount = Math.max(1, Math.ceil(visible.length / CLASSES_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * CLASSES_PER_PAGE, currentPage * CLASSES_PER_PAGE);

  const totalCredits = (credits ?? []).reduce(
    (sum, item) => sum + item.balance,
    0,
  );

  return (
    <Box>
      <Breadcrumb
        title={
          viewMode === "staff"
            ? t("classes.overview.staffTitle")
            : t("classes.overview.title")
        }
        subtitle={
          viewMode === "staff"
            ? t("classes.overview.staffSubtitle")
            : t("classes.overview.subtitle")
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
          {/* 15px on each side (30px in total per axis); MUI adds extra bottom padding to the last CardContent otherwise. */}
          <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
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
                      {t("classes.overview.creditsLeft", { count: totalCredits })}
                    </Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" mt={0.75}>
                      {credits.length ? (
                        credits.map((item) => (
                          <Chip
                            key={`${item.classType}-${item.durationMinutes}`}
                            size="small"
                            variant="outlined"
                            label={t("classes.overview.creditChip", {
                              minutes: item.durationMinutes,
                              type: classTypeLabel(item.classType, t),
                              balance: item.balance,
                              shared: item.shared ? t("classes.overview.shared") : "",
                            })}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t("classes.overview.noCredits")}
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
                    href="/classes?tab=book"
                    variant="contained"
                    startIcon={<IconCalendarPlus size={18} />}
                  >
                    {t("actions.bookClass")}
                  </LinkButton>
                  <LinkButton
                    href="/credits?tab=buy"
                    variant="outlined"
                    startIcon={<IconCreditCard size={18} />}
                  >
                    {t("actions.viewPlans")}
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
              <Box sx={{ px: 2 }}>
                <Tabs
                  value={tab}
                  onChange={(_, value: LiveClassStatus) => {
                    setTab(value);
                    setPage(1);
                  }}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  aria-label={t("classes.overview.statusAria")}
                >
                  {statusOrder.map((status) => (
                    <Tab
                      key={status}
                      value={status}
                      label={t("classes.overview.statusTab", {
                        status: statusLabels[status],
                        count: counts[status],
                      })}
                    />
                  ))}
                </Tabs>
              </Box>
            </Card>

            {visible.length ? (
              <Stack spacing={2}>
                {pageItems.map((item) => (
                  <ClassListCard
                    key={item.id}
                    item={item}
                    now={now}
                    policy={policy}
                    viewerId={viewerId}
                  />
                ))}
                <ListPagination
                  page={currentPage}
                  total={visible.length}
                  pageSize={CLASSES_PER_PAGE}
                  onPageChange={(next) => {
                    setPage(next);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </Stack>
            ) : (
              <Card elevation={9}>
                <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
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
                    {t("classes.overview.emptyTitle", {
                      status: statusLabels[tab].toLowerCase(),
                    })}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mt={1}
                    mb={2.5}
                  >
                    {tab === "upcoming"
                      ? t("classes.overview.emptyUpcoming")
                      : t("classes.overview.emptyOther")}
                  </Typography>
                  {tab === "upcoming" || tab === "canceled" ? (
                    <LinkButton href="/classes?tab=book" variant="contained">
                      {t("actions.bookClass")}
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
              padding="15px"
              title={t("classes.overview.policyTitle")}
              subtitle={t("classes.overview.policySubtitle")}
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
                    {t("classes.overview.cancellations")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.overview.cancellationsBody", {
                      hours: policy.cancelCutoffHours,
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t("classes.overview.rescheduling")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.overview.reschedulingBody", {
                      hours: policy.rescheduleCutoffHours,
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t("classes.overview.joinWindow")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.overview.joinWindowBody", {
                      before: policy.joinWindowBeforeMinutes,
                      after: policy.joinWindowAfterMinutes,
                    })}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t("classes.overview.credits")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("classes.overview.creditsBody", {
                      hours: policy.cancelCutoffHours,
                    })}
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>

            <SectionCard
              padding="15px"
              title={t("classes.overview.atGlance")}
              subtitle={t("classes.overview.yourActivity")}
              action={
                <Chip
                  label={t("classes.overview.total", { count: items.length })}
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

            {support ? (
              <SectionCard
                padding="15px"
                title={t("classes.overview.needHand")}
                subtitle={t("classes.overview.hereToHelp")}
              >
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
                      {t("classes.overview.outsideWindow")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {t("classes.overview.outsideWindowBody")}
                    </Typography>
                    <LinkButton
                      href={buildAcademyComposeUrl({
                        to: support.email,
                        recipientName: support.name,
                        fromName: support.fromName,
                        topic: t("classes.overview.supportTopic"),
                      })}
                      size="small"
                      variant="contained"
                      sx={{ mt: 1.5 }}
                      startIcon={<IconMail size={16} />}
                      endIcon={null}
                    >
                      {t("classes.overview.writeAcademy")}
                    </LinkButton>
                  </Box>
                </Stack>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
