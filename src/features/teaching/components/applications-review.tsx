"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { IconEye, IconMail, IconUserPlus } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import {
  inviteTeacherApplicantAction,
  promoteTeacherByEmailAction,
  revokeTeacherInvitationAction,
  reviewApplicationAction,
} from "@/features/teaching/actions";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import {
  credentialTypes,
  fluencyLabel,
  teacherApplicationTracks,
  trackLabel,
  type TeacherApplicationCredential,
  type TeacherApplicationTrack,
  type TeacherFluencyLevel,
} from "@/lib/teacher-application";
import { AcademyContactButton } from "@/components/ui/academy-contact-button";
import { useAppToast } from "@/lib/use-app-toast";

export type TeacherInvitationListItem = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  inviteNote: string;
  createdAt: string;
  expiresAt: string;
};

export type ReviewApplication = {
  id: string;
  status: "submitted" | "approved" | "rejected" | "withdrawn";
  track: TeacherApplicationTrack;
  fluency: TeacherFluencyLevel;
  fluencyNote: string;
  yearsTeaching: number;
  taughtOnlineBefore: boolean;
  credentials: TeacherApplicationCredential[];
  headline: string;
  bio: string;
  country: string;
  teaches: string[];
  experience: string;
  videoUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  applicant: { name: string; email: string };
};

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const inviteDate = dateFormat;

const statusColor = {
  submitted: "warning",
  approved: "success",
  rejected: "error",
  withdrawn: "default",
} as const;

type StatusTab = "open" | "history";

function credentialTypeLabel(type: string) {
  return credentialTypes.find((item) => item.id === type)?.label ?? type;
}

function teachesLabel(teaches: string[]) {
  return teaches.map((language) => (language === "spanish" ? "Spanish" : "English")).join(", ");
}

