"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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

const kindOptions = [
  { value: "one-on-one-25", label: "Individual · 25 min" },
  { value: "one-on-one-50", label: "Individual · 50 min" },
  { value: "paired-25", label: "Paired · 25 min" },
  { value: "paired-50", label: "Paired · 50 min" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type GrantForm = { email: string; kind: string; amount: string; note: string };

export function StudentsCreditsOverview({ students, pairs, orders, breadcrumbRoot, mailFromName }: Props) {
  const router = useRouter();
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
        title="Students and credits"
        subtitle={`${students.length} students · ${pairs.length} active pair${pairs.length === 1 ? "" : "s"}`}
        items={[breadcrumbRoot, { title: "Students and credits" }]}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="contained"
            startIcon={<IconCoins size={16} />}
            onClick={() => openGrant()}
          >
            Grant credits
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconUsersGroup size={16} />}
            onClick={() => setPairsOpen(true)}
          >
            Pairs ({pairs.length})
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconReceipt size={16} />}
            onClick={() => setOrdersOpen(true)}
          >
            Purchases ({orders.length})
          </Button>
        </Stack>
      </Breadcrumb>

      <SectionCard
        title="Roster"
        subtitle="Search and adjust credits per student."
        action={
          <TextField
            size="small"
            placeholder="Search name or email"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Partner</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No students match this search.
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
                              label={`${classTypeLabel(item.classType)} ${item.durationMinutes}′: ${item.balance}`}
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
                        topic="classes and credits"
                      />
                      <Button size="small" variant="outlined" onClick={() => openGrant(student.email)}>
                        Grant
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
        <DialogTitle>Grant or remove credits</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <Typography variant="body2" color="text.secondary">
              Use a negative amount to remove credits. The note appears in the student history.
            </Typography>
            <TextField
              label="Student email"
              value={grant.email}
              onChange={(event) => setGrant({ ...grant, email: event.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Class type"
              value={grant.kind}
              onChange={(event) => setGrant({ ...grant, kind: event.target.value })}
              fullWidth
            >
              {kindOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Credits"
              value={grant.amount}
              onChange={(event) => setGrant({ ...grant, amount: event.target.value })}
              fullWidth
            />
            <TextField
              label="Note (optional)"
              value={grant.note}
              onChange={(event) => setGrant({ ...grant, note: event.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={pending || !grant.email} onClick={submitGrant}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pairsOpen} onClose={() => setPairsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Paired students</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Paired students share one credit pool and can book paired classes together.
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
                      Since {dateFormat.format(new Date(pair.createdAt))}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    disabled={pending}
                    onClick={() => run(() => endPairAction(pair.id))}
                  >
                    End
                  </Button>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" mb={2}>
              No active pairs.
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" mb={1.5}>
            Pair two unpaired students
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Student A"
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
              label="Student B"
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
          <Button onClick={() => setPairsOpen(false)}>Close</Button>
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
            Pair students
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ordersOpen} onClose={() => setOrdersOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Recent package purchases</DialogTitle>
        <DialogContent dividers>
          {orders.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Package</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.buyerName}</TableCell>
                    <TableCell>
                      {order.credits} × {classTypeLabel(order.classType)} {order.durationMinutes}′
                      {order.provider === "demo" ? " · demo" : order.provider === "stripe" ? " · Stripe" : ""}
                    </TableCell>
                    <TableCell>{dateFormat.format(new Date(order.createdAt))}</TableCell>
                    <TableCell align="right">{money.format(order.totalCents / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No purchases yet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrdersOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}