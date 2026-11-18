"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { shiftUtcMonth } from "@/lib/payout-month";

type Props = {
  month: string;
  minMonth: string;
  /** Latest month the user can view (inclusive) — typically the current UTC month. */
  maxMonth: string;
  onMonthChange: (month: string) => void;
  paidCents: number;
  pendingCents: number;
};

export function PayoutMonthNav({ month, minMonth, maxMonth, onMonthChange, paidCents, pendingCents }: Props) {
  const t = useTranslations("educator.payouts.monthNav");
  const locale = useLocale();
  const atLatest = month >= maxMonth;
  const atEarliest = month <= minMonth;

  const money = useMemo(
    () => (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100),
    [locale],
  );
  const monthTitle = (value: string) => {
    const [year, number] = value.split("-").map(Number);
    if (!year || !number) return value;
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, number - 1, 1)),
    );
  };

  return (
    <SectionCard title={t("title")} subtitle={t("subtitle")}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
          <IconButton
            aria-label={t("previous")}
            disabled={atEarliest}
            onClick={() => !atEarliest && onMonthChange(shiftUtcMonth(month, -1))}
          >
            <IconChevronLeft size={20} />
          </IconButton>
          <Typography variant="h5" fontWeight={700} minWidth={200} textAlign="center">
            {monthTitle(month)}
          </Typography>
          <IconButton
            aria-label={t("next")}
            disabled={atLatest}
            onClick={() => !atLatest && onMonthChange(shiftUtcMonth(month, 1))}
          >
            <IconChevronRight size={20} />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} justifyContent="center" textAlign="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("paidThisMonth")}
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {money(paidCents)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("awaitingPayment")}
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {money(pendingCents)}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