function ApplicationDetailDialog({
  open,
  item,
  pending,
  note,
  onNoteChange,
  onClose,
  onApprove,
  onReject,
  mailFromName,
}: {
  open: boolean;
  item: ReviewApplication | null;
  pending: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  mailFromName?: string;
}) {
  if (!item) return null;
  const canReview = item.status === "submitted";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box>
            {item.applicant.name}
            <Typography variant="body2" color="text.secondary" fontWeight={400}>
              {item.applicant.email}
            </Typography>
          </Box>
          <AcademyContactButton
            to={item.applicant.email}
            recipientName={item.applicant.name}
            fromName={mailFromName}
            topic="teacher application"
          />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="primary" variant="outlined" label={trackLabel(item.track)} />
            <Chip size="small" variant="outlined" label={fluencyLabel(item.fluency)} />
            <Chip
              size="small"
              variant="outlined"
              label={`${item.yearsTeaching} yr${item.yearsTeaching === 1 ? "" : "s"} teaching`}
            />
            {item.taughtOnlineBefore ? <Chip size="small" color="info" label="Online experience" /> : null}
            {item.teaches.map((language) => (
              <Chip key={language} size="small" label={language === "spanish" ? "Spanish" : "English"} />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              Applied {dateFormat.format(new Date(item.createdAt))}
            </Typography>
            {item.country ? (
              <Typography variant="body2" color="text.secondary">
                · {item.country}
              </Typography>
            ) : null}
            <Chip size="small" color={statusColor[item.status]} label={item.status.replace("_", " ")} />
          </Stack>

          <Typography variant="subtitle1" fontWeight={600}>
            {item.headline}
          </Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {item.bio}
          </Typography>

          {item.fluency === "other" && item.fluencyNote ? (
            <Box>
              <Typography variant="subtitle2">Fluency note</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.fluencyNote}
              </Typography>
            </Box>
          ) : null}

          <Box>
            <Typography variant="subtitle2">Experience</Typography>
            <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">
              {item.experience}
            </Typography>
          </Box>

          {item.videoUrl ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                component="a"
                href={item.videoUrl}
                target="_blank"
                rel="noreferrer noopener"
                variant="outlined"
                size="small"
              >
                Watch intro video
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                {item.videoUrl}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="warning.main">
              No video link — required for conversation track.
            </Typography>
          )}

          {item.credentials.length > 0 ? (
            <Box>
              <Typography variant="subtitle2">Credentials</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {item.credentials.map((cred, index) => (
                  <Typography key={`${item.id}-cred-${index}`} variant="body2">
                    {credentialTypeLabel(cred.type)} · {cred.label}
                    {cred.year ? ` (${cred.year})` : ""}
                    {cred.url ? (
                      <>
                        {" · "}
                        <Link href={cred.url} target="_blank" rel="noreferrer noopener">
                          View
                        </Link>
                      </>
                    ) : null}
                  </Typography>
                ))}
              </Stack>
            </Box>
          ) : null}

          {item.reviewNote ? (
            <Box>
              <Typography variant="subtitle2">Reviewer note</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.reviewNote}
              </Typography>
            </Box>
          ) : null}

          {canReview ? (
            <TextField
              size="small"
              fullWidth
              label="Note to the applicant (optional)"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          Close
        </Button>
        {canReview ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              Reject
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              Approve
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

export function ApplicationsReview({
  applications,
  invitations,
  canPromoteTeachers,
  breadcrumbRoot,
  mailFromName,
}: {
  applications: ReviewApplication[];
  invitations: TeacherInvitationListItem[];
  canPromoteTeachers: boolean;
  breadcrumbRoot: { title: string; to: string };
  mailFromName?: string;
}) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [trackFilter, setTrackFilter] = useState<"" | TeacherApplicationTrack>("");
  const [listPage, setListPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const openCount = applications.filter((item) => item.status === "submitted").length;

  const filtered = useMemo(() => {
    let rows = applications;
    if (statusTab === "open") rows = rows.filter((item) => item.status === "submitted");
    else rows = rows.filter((item) => item.status !== "submitted");
    if (trackFilter) rows = rows.filter((item) => item.track === trackFilter);
    return rows;
  }, [applications, statusTab, trackFilter]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);
  const detail = detailId ? applications.find((item) => item.id === detailId) ?? null : null;

  const openDetail = (id: string, existingNote?: string | null) => {
    setDetailId(id);
    setNote(existingNote ?? "");
  };

  const review = (applicationId: string, approve: boolean) =>
    startTransition(async () => {
      const result = await reviewApplicationAction({ applicationId, approve, note });
      if (result.ok) {
        showSuccess({ message: result.message });
        setDetailId(null);
        setNote("");
        router.refresh();
      } else showError({ message: result.message });
    });

  const runInvite = (task: () => Promise<{ ok: boolean; message: string }>, onSuccess?: () => void) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        showSuccess({ message: result.message });
        onSuccess?.();
        router.refresh();
      } else showError({ message: result.message });
    });

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteNote("");
  };

  const closePromote = () => {
    setPromoteOpen(false);
    setPromoteEmail("");
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Teacher applications"
        subtitle="Invite candidates via in-app Email, then review their application here."
        items={[breadcrumbRoot, { title: "Applications" }]}
      />

      <Box sx={{ mb: 3 }}>
        <SectionCard
          title="Teacher invitations"
          subtitle="Open invites expire after 14 days — message includes a clickable /apply link."
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Invite to apply">
                <IconButton aria-label="Invite teacher by email" color="primary" size="small" onClick={() => setInviteOpen(true)}>
                  <IconMail size={18} />
                </IconButton>
              </Tooltip>
              {canPromoteTeachers ? (
                <Tooltip title="Promote verified student to teacher">
                  <IconButton
                    aria-label="Promote user to teacher"
                    color="primary"
                    size="small"
                    onClick={() => setPromoteOpen(true)}
                  >
                    <IconUserPlus size={18} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          }
        >
          <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
            {invitations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending invitations. Use the mail icon to invite someone to apply as a teacher.
              </Typography>
            ) : null}
            {invitations.map((invite) => (
              <Stack
                key={invite.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {invite.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sent {inviteDate.format(new Date(invite.createdAt))} · expires{" "}
                    {inviteDate.format(new Date(invite.expiresAt))}
                  </Typography>
                  {invite.inviteNote ? (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {invite.inviteNote}
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={invite.status}
                    color={invite.status === "pending" ? "warning" : "default"}
                  />
                  {invite.status === "pending" ? (
                    <Button
                      size="small"
                      color="inherit"
                      disabled={pending}
                      onClick={() => runInvite(() => revokeTeacherInvitationAction(invite.id))}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      <Tabs
        value={statusTab}
        onChange={(_, value: StatusTab) => {
          setStatusTab(value);
          setListPage(1);
        }}
        sx={{ mb: 2 }}
      >
        <Tab value="open" label={`Waiting for review (${openCount})`} />
        <Tab value="history" label="History" />
      </Tabs>

      <SectionCard
        title={statusTab === "open" ? "Open applications" : "Reviewed applications"}
        subtitle={
          trackFilter
            ? `Filtered: ${teacherApplicationTracks.find((t) => t.id === trackFilter)?.label ?? trackFilter}`
            : "All tracks"
        }
        action={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="applications-track-filter">Track</InputLabel>
            <Select
              labelId="applications-track-filter"
              label="Track"
              value={trackFilter}
              onChange={(event) => {
                setTrackFilter(event.target.value as "" | TeacherApplicationTrack);
                setListPage(1);
              }}
            >
              <MenuItem value="">All tracks</MenuItem>
              {teacherApplicationTracks.map((track) => (
                <MenuItem key={track.id} value={track.id}>
                  {track.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Applicant</TableCell>
                <TableCell>Track</TableCell>
                <TableCell>Languages</TableCell>
                <TableCell>Headline</TableCell>
                <TableCell>Applied</TableCell>
                {statusTab === "history" ? <TableCell>Status</TableCell> : null}
                <TableCell align="right"> </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusTab === "history" ? 7 : 6}>
                    <Typography variant="body2" color="text.secondary">
                      No applications match this view.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {pageRows.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{item.applicant.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.applicant.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={trackLabel(item.track)} />
                  </TableCell>
                  <TableCell>{teachesLabel(item.teaches)}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={item.headline}>
                      {item.headline}
                    </Typography>
                  </TableCell>
                  <TableCell>{dateFormat.format(new Date(item.createdAt))}</TableCell>
                  {statusTab === "history" ? (
                    <TableCell>
                      <Chip size="small" color={statusColor[item.status]} label={item.status} />
                    </TableCell>
                  ) : null}
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Review ${item.applicant.name}`}
                      size="small"
                      onClick={() => openDetail(item.id, item.reviewNote)}
                    >
                      <IconEye size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <ListPagination page={listPage} total={filtered.length} onPageChange={setListPage} />
      </SectionCard>

      <ApplicationDetailDialog
        open={Boolean(detail)}
        item={detail}
        pending={pending}
        note={note}
        onNoteChange={setNote}
        onClose={() => setDetailId(null)}
        onApprove={() => detail && review(detail.id, true)}
        onReject={() => detail && review(detail.id, false)}
        mailFromName={mailFromName}
      />

      <Dialog open={promoteOpen} onClose={closePromote} fullWidth maxWidth="sm">
        <DialogTitle>Promote to teacher</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Skips the application form. The account must be a verified student with no upcoming classes as a student.
            </Typography>
            <TextField
              autoFocus
              label="Account email"
              type="email"
              fullWidth
              value={promoteEmail}
              onChange={(event) => setPromoteEmail(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePromote} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={pending || !promoteEmail.trim()}
            onClick={() => runInvite(() => promoteTeacherByEmailAction(promoteEmail), closePromote)}
          >
            Promote
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteOpen} onClose={closeInvite} fullWidth maxWidth="sm">
        <DialogTitle>Invite to apply as teacher</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              If they already have a student account, the invite lands in Spanglish Email with a clickable link to /apply.
            </Typography>
            <TextField
              autoFocus
              label="Email"
              type="email"
              fullWidth
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <TextField
              label="Note to invitee (optional)"
              fullWidth
              multiline
              minRows={2}
              value={inviteNote}
              onChange={(event) => setInviteNote(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInvite} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={pending || !inviteEmail.trim()}
            onClick={() =>
              runInvite(
                () => inviteTeacherApplicantAction({ email: inviteEmail, note: inviteNote || undefined }),
                closeInvite,
              )
            }
          >
            Send invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}