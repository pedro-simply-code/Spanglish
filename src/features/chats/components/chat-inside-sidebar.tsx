"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { Chat } from "@/features/chats/types";

const drawerWidth = 320;

const AttachmentRow = styled(Stack)(({ theme }) => ({
  "& .attachment-download": {
    display: "none",
  },
  "&:hover .attachment-download": {
    display: "block",
  },
  [theme.breakpoints.down("lg")]: {
    "& .attachment-download": {
      display: "block",
    },
  },
}));

type ChatInsideSidebarProps = {
  chat: Chat;
};

export function ChatInsideSidebar({ chat }: ChatInsideSidebarProps) {
  const t = useTranslations("apps");
  const media = chat.messages.filter((item) => item.type === "image");

  const attachments = chat.messages.flatMap((item) => item.attachment);
  const uniqueAttachments = attachments.filter(
    (item, index) =>
      attachments.findIndex((attachment) => attachment.file === item.file) ===
      index,
  );

  return (
    <Box
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        borderLeft: 1,
        borderStyle: "solid",
        borderColor: "divider",
        height: "100%",
        bgcolor: "background.paper",
        position: "relative",
      }}
      p={3}
    >
      <Typography variant="h6" mb={2}>
        {t("chat.details.media", { count: media.length })}
      </Typography>

      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
        {media.map((item) => (
          <Avatar
            key={item.id}
            src={item.msg}
            alt={t("chat.details.sharedMedia")}
            variant="rounded"
            sx={{ width: "72px", height: "72px" }}
          />
        ))}
      </Box>

      {media.length === 0 ? (
        <Alert severity="error">{t("chat.details.noMedia")}</Alert>
      ) : null}

      <Typography variant="h6" mt={5} mb={2}>
        {t("chat.details.attachments", { count: uniqueAttachments.length })}
      </Typography>

      <Stack spacing={2.5} direction="column">
        {uniqueAttachments.map((attachment) => (
          <AttachmentRow key={attachment.file} direction="row" gap={2}>
            <Avatar
              variant="rounded"
              sx={{
                width: "48px",
                height: "48px",
                bgcolor: "grey.100",
              }}
            >
              <Avatar
                src={attachment.icon}
                alt={attachment.file}
                variant="rounded"
                sx={{ width: "24px", height: "24px" }}
              />
            </Avatar>

            <Box mr="auto">
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                {attachment.file}
              </Typography>
              <Typography variant="body2">{attachment.fileSize}</Typography>
            </Box>

            <IconButton
              className="attachment-download"
              aria-label={t("chat.details.download", { file: attachment.file })}
              size="small"
            >
              <IconDownload stroke={1.5} size={20} />
            </IconButton>
          </AttachmentRow>
        ))}
      </Stack>

      {uniqueAttachments.length === 0 ? (
        <Alert severity="error">{t("chat.details.noAttachments")}</Alert>
      ) : null}
    </Box>
  );
}
