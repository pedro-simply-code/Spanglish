"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { IconMail, IconUserPlus } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AcademyContactButton } from "@/components/ui/academy-contact-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  inviteManagerAction,
  promoteManagerByEmailAction,
  revokeManagerInvitationAction,
  revokeManagerRoleAction,
} from "@/features/admin/actions/manager-access";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { ManagerAccount } from "@/features/admin/types";
import type { ManagerInvitationRow } from "@/server/admin/manager-access";
import { useAppToast } from "@/lib/use-app-toast";

type Props = {
  managers: ManagerAccount[];
  invitations: ManagerInvitationRow[];
  mailFromName: string;
};

const inviteDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function OrganizationManagersOverview({ managers, invitations, mailFromName }: Props) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");

  const run = (task: () => Promise<{ ok: boolean; message: string }>, onSuccess?: () => void) =>
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
        title="Managers"
        subtitle="Invitations notify the academy inbox inside the app — not Gmail. Invitees accept at /join/manager."
        items={adminBreadcrumb("Organization", "Managers", "/admin/organization/managers")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Managers cannot self-serve: invite via the in-app Email inbox or promote an existing verified account. Teacher applications
        stay on the applications page — this flow is for operations leads only.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <SectionCard
          title="Pending invitations"
          subtitle="Open invites expire after 14 days"
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Invite by email">
                <IconButton
                  aria-label="Invite manager by email"
                  color="primary"
                  size="small"
                  onClick={() => setInviteOpen(true)}
                >
                  <IconMail size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Promote existing user">
                <IconButton
                  aria-label="Promote verified user to manager"
                  color="primary"
                  size="small"
                  onClick={() => setPromoteOpen(true)}
                >
                  <IconUserPlus size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        >
          <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
            {invitations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending invitations. Use the mail or user icon above to invite or promote.
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
                      onClick={() => run(() => revokeManagerInvitationAction(invite.id))}
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

      <SectionCard title="Active managers" subtitle="Remove access returns the account to student.">
        <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {managers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No managers yet. Invite someone or promote an existing user.
            </Typography>
          ) : null}
          {managers.map((manager) => (
            <Stack
              key={manager.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {manager.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Manager since {manager.since}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={manager.status}
                  color={manager.status === "Active" ? "success" : "warning"}
                  size="small"
                />
                <AcademyContactButton
                  to={manager.email}
                  recipientName={manager.name}
                  fromName={mailFromName}
                  topic="operations"
                />
                <Button
                  size="small"
                  color="error"
                  disabled={pending}
                  onClick={() => run(() => revokeManagerRoleAction(manager.id))}
                >
                  Remove access
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      <Dialog open={inviteOpen} onClose={closeInvite} fullWidth maxWidth="sm">
        <DialogTitle>Invite by email</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If they already have an account, they get this in Email in the app. Otherwise they register with this address first.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              size="small"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Note to invitee (optional)"
              size="small"
              value={inviteNote}
              onChange={(event) => setInviteNote(event.target.value)}
              multiline
              minRows={3}
              fullWidth
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
              run(
                () => inviteManagerAction({ email: inviteEmail, note: inviteNote || undefined }),
                closeInvite,
              )
            }
          >
            Send invitation
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={promoteOpen} onClose={closePromote} fullWidth maxWidth="sm">
        <DialogTitle>Promote existing user</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The account must already exist with a verified email. The manager role is granted immediately.
          </Typography>
          <TextField
            label="Verified account email"
            type="email"
            size="small"
            value={promoteEmail}
            onChange={(event) => setPromoteEmail(event.target.value)}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePromote} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={pending || !promoteEmail.trim()}
            onClick={() => run(() => promoteManagerByEmailAction(promoteEmail), closePromote)}
          >
            Grant manager role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}