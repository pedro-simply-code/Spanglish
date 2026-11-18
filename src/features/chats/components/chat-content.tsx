"use client";

import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { formatDistanceToNowStrict } from "date-fns";
import enUS from "date-fns/locale/en-US";
import es from "date-fns/locale/es";
import { IconDotsVertical, IconMenu2, IconPhone, IconVideo } from "@tabler/icons-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChatInsideSidebar } from "@/features/chats/components/chat-inside-sidebar";
import type { Chat, ChatMessage, ChatStatus } from "@/features/chats/types";

const statusColor: Record<
  ChatStatus,
  "success" | "error" | "warning" | "secondary"
> = {
  online: "success",
  busy: "error",
  away: "warning",
  offline: "secondary",
};

type ChatContentProps = {
  chat?: Chat;
  showInsideSidebar: boolean;
  onToggleInsideSidebar: () => void;
  onToggleChatSidebar: () => void;
};

function MessageTime({ chat, message }: { chat: Chat; message: ChatMessage }) {
  const locale = useLocale();
  const t = useTranslations("apps");

  if (!message.createdAt) {
    return null;
  }

  const dateLocale = locale === "es" ? es : enUS;

  return (
    <Typography variant="body2" color="grey.400" mb={1}>
      {t("chat.content.messageTime", {
        name: chat.name,
        time: formatDistanceToNowStrict(message.createdAt, {
          addSuffix: true,
          locale: dateLocale,
        }),
      })}
    </Typography>
  );
}

export function ChatContent({
  chat,
  showInsideSidebar,
  onToggleInsideSidebar,
  onToggleChatSidebar,
}: ChatContentProps) {
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const t = useTranslations("apps");

  if (!chat) {
    return (
      <Box display="flex" alignItems="center" p={2}>
        <Box
          sx={{
            display: { xs: "flex", lg: "none" },
            mr: "10px",
          }}
        >
          <IconButton aria-label={t("chat.content.openChatList")} onClick={onToggleChatSidebar}>
            <IconMenu2 stroke={1.5} />
          </IconButton>
        </Box>
        <Typography variant="h4">{t("chat.content.selectChat")}</Typography>
      </Box>
    );
  }

  const statusLabels: Record<ChatStatus, string> = {
    online: t("chat.status.online"),
    busy: t("chat.status.busy"),
    away: t("chat.status.away"),
    offline: t("chat.status.offline"),
  };
  const isInsideSidebarVisible = lgUp ? showInsideSidebar : !showInsideSidebar;

  return (
    <Box>
      {/* Header */}
      <Box>
        <Box display="flex" alignItems="center" p={2}>
          <Box sx={{ display: { xs: "block", lg: "none" }, mr: "10px" }}>
            <IconButton
              aria-label={t("chat.content.openChatList")}
              onClick={onToggleChatSidebar}
            >
              <IconMenu2 stroke={1.5} />
            </IconButton>
          </Box>

          <ListItem key={chat.id} dense disableGutters>
            <ListItemAvatar>
              <Badge
                color={statusColor[chat.status]}
                variant="dot"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                overlap="circular"
              >
                <Avatar alt={chat.name} src={chat.thumb} sx={{ width: 40, height: 40 }} />
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={<Typography variant="h5">{chat.name}</Typography>}
              secondary={statusLabels[chat.status]}
            />
          </ListItem>

          <Stack direction="row">
            <IconButton aria-label={t("chat.content.startVoiceCall")}>
              <IconPhone stroke={1.5} />
            </IconButton>
            <IconButton aria-label={t("chat.content.startVideoCall")}>
              <IconVideo stroke={1.5} />
            </IconButton>
            <IconButton
              aria-label={t("chat.content.toggleDetails")}
              onClick={onToggleInsideSidebar}
            >
              <IconDotsVertical stroke={1.5} />
            </IconButton>
          </Stack>
        </Box>
        <Divider />
      </Box>

      {/* Conversation */}
      <Box display="flex">
        <Box width="100%" minWidth={0}>
          <Box sx={{ height: "650px", overflow: "auto", maxHeight: "800px" }}>
            <Box p={3}>
              {chat.messages.map((message) => {
                const isFromContact = message.senderId === chat.id;

                if (isFromContact) {
                  return (
                    <Box key={message.id} display="flex">
                      <ListItemAvatar>
                        <Avatar
                          alt={chat.name}
                          src={chat.thumb}
                          sx={{ width: 40, height: 40 }}
                        />
                      </ListItemAvatar>

                      <Box>
                        <MessageTime chat={chat} message={message} />

                        {message.type === "text" ? (
                          <Box
                            mb={2}
                            sx={{
                              p: 1,
                              backgroundColor: "grey.100",
                              mr: "auto",
                              maxWidth: "320px",
                            }}
                          >
                            {message.msg}
                          </Box>
                        ) : null}

                        {message.type === "image" ? (
                          <Box mb={1} sx={{ overflow: "hidden", lineHeight: "0px" }}>
                            <Image
                              src={message.msg}
                              alt={t("chat.content.sharedAttachment")}
                              width={150}
                              height={150}
                            />
                          </Box>
                        ) : null}
                      </Box>
                    </Box>
                  );
                }

                return (
                  <Box
                    key={message.id}
                    mb={1}
                    display="flex"
                    alignItems="flex-end"
                    flexDirection="row-reverse"
                  >
                    <Box alignItems="flex-end" display="flex" flexDirection="column">
                      <MessageTime chat={chat} message={message} />

                      {message.type === "text" ? (
                        <Box
                          mb={1}
                          sx={{
                            p: 1,
                            backgroundColor: "primary.light",
                            ml: "auto",
                            maxWidth: "320px",
                          }}
                        >
                          {message.msg}
                        </Box>
                      ) : null}

                      {message.type === "image" ? (
                        <Box mb={1} sx={{ overflow: "hidden", lineHeight: "0px" }}>
                          <Image
                            src={message.msg}
                            alt={t("chat.content.sharedAttachment")}
                            width={250}
                            height={165}
                          />
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {isInsideSidebarVisible ? (
          <Box flexShrink={0}>
            <ChatInsideSidebar chat={chat} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
