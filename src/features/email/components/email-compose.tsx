"use client";

import { forwardRef, useEffect, useState, type ReactElement, type Ref } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormLabel from "@mui/material/FormLabel";
import Slide from "@mui/material/Slide";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { TransitionProps } from "@mui/material/transitions";
import { RecipientEmailField } from "@/features/email/components/recipient-email-field";

export type EmailComposeInitial = {
  to?: string;
  subject?: string;
  body?: string;
};

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement<unknown> },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ComposeFormLabel = styled(FormLabel)(() => ({
  marginBottom: "5px",
  marginTop: "25px",
  display: "block",
  fontWeight: 600,
}));

type EmailComposeProps = {
  initial?: EmailComposeInitial | null;
  openOnMount?: boolean;
  draft?: EmailComposeInitial | null;
  onSend?: (input: { toEmail: string; subject: string; body: string }) => void;
  sendPending?: boolean;
};

export function EmailCompose({
  initial,
  openOnMount,
  draft,
  onSend,
  sendPending,
}: EmailComposeProps) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(initial?.to ?? "");
  const [toValid, setToValid] = useState<boolean | null>(null);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  useEffect(() => {
    if (initial) {
      setTo(initial.to ?? "");
      setSubject(initial.subject ?? "");
      setBody(initial.body ?? "");
    }
  }, [initial]);

  useEffect(() => {
    if (openOnMount) setOpen(true);
  }, [openOnMount]);

  useEffect(() => {
    if (draft) {
      setTo(draft.to ?? "");
      setSubject(draft.subject ?? "");
      setBody(draft.body ?? "");
      setOpen(true);
    }
  }, [draft]);

  const send = () => {
    if (!onSend) {
      setOpen(false);
      return;
    }
    onSend({ toEmail: to.trim(), subject: subject.trim(), body });
    setOpen(false);
  };

  return (
    <Box>
      <Box p={3} pb={1}>
        <Button variant="contained" fullWidth color="primary" onClick={() => setOpen(true)}>
          Compose
        </Button>
      </Box>

      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={() => setOpen(false)}
        fullWidth
        aria-labelledby="compose-dialog-title"
        aria-describedby="compose-dialog-description"
      >
        <DialogTitle id="compose-dialog-title" variant="h5">
          Compose Mail
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="compose-dialog-description" component="div">
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Delivered only to the recipient&apos;s Spanglish inbox (Email in the app), not Gmail or external mail.
            </Typography>
            <RecipientEmailField
              value={to}
              onChange={setTo}
              onValidityChange={setToValid}
              disabled={sendPending}
            />

            <ComposeFormLabel htmlFor="compose-subject">Subject</ComposeFormLabel>
            <TextField
              id="compose-subject"
              fullWidth
              size="small"
              variant="outlined"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />

            <ComposeFormLabel htmlFor="compose-message">Message</ComposeFormLabel>
            <TextField
              id="compose-message"
              placeholder="Write a message"
              multiline
              fullWidth
              rows={8}
              variant="outlined"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={send}
            color="primary"
            variant="contained"
            disabled={sendPending || !to.trim() || toValid === false}
          >
            Send
          </Button>
          <Button onClick={() => setOpen(false)} color="secondary" disabled={sendPending}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}