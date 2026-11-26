"use client";

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import type { AiCostMonth } from "@/server/ai/cost-report";

/** Admin → packages: Claude's real cost vs AI credits sold, by month. */
export function AiCostReportCard({ months }: { months: AiCostMonth[] }) {
  const t = useTranslations("admin.aiCost");
  const format = useFormatter();
  const money = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /** Claude costs are often fractions of a cent: up to 4 decimals so they don't read as $0.00. */
  const cost = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const monthLabel = (month: string) =>
    format.dateTime(new Date(`${month}-15T12:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <SectionCard title={t("title")} subtitle={t("subtitle")}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("month")}</TableCell>
              <TableCell align="right">{t("conversations")}</TableCell>
              <TableCell align="right">{t("freeCost")}</TableCell>
              <TableCell align="right">{t("paidCost")}</TableCell>
              <TableCell align="right">{t("summaryCost")}</TableCell>
              <TableCell align="right">{t("revenue")}</TableCell>
              <TableCell align="right">{t("fees")}</TableCell>
              <TableCell align="right">{t("margin")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {months.map((row) => (
              <TableRow key={row.month}>
                <TableCell sx={{ textTransform: "capitalize" }}>{monthLabel(row.month)}</TableCell>
                <TableCell align="right">
                  {t("conversationsValue", { free: row.freeConversations, paid: row.paidConversations })}
                </TableCell>
                <TableCell align="right">{cost(row.freeCostCents)}</TableCell>
                <TableCell align="right">{cost(row.paidCostCents)}</TableCell>
                <TableCell align="right">{cost(row.summaryCostCents)}</TableCell>
                <TableCell align="right">{money(row.revenueCents)}</TableCell>
                <TableCell align="right">{money(row.feeCents)}</TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, color: row.marginCents < 0 ? "error.main" : "success.dark" }}
                >
                  {cost(row.marginCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
        {t("note")}
      </Typography>
    </SectionCard>
  );
}
