"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { IconAlertCircle, IconStar, IconTrash } from "@tabler/icons-react";
import Image from "next/image";
import { EmailLabelChip } from "@/features/email/components/email-label-chip";
import type { Email } from "@/features/email/types";

type EmailContentProps = {
  email?: Email;
  onStar: (emailId: string) => void;
  onImportant: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onReply?: (email: Email) => void;
};

export function EmailContent({ email, onStar, onImportant, onDelete, onReply }: EmailContentProps) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");

  const theme = useTheme();

  const warningColor = theme.palette.warning.main;
  const errorColor = theme.palette.error.light;

  const toggleEditor = () => {
    setShow((value) => !value);
  };

  if (!email) {
    return (
      <Box
        p={3}
        height="50vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Box>
          <Typography variant="h4">Please Select a Mail</Typography>
          <br />
          <Image
            src="/images/breadcrumb/emailSv.png"
            alt="emailIcon"
            width={250}
            height={250}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Stack p={2} gap={0} direction="row">
        {email.inbox ? (
          <Tooltip title={email.starred ? "Unstar" : "Star"}>
            <IconButton
              aria-label={email.starred ? "Unstar email" : "Star email"}
              onClick={() => onStar(email.id)}
            >
              <IconStar
                stroke={1.3}
                size={18}
                style={{
                  fill: email.starred ? warningColor : "",
                  stroke: email.starred ? warningColor : "",
                }}
              />
            </IconButton>
          </Tooltip>
        ) : null}

        {email.inbox ? (
          <Tooltip title={email.important ? "Not Important" : "Important"}>
            <IconButton
              aria-label={email.important ? "Mark not important" : "Mark important"}
              onClick={() => onImportant(email.id)}
            >
              <IconAlertCircle
                size={18}
                stroke={1.3}
                style={{ fill: email.important ? errorColor : "" }}
              />
            </IconButton>
          </Tooltip>
        ) : null}

        <Tooltip title="Delete">
          <IconButton
            aria-label="Move email to trash"
            onClick={() => onDelete(email.id)}
          >
            <IconTrash size={18} stroke={1.3} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider />

      <Box p={3}>
        <Box display="flex" alignItems="center" sx={{ pb: 3 }}>
          <Avatar alt={email.from} src={email.thumbnail} sx={{ width: 40, height: 40 }} />
          <Box sx={{ ml: 2 }}>
            <Typography variant="h6">{email.from}</Typography>
            <Typography variant="body2">{email.To}</Typography>
          </Box>
          <EmailLabelChip label={email.label} sx={{ ml: "auto", height: "21px" }} />
        </Box>

        <Box sx={{ py: 2 }}>
          <Typography variant="h4">{email.subject}</Typography>
        </Box>

        <Box sx={{ py: 2 }}>
          <div dangerouslySetInnerHTML={{ __html: email.emailContent }} />
        </Box>
      </Box>

      {email.attachments.length === 0 ? null : (
        <>
          <Divider />
          <Box p={3}>
            <Typography variant="h6">Attachments ({email.attachments.length})</Typography>

            <Grid container spacing={3}>
              {email.attachments.map((attachment) => (
                <Grid key={attachment.id} size={{ lg: 4, md: 6, xs: 12 }}>
                  <Stack direction="row" gap={2} mt={2}>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: "48px",
                        height: "48px",
                        bgcolor: theme.palette.grey[100],
                      }}
                    >
                      <Avatar
                        src={attachment.image}
                        alt={attachment.title}
                        variant="rounded"
                        sx={{ width: "24px", height: "24px" }}
                      />
                    </Avatar>
                    <Box mr="auto">
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        {attachment.title}
                      </Typography>
                      <Typography variant="body2">{attachment.fileSize}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Divider />
        </>
      )}

      <Box p={3}>
        <Stack direction="row" gap={2}>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={() => (onReply && email ? onReply(email) : toggleEditor())}
          >
            Reply
          </Button>
          <Button variant="outlined" size="small">
            Forward
          </Button>
        </Stack>

        {show ? (
          <Box mt={3}>
            <Paper variant="outlined">
              <TextField
                value={text}
                placeholder="Type here..."
                multiline
                fullWidth
                minRows={4}
                variant="standard"
                onChange={(event) => setText(event.target.value)}
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: { px: 2, py: 1.5 },
                  },
                }}
              />
            </Paper>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
