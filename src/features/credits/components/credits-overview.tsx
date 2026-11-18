"use client";

import Link from "next/link";
import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { ClassType } from "@/features/academy/data";
import { formatClassType } from "@/features/classes/format";

const PAGE_SIZE = 10;

export type CreditBalanceView = {
  classType: ClassType;
  durationMinutes: number;
  balance: number;
  shared: boolean;
};

export type CreditMovementView = {
  id: string;
  delta: number;
  reason: "purchase" | "grant" | "booking" | "refund" | "adjustment";
  classType: ClassType;
  durationMinutes: number;
  shared: boolean;
  note: string | null;
  sessionId: string | null;
  createdAt: string;
};

export type OrderView = {
  id: string;
  classType: ClassType;
  durationMinutes: number;
  credits: number;
  totalCents: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
};

type CreditsOverviewProps = {
  balances: CreditBalanceView[];
  history: CreditMovementView[];
  orders: OrderView[];
  timeZone: string;
};

/** The student's class credits: balances, every movement, and purchases. */
export function CreditsOverview({ balances, history, orders, timeZone }: CreditsOverviewProps) {
  const t = useTranslations("student.learn.credits");
  const tStudent = useTranslations("student");
  const format = useFormatter();
  const [page, setPage] = useState(0);
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone });
  const kind = (item: { classType: ClassType; durationMinutes: number }) =>
    `${formatClassType(item.classType, tStudent)} · ${tStudent("common.minutes", { count: item.durationMinutes })}`;
  const total = balances.reduce((sum, item) => sum + item.balance, 0);

  return (
    <Box mt={3}>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={9} sx={{ height: "100%" }}>
            <CardContent sx={{ p: "30px" }}>
              <Typography variant="body2" color="text.secondary">
                {t("available")}
              </Typography>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {total}
              </Typography>
              <Stack direction="row" spacing={1} mt={2}>
                <LinkButton href="/pricing" variant="contained" size="small">
                  {t("buy")}
                </LinkButton>
                <LinkButton href="/schedule" variant="outlined" size="small">
                  {t("book")}
                </LinkButton>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title={t("byKind")}>
            {balances.length ? (
              <Stack spacing={1.25}>
                {balances.map((item) => (
                  <Stack
                    key={`${item.classType}-${item.durationMinutes}-${item.shared}`}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1">{kind(item)}</Typography>
                      {item.shared ? <Chip size="small" variant="outlined" label={t("shared")} /> : null}
                    </Stack>
                    <Typography variant="h6">{t("credits", { count: item.balance })}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t("noBalances")}</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard title={t("historyTitle")} subtitle={t("historySubtitle")}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("date")}</TableCell>
                    <TableCell>{t("movement")}</TableCell>
                    <TableCell>{t("kind")}</TableCell>
                    <TableCell align="right">{t("change")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{date(item.createdAt)}</TableCell>
                      <TableCell>
                        {t(`reason.${item.reason}`)}
                        {item.sessionId ? (
                          <>
                            {" · "}
                            <Typography
                              component={Link}
                              href={`/classes/${item.sessionId}`}
                              variant="body2"
                              color="primary"
                              sx={{ textDecoration: "none" }}
                            >
                              {t("seeClass")}
                            </Typography>
                          </>
                        ) : null}
                        {item.note ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.note}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {kind(item)}
                        {item.shared ? ` · ${t("shared")}` : ""}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={item.delta > 0 ? "success.main" : "error.main"}
                        >
                          {item.delta > 0 ? `+${item.delta}` : item.delta}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!history.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography color="text.secondary" py={2}>
                          {t("noHistory")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
            {history.length > PAGE_SIZE ? (
              <TablePagination
                component="div"
                count={history.length}
                page={page}
                onPageChange={(_, value) => setPage(value)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[]}
                labelDisplayedRows={({ from, to, count }) => t("pagination", { from, to, count })}
              />
            ) : null}
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard title={t("ordersTitle")}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("date")}</TableCell>
                    <TableCell>{t("package")}</TableCell>
                    <TableCell align="right">{t("total")}</TableCell>
                    <TableCell>{t("status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{date(order.createdAt)}</TableCell>
                      <TableCell>
                        {t("credits", { count: order.credits })} · {kind(order)}
                      </TableCell>
                      <TableCell align="right">
                        {format.number(order.totalCents / 100, { style: "currency", currency: order.currency })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={order.status === "paid" ? "success" : order.status === "pending" ? "warning" : "default"}
                          label={t(`orderStatus.${order.status}`)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!orders.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography color="text.secondary" py={2}>
                          {t("noOrders")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
