"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { savePayoutSettingsAction } from "@/features/payouts/actions";
import { teacherLevels } from "@/lib/teacher-levels";
import type { PayoutSettings } from "@/lib/teacher-pay";
import { teacherSharePercent } from "@/lib/teacher-pay";
import { useAppToast } from "@/lib/use-app-toast";

type Props = {
  settings: PayoutSettings;
  /** Teachers currently at each level (1–4). */
  teachersByLevel: Record<number, number>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const exampleCreditCents = 2_000;

export function TeacherRatesEditor({ settings, teachersByLevel }: Props) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    take1: String(settings.platformTakeLevel1),
    take2: String(settings.platformTakeLevel2),
    take3: String(settings.platformTakeLevel3),
    take4: String(settings.platformTakeLevel4),
    trial: String(settings.trialPercent),
    trial25: (settings.trialReference25Cents / 100).toFixed(2),
    trial50: (settings.trialReference50Cents / 100).toFixed(2),
  });

  const draft: PayoutSettings = {
    platformTakeLevel1: Number(form.take1) || 0,
    platformTakeLevel2: Number(form.take2) || 0,
    platformTakeLevel3: Number(form.take3) || 0,
    platformTakeLevel4: Number(form.take4) || 0,
    trialPercent: Number(form.trial) || 0,
    trialReference25Cents: Math.round(Number(form.trial25) * 100) || 0,
    trialReference50Cents: Math.round(Number(form.trial50) * 100) || 0,
  };

  const save = () =>
    startTransition(async () => {
      const result = await savePayoutSettingsAction(draft);
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box>
      <Breadcrumb
        title="Teacher pay rates"
        subtitle="Revenue share per delivered class: teachers keep the rest after the platform take."
        items={[
          { title: "Admin", to: "/admin" },
          { title: "Finance", to: "/admin/finance/payouts" },
          { title: "Teacher pay rates" },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard
            title="Revenue share"
            subtitle="Take rate is a % of the credit’s purchase value when the class is booked."
          >
            <Stack spacing={2}>
              <TextField
                label="Trial / demo payout"
                type="number"
                helperText="% of the normal teacher share when no student credit is used."
                value={form.trial}
                onChange={(event) => setForm({ ...form, trial: event.target.value })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
              <TextField
                label="Trial reference (25′)"
                type="number"
                helperText="Assumed credit value for trial math when no payment."
                value={form.trial25}
                onChange={(event) => setForm({ ...form, trial25: event.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              />
              <TextField
                label="Trial reference (50′)"
                type="number"
                value={form.trial50}
                onChange={(event) => setForm({ ...form, trial50: event.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              />
              <Typography variant="body2" color="text.secondary">
                Example: a {money(exampleCreditCents)} credit at level 1 ({draft.platformTakeLevel1}% platform take) pays the
                teacher {money(Math.round((exampleCreditCents * teacherSharePercent(draft.platformTakeLevel1)) / 100))}.
              </Typography>
              <Button variant="contained" onClick={save} disabled={pending}>
                Save rates
              </Button>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <SectionCard title="Platform take by level" subtitle="Lower take rewards established teachers (student credit value unchanged).">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Level</TableCell>
                  <TableCell>Needs</TableCell>
                  <TableCell align="right">Platform take</TableCell>
                  <TableCell align="right">Teacher on {money(exampleCreditCents)}</TableCell>
                  <TableCell align="right">Teachers</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teacherLevels.map((level) => {
                  const takeKey = `take${level.level}` as keyof typeof form;
                  const take = Number(form[takeKey]) || 0;
                  const share = teacherSharePercent(take);
                  return (
                    <TableRow key={level.level}>
                      <TableCell>
                        <Typography variant="subtitle2">{level.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {level.level === 1
                            ? "—"
                            : `${level.minClasses}+ classes, ${level.minRating}★ from ${level.minRatings}+ ratings`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={form[takeKey]}
                          onChange={(event) => setForm({ ...form, [takeKey]: event.target.value })}
                          slotProps={{
                            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            htmlInput: { style: { textAlign: "right", width: 64 } },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {share}% → {money(Math.round((exampleCreditCents * share) / 100))}
                      </TableCell>
                      <TableCell align="right">{teachersByLevel[level.level] ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Paired classes use the paired package’s credit value (one credit from the shared pool).
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}