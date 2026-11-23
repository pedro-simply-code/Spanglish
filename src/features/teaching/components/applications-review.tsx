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
import MaterialLink from "@mui/material/Link";
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
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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
  localizedCredentialTypeLabel,
  localizedFluencyLabel,
  localizedTeacherApplicationTracks,
  localizedTrackLabel,
  type TeacherApplicationCredential,
  type TeacherApplicationTrack,
  type TeacherFluencyLevel,
} from "@/lib/teacher-application";
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

const statusColor = {
  submitted: "warning",
  approved: "success",
  rejected: "error",
  withdrawn: "default",
} as const;

type StatusTab = "open" | "history";

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
  const t = useTranslations("educator");
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });

  if (!item) return null;
  const canReview = item.status === "submitted";
  const composeHref = `/apps/email?${new URLSearchParams({
    compose: "1",
    to: item.applicant.email,
    subject: t("applications.emailSubject"),
    body: t("applications.emailBody", {
      name: item.applicant.name,
      fromName: mailFromName ?? "Spanglish Academy",
    }),
  }).toString()}`;

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
          <Tooltip title={t("applications.contactApplicant")}>
            <IconButton
              component={Link}
              href={composeHref}
              size="small"
              aria-label={t("applications.contactApplicantNamed", { name: item.applicant.name })}
            >
              <IconMail size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="primary" variant="outlined" label={localizedTrackLabel(item.track, t)} />
            <Chip size="small" variant="outlined" label={localizedFluencyLabel(item.fluency, t)} />
            <Chip
              size="small"
              variant="outlined"
              label={t("applications.yearsTeaching", {
                count: item.yearsTeaching,
                plural: item.yearsTeaching === 1 ? "" : "s",
              })}
            />
            {item.taughtOnlineBefore ? <Chip size="small" color="info" label={t("applications.onlineExperience")} /> : null}
            {item.teaches.map((language) => (
              <Chip key={language} size="small" label={t(`applications.language.${language}`)} />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {t("applications.appliedOn", { date: dateFormat.format(new Date(item.createdAt)) })}
            </Typography>
            {item.country ? (
              <Typography variant="body2" color="text.secondary">
                · {item.country}
              </Typography>
            ) : null}
            <Chip size="small" color={statusColor[item.status]} label={t(`status.${item.status}`)} />
          </Stack>

          <Typography variant="subtitle1" fontWeight={600}>
            {item.headline}
          </Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {item.bio}
          </Typography>

          {item.fluency === "other" && item.fluencyNote ? (
            <Box>
              <Typography variant="subtitle2">{t("applications.fluencyNote")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.fluencyNote}
              </Typography>
            </Box>
          ) : null}

          <Box>
            <Typography variant="subtitle2">{t("applications.experience")}</Typography>
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
                {t("applications.watchVideo")}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                {item.videoUrl}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="warning.main">
              {t("applications.noVideo")}
            </Typography>
          )}

          {item.credentials.length > 0 ? (
            <Box>
              <Typography variant="subtitle2">{t("applications.credentials")}</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {item.credentials.map((cred, index) => (
                  <Typography key={`${item.id}-cred-${index}`} variant="body2">
                    {localizedCredentialTypeLabel(cred.type, t)} · {cred.label}
                    {cred.year ? ` (${cred.year})` : ""}
                    {cred.url ? (
                      <>
                        {" · "}
                        <MaterialLink href={cred.url} target="_blank" rel="noreferrer noopener">
                          {t("applications.view")}
                        </MaterialLink>
                      </>
                    ) : null}
                  </Typography>
                ))}
              </Stack>
            </Box>
          ) : null}

          {item.reviewNote ? (
            <Box>
              <Typography variant="subtitle2">{t("applications.reviewerNote")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.reviewNote}
              </Typography>
            </Box>
          ) : null}

          {canReview ? (
            <TextField
              size="small"
              fullWidth
              label={t("applications.noteToApplicant")}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          {t("applications.close")}
        </Button>
        {canReview ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              {t("applications.reject")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              {t("applications.approve")}
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
  const t = useTranslations("educator");
  const locale = useLocale();
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

  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });
  const tracks = localizedTeacherApplicationTracks(t);
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
    <Box>
      <Breadcrumb
        title={t("applications.title")}
        subtitle={t("applications.subtitle")}
        items={[breadcrumbRoot, { title: t("applications.applications") }]}
      />

      <Box sx={{ mb: 3 }}>
        <SectionCard
          title={t("applications.invitations")}
          subtitle={t("applications.invitationsSubtitle")}
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={t("applications.inviteToApply")}>
                <IconButton aria-label={t("applications.inviteByEmail")} color="primary" size="small" onClick={() => setInviteOpen(true)}>
                  <IconMail size={18} />
                </IconButton>
              </Tooltip>
              {canPromoteTeachers ? (
                <Tooltip title={t("applications.promoteVerified")}>
                  <IconButton
                    aria-label={t("applications.promoteUser")}
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
                {t("applications.noInvitations")}
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
                    {t("applications.sentExpires", {
                      sent: dateFormat.format(new Date(invite.createdAt)),
                      expires: dateFormat.format(new Date(invite.expiresAt)),
                    })}
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
                    label={t(`status.${invite.status}`)}
                    color={invite.status === "pending" ? "warning" : "default"}
                  />
                  {invite.status === "pending" ? (
                    <Button
                      size="small"
                      color="inherit"
                      disabled={pending}
                      onClick={() => runInvite(() => revokeTeacherInvitationAction(invite.id))}
                    >
                      {t("applications.revoke")}
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
        <Tab value="open" label={t("applications.waitingForReview", { count: openCount })} />
        <Tab value="history" label={t("applications.history")} />
      </Tabs>

      <SectionCard
        title={statusTab === "open" ? t("applications.openApplications") : t("applications.reviewedApplications")}
        subtitle={
          trackFilter
            ? t("applications.filtered", { track: localizedTrackLabel(trackFilter, t) })
            : t("applications.allTracks")
        }
        action={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="applications-track-filter">{t("applications.track")}</InputLabel>
            <Select
              labelId="applications-track-filter"
              label={t("applications.track")}
              value={trackFilter}
              onChange={(event) => {
                setTrackFilter(event.target.value as "" | TeacherApplicationTrack);
                setListPage(1);
              }}
            >
              <MenuItem value="">{t("applications.allTracks")}</MenuItem>
              {tracks.map((track) => (
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
                <TableCell>{t("applications.applicant")}</TableCell>
                <TableCell>{t("applications.track")}</TableCell>
                <TableCell>{t("applications.languages")}</TableCell>
                <TableCell>{t("applications.headline")}</TableCell>
                <TableCell>{t("applications.applied")}</TableCell>
                {statusTab === "history" ? <TableCell>{t("common.status")}</TableCell> : null}
                <TableCell align="right"> </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusTab === "history" ? 7 : 6}>
                    <Typography variant="body2" color="text.secondary">
                      {t("applications.noMatches")}
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
                    <Chip size="small" variant="outlined" label={localizedTrackLabel(item.track, t)} />
                  </TableCell>
                  <TableCell>
                    {item.teaches.map((language) => t(`applications.language.${language}`)).join(", ")}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={item.headline}>
                      {item.headline}
                    </Typography>
                  </TableCell>
                  <TableCell>{dateFormat.format(new Date(item.createdAt))}</TableCell>
                  {statusTab === "history" ? (
                    <TableCell>
                      <Chip size="small" color={statusColor[item.status]} label={t(`status.${item.status}`)} />
                    </TableCell>
                  ) : null}
                  <TableCell align="right">
                    <IconButton
                      aria-label={t("applications.reviewApplicant", { name: item.applicant.name })}
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
        <DialogTitle>{t("applications.promoteTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("applications.promoteHelp")}
            </Typography>
            <TextField
              autoFocus
              label={t("applications.accountEmail")}
              type="email"
              fullWidth
              value={promoteEmail}
              onChange={(event) => setPromoteEmail(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePromote} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={pending || !promoteEmail.trim()}
            onClick={() => runInvite(() => promoteTeacherByEmailAction(promoteEmail), closePromote)}
          >
            {t("applications.promote")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteOpen} onClose={closeInvite} fullWidth maxWidth="sm">
        <DialogTitle>{t("applications.inviteTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("applications.inviteHelp")}
            </Typography>
            <TextField
              autoFocus
              label={t("common.email")}
              type="email"
              fullWidth
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <TextField
              label={t("applications.noteToInvitee")}
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
            {t("common.cancel")}
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
            {t("applications.sendInvitation")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
