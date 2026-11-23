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
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
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
  const t = useTranslations("educator");
  const locale = useLocale();
  const [listPage, setListPage] = useState(1);
  const pagedEarnings = useMemo(
    () => sliceForPage(props.earnings, listPage, DEFAULT_PAGE_SIZE),
    [props.earnings, listPage],
  );
  const money = useMemo(
    () => (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100),
    [locale],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale],
  );

  const statusChip = useMemo(() => ({
    unpaid: { label: t("status.unpaid"), color: "default" as const },
    "in-batch": { label: t("status.inPayout"), color: "warning" as const },
    paid: { label: t("status.paid"), color: "success" as const },
  }), [t]);

  const monthStart = new Date(props.monthStart).getTime();
  const thisMonth = props.earnings
    .filter((item) => new Date(item.classEndedAt).getTime() >= monthStart)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const unpaid = props.earnings.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0);
  const paid = props.earnings.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <Box>
      <Breadcrumb
        title={t("common.earnings")}
        subtitle={t("teacher.earnings.subtitle")}
        items={[{ title: t("shell.roles.teacher"), to: "/teacher" }, { title: t("common.earnings") }]}
      />

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label={t("teacher.earnings.thisMonth")} value={money(thisMonth)} helper={t("teacher.earnings.deliveredClasses")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label={t("teacher.earnings.notPaidYet")} value={money(unpaid)} helper={t("teacher.earnings.requestWhenReady")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat label={t("teacher.earnings.paid")} value={money(paid)} helper={t("teacher.earnings.allTime")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Stat
            label={t("teacher.earnings.rating")}
            value={props.ratingCount ? `${props.ratingAverage.toFixed(1)}★` : "—"}
            helper={t("teacher.earnings.ratingHelper", { count: props.ratingCount, classes: props.classesTaught })}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title={t("teacher.earnings.classes")}>
            {props.earnings.length ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("common.date")}</TableCell>
                      <TableCell>{t("teacher.earnings.class")}</TableCell>
                      <TableCell align="right">{t("common.amount")}</TableCell>
                      <TableCell>{t("common.status")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedEarnings.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{dateFormat.format(new Date(item.classEndedAt))}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.topic}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("teacher.dashboard.minutes", { count: item.durationMinutes })} ·{" "}
                            {t(`classType.${item.classType === "paired" ? "paired" : "individual"}`)} ·{" "}
                            {t("teacher.earnings.level", { level: item.level })}
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
              <Typography color="text.secondary">{t("teacher.earnings.noDeliveredClasses")}</Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              title={props.levelName}
              subtitle={t("teacher.earnings.youKeep", {
                teacherPercent: props.teacherSharePercent,
                platformPercent: props.platformTakePercent,
              })}
            >
              <Stack spacing={1}>
                <Typography variant="body2">
                  {t("teacher.earnings.exampleCredit", {
                    credit: money(props.exampleCreditCents),
                    earned: money(Math.round((props.exampleCreditCents * props.teacherSharePercent) / 100)),
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("teacher.earnings.actualPay")}
                </Typography>
                {props.nextLevel ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.earnings.nextLevel", {
                      name: props.nextLevel.name,
                      classes: props.nextLevel.classes,
                      ratings: props.nextLevel.ratings,
                      rating: props.nextLevel.rating,
                    })}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.earnings.topLevel")}
                  </Typography>
                )}
              </Stack>
            </SectionCard>
            <SectionCard title={t("teacher.earnings.badges")}>
              {props.badges.length ? (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {props.badges.map((badge) => (
                    <Chip key={badge.id} color="primary" variant="outlined" label={badge.label} title={badge.description} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("teacher.earnings.firstBadge")}
                </Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
