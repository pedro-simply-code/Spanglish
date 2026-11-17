"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { SectionCard } from "@/components/ui/section-card";
import { shiftUtcMonth } from "@/lib/payout-month";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const monthTitle = (month: string) => {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value) return month;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, value - 1, 1)),
  );
};

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
  const atLatest = month >= maxMonth;
  const atEarliest = month <= minMonth;
  return (
    <SectionCard
      title="By month"
      subtitle="Teachers request payouts when they are ready — browse months to see what was paid or is still open."
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
          <IconButton
            aria-label="Previous month"
            disabled={atEarliest}
            onClick={() => !atEarliest && onMonthChange(shiftUtcMonth(month, -1))}
          >
            <IconChevronLeft size={20} />
          </IconButton>
          <Typography variant="h5" fontWeight={700} minWidth={200} textAlign="center">
            {monthTitle(month)}
          </Typography>
          <IconButton
            aria-label="Next month"
            disabled={atLatest}
            onClick={() => !atLatest && onMonthChange(shiftUtcMonth(month, 1))}
          >
            <IconChevronRight size={20} />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} justifyContent="center" textAlign="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              Paid this month
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {money(paidCents)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Awaiting payment
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