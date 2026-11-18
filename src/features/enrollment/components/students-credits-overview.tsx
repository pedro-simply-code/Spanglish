"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isAppLocale } from "@/i18n/config";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconCoins, IconReceipt, IconUsersGroup } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AcademyContactButton } from "@/components/ui/academy-contact-button";
import { classTypeLabel } from "@/lib/class-type-label";
import { SectionCard } from "@/components/ui/section-card";
import {
  createPairAction,
  endPairAction,
  grantCreditsAction,
} from "@/features/enrollment/actions";
import { useAppToast } from "@/lib/use-app-toast";

export type StaffStudentRow = {
  id: string;
  name: string;
  email: string;
  partnerName: string | null;
  balances: { classType: "one-on-one" | "paired"; durationMinutes: number; balance: number; shared: boolean }[];
};

export type StaffPairRow = {
  id: string;
  createdAt: string;
  students: { id: string; name: string; email: string }[];
};

export type StaffOrderRow = {
  id: string;
  buyerName: string;
  classType: "one-on-one" | "paired";
  durationMinutes: number;
  credits: number;
  totalCents: number;
  provider: string;
  createdAt: string;
};

type Props = {
  students: StaffStudentRow[];
  pairs: StaffPairRow[];
  orders: StaffOrderRow[];
  breadcrumbRoot: { title: string; to: string };
  mailFromName?: string;
};

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const kindOptions: Array<{ value: string; labelKey: StudentKey }> = [
  { value: "one-on-one-25", labelKey: "credits.kind.individual25" },
  { value: "one-on-one-50", labelKey: "credits.kind.individual50" },
  { value: "paired-25", labelKey: "credits.kind.paired25" },
  { value: "paired-50", labelKey: "credits.kind.paired50" },
];

type GrantForm = { email: string; kind: string; amount: string; note: string };

export function StudentsCreditsOverview({ students, pairs, orders, breadcrumbRoot, mailFromName }: Props) {
  const router = useRouter();
  const t = useTranslations("student");
  const locale = useLocale();
  const appLocale = isAppLocale(locale) ? locale : defaultLocale;
  const intlLocale = appLocale === "es" ? "es-ES" : "en-US";
  const money = useMemo(
    () => new Intl.NumberFormat(intlLocale, { style: "currency", currency: "USD" }),
    [intlLocale],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric", year: "numeric" }),
    [intlLocale],
  );
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [pairsOpen, setPairsOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [pairForm, setPairForm] = useState({ a: "", b: "" });
  const [grant, setGrant] = useState<GrantForm>({ email: "", kind: "one-on-one-25", amount: "10", note: "" });

  const unpaired = students.filter((student) => !student.partnerName);
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return term
      ? students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(term))
      : students;
  }, [students, filter]);

  const run = (task: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        showSuccess({ message: result.message });
        after?.();
        router.refresh();
      } else {
        showError({ message: result.message });
      }
    });

  const openGrant = (email?: string) => {
    if (email) setGrant((prev) => ({ ...prev, email }));
    setGrantOpen(true);
  };

  const submitGrant = () => {
    const [classType, minutes] = [grant.kind.replace(/-\d+$/, ""), Number(grant.kind.split("-").pop())];
    run(
      () =>
        grantCreditsAction({
          studentEmail: grant.email,
          classType: classType as "one-on-one" | "paired",
          durationMinutes: minutes,
          amount: Number(grant.amount),
          note: grant.note,
        }),
      () => {
        setGrant((prev) => ({ ...prev, note: "" }));
        setGrantOpen(false);
      },
    );
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("credits.title")}
        subtitle={t("credits.subtitle", { students: students.length, pairs: pairs.length })}
        items={[breadcrumbRoot, { title: t("credits.title") }]}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="contained"
            startIcon={<IconCoins size={16} />}
            onClick={() => openGrant()}
          >
            {t("credits.grantCredits")}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconUsersGroup size={16} />}
            onClick={() => setPairsOpen(true)}
          >
            {t("credits.pairs", { count: pairs.length })}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconReceipt size={16} />}
            onClick={() => setOrdersOpen(true)}
          >
            {t("credits.purchases", { count: orders.length })}
          </Button>
        </Stack>
      </Breadcrumb>

      <SectionCard
        title={t("credits.rosterTitle")}
        subtitle={t("credits.rosterSubtitle")}
        action={
          <TextField
            size="small"
            placeholder={t("credits.searchPlaceholder")}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("credits.tableStudent")}</TableCell>
                <TableCell>{t("credits.tablePartner")}</TableCell>
                <TableCell>{t("credits.tableCredits")}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t("credits.noStudents")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {visible.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{student.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {student.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{student.partnerName ?? "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
                      {student.balances.length
                        ? student.balances.map((item) => (
                            <Chip
                              key={`${item.classType}-${item.durationMinutes}`}
                              size="small"
                              variant="outlined"
                              label={`${classTypeLabel(item.classType, t)} ${item.durationMinutes}′: ${item.balance}`}
                            />
                          ))
                        : "—"}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <AcademyContactButton
                        to={student.email}
                        recipientName={student.name}
                        fromName={mailFromName}
                        topic={t("credits.topic")}
                      />
                      <Button size="small" variant="outlined" onClick={() => openGrant(student.email)}>
                        {t("credits.grantAction")}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </SectionCard>

      <Dialog open={grantOpen} onClose={() => setGrantOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("credits.grantDialogTitle")}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <Typography variant="body2" color="text.secondary">
              {t("credits.grantHelp")}
            </Typography>
            <TextField
              label={t("credits.studentEmail")}
              value={grant.email}
              onChange={(event) => setGrant({ ...grant, email: event.target.value })}
              fullWidth
            />
            <TextField
              select
              label={t("credits.classType")}
              value={grant.kind}
              onChange={(event) => setGrant({ ...grant, kind: event.target.value })}
              fullWidth
            >
              {kindOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label={t("credits.creditsLabel")}
              value={grant.amount}
              onChange={(event) => setGrant({ ...grant, amount: event.target.value })}
              fullWidth
            />
            <TextField
              label={t("common.noteOptional")}
              value={grant.note}
              onChange={(event) => setGrant({ ...grant, note: event.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={pending || !grant.email} onClick={submitGrant}>
            {t("credits.apply")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pairsOpen} onClose={() => setPairsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("credits.pairedDialogTitle")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("credits.pairedHelp")}
          </Typography>
          {pairs.length ? (
            <Stack spacing={1} mb={2}>
              {pairs.map((pair) => (
                <Stack
                  key={pair.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={600}>
                      {pair.students.map((student) => student.name).join(" + ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("credits.since", { date: dateFormat.format(new Date(pair.createdAt)) })}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    disabled={pending}
                    onClick={() => run(() => endPairAction(pair.id))}
                  >
                    {t("credits.end")}
                  </Button>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t("credits.noPairs")}
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" mb={1.5}>
            {t("credits.pairTwo")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label={t("credits.studentA")}
              value={pairForm.a}
              onChange={(event) => setPairForm({ ...pairForm, a: event.target.value })}
              fullWidth
            >
              {unpaired.map((student) => (
                <MenuItem key={student.id} value={student.email}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("credits.studentB")}
              value={pairForm.b}
              onChange={(event) => setPairForm({ ...pairForm, b: event.target.value })}
              fullWidth
            >
              {unpaired
                .filter((student) => student.email !== pairForm.a)
                .map((student) => (
                  <MenuItem key={student.id} value={student.email}>
                    {student.name}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPairsOpen(false)}>{t("credits.close")}</Button>
          <Button
            variant="contained"
            disabled={pending || !pairForm.a || !pairForm.b}
            onClick={() =>
              run(
                () => createPairAction({ studentAEmail: pairForm.a, studentBEmail: pairForm.b }),
                () => setPairForm({ a: "", b: "" }),
              )
            }
          >
            {t("credits.pairStudents")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ordersOpen} onClose={() => setOrdersOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("credits.ordersTitle")}</DialogTitle>
        <DialogContent dividers>
          {orders.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("credits.buyer")}</TableCell>
                  <TableCell>{t("common.package")}</TableCell>
                  <TableCell>{t("credits.date")}</TableCell>
                  <TableCell align="right">{t("common.total")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.buyerName}</TableCell>
                    <TableCell>
                      {order.credits} × {classTypeLabel(order.classType, t)} {order.durationMinutes}′
                      {order.provider === "demo"
                        ? t("credits.demo")
                        : order.provider === "stripe"
                          ? t("credits.stripe")
                          : ""}
                    </TableCell>
                    <TableCell>{dateFormat.format(new Date(order.createdAt))}</TableCell>
                    <TableCell align="right">{money.format(order.totalCents / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t("credits.noPurchases")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrdersOpen(false)}>{t("credits.close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}