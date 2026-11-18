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
import { useLocale, useTranslations } from "next-intl";
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

export function OrganizationManagersOverview({ managers, invitations, mailFromName }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const inviteDate = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
        title={t("common.page.managers")}
        subtitle={t("organization.managers.subtitle")}
        items={adminBreadcrumb(t, t("common.section.organization"), t("common.page.managers"), "/admin/organization/managers")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("organization.managers.notice")}
      </Alert>

      <Box sx={{ mb: 3 }}>
        <SectionCard
          title={t("organization.managers.pending")}
          subtitle={t("organization.managers.pendingSubtitle")}
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={t("organization.managers.inviteByEmail")}>
                <IconButton
                  aria-label={t("organization.managers.inviteManagerByEmail")}
                  color="primary"
                  size="small"
                  onClick={() => setInviteOpen(true)}
                >
                  <IconMail size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("organization.managers.promoteExisting")}>
                <IconButton
                  aria-label={t("organization.managers.promoteVerifiedUser")}
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
                {t("organization.managers.pendingEmpty")}
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
                    {t("organization.managers.sentExpires", {
                      sent: inviteDate.format(new Date(invite.createdAt)),
                      expires: inviteDate.format(new Date(invite.expiresAt)),
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
                    label={t(
                      invite.status === "pending"
                        ? "common.pending"
                        : "common.expired",
                    )}
                    color={invite.status === "pending" ? "warning" : "default"}
                  />
                  {invite.status === "pending" ? (
                    <Button
                      size="small"
                      color="inherit"
                      disabled={pending}
                      onClick={() => run(() => revokeManagerInvitationAction(invite.id))}
                    >
                      {t("organization.managers.revoke")}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      <SectionCard
        title={t("organization.managers.active")}
        subtitle={t("organization.managers.activeSubtitle")}
      >
        <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {managers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("organization.managers.activeEmpty")}
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
                  {t("organization.managers.managerSince", { date: manager.since })}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={t(
                    manager.status === "Active" ? "common.active" : "common.suspended",
                  )}
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
                  {t("organization.managers.removeAccess")}
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      <Dialog open={inviteOpen} onClose={closeInvite} fullWidth maxWidth="sm">
        <DialogTitle>{t("organization.managers.inviteByEmail")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("organization.managers.inviteDialogHelp")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t("common.email")}
              type="email"
              size="small"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label={t("organization.managers.noteLabel")}
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
            {t("common.cancel")}
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
            {t("organization.managers.sendInvitation")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={promoteOpen} onClose={closePromote} fullWidth maxWidth="sm">
        <DialogTitle>{t("organization.managers.promoteExisting")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("organization.managers.promoteDialogHelp")}
          </Typography>
          <TextField
            label={t("organization.managers.verifiedEmail")}
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
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={pending || !promoteEmail.trim()}
            onClick={() => run(() => promoteManagerByEmailAction(promoteEmail), closePromote)}
          >
            {t("organization.managers.grantRole")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
