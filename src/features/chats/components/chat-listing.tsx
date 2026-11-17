"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatDistanceToNowStrict } from "date-fns";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { Scrollbar } from "@/components/custom-scroll/scrollbar";
import type { Chat, ChatStatus } from "@/features/chats/types";

const statusColor: Record<
  ChatStatus,
  "success" | "error" | "warning" | "secondary"
> = {
  online: "success",
  busy: "error",
  away: "warning",
  offline: "secondary",
};

type ChatListingProps = {
  chats: Chat[];
  activeChatId: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectChat: (chatId: number) => void;
};

function getLastMessage(chat: Chat) {
  return chat.messages[chat.messages.length - 1];
}

function getDetails(chat: Chat): string {
  const lastMessage = getLastMessage(chat);

  if (!lastMessage) {
    return "";
  }

  const sender = lastMessage.senderId === chat.id ? "" : "You: ";
  const text =
    lastMessage.type === "image" ? "Sent a photo" : lastMessage.msg;

  return `${sender}${text}`;
}

function getLastActivity(chat: Chat): Date | undefined {
  return getLastMessage(chat)?.createdAt;
}

export function ChatListing({
  chats,
  activeChatId,
  search,
  onSearchChange,
  onSelectChat,
}: ChatListingProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  return (
    <Box>
      {/* Current user */}
      <Box display="flex" alignItems="center" gap="10px" p={3}>
        <Badge
          variant="dot"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          overlap="circular"
          color="success"
        >
          <Avatar
            alt="Mathew Anderson"
            src="/images/profile/user-1.jpg"
            sx={{ width: 54, height: 54 }}
          />
        </Badge>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            Mathew Anderson
          </Typography>
          <Typography variant="body2">Designer</Typography>
        </Box>
      </Box>

      {/* Search */}
      <Box px={3} py={1}>
        <TextField
          id="chat-search"
          placeholder="Search contacts"
          size="small"
          type="search"
          variant="outlined"
          value={search}
          fullWidth
          onChange={(event) => onSearchChange(event.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Contact list */}
      <List sx={{ px: 0 }}>
        <Box px={2.5} pb={1}>
          <Button
            id="recent-chats-button"
            aria-controls={menuOpen ? "recent-chats-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            color="inherit"
            endIcon={<IconChevronDown size={16} />}
          >
            Recent Chats
          </Button>
          <Menu
            id="recent-chats-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              list: { "aria-labelledby": "recent-chats-button" },
            }}
          >
            <MenuItem onClick={() => setAnchorEl(null)}>Sort By Time</MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              Sort By Unread
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              Mark as all Read
            </MenuItem>
          </Menu>
        </Box>

        <Scrollbar
          sx={{
            height: { lg: "calc(100vh - 100px)", md: "100vh" },
            maxHeight: "600px",
          }}
        >
          {chats.length ? (
            chats.map((chat) => {
              const activity = getLastActivity(chat);

              return (
                <ListItemButton
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  sx={{ mb: 0.5, py: 2, px: 3, alignItems: "start" }}
                  selected={activeChatId === chat.id}
                >
                  <ListItemAvatar>
                    <Badge
                      color={statusColor[chat.status]}
                      variant="dot"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      overlap="circular"
                    >
                      <Avatar
                        alt={chat.name}
                        src={chat.thumb}
                        sx={{ width: 42, height: 42 }}
                      />
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                        {chat.name}
                      </Typography>
                    }
                    secondary={getDetails(chat)}
                    secondaryTypographyProps={{ noWrap: true }}
                    sx={{ my: 0 }}
                  />

                  {activity ? (
                    <Box sx={{ flexShrink: 0 }} mt={0.5}>
                      <Typography variant="body2">
                        {formatDistanceToNowStrict(activity, {
                          addSuffix: false,
                        })}
                      </Typography>
                    </Box>
                  ) : null}
                </ListItemButton>
              );
            })
          ) : (
            <Box m={2}>
              <Alert severity="error" variant="filled" sx={{ color: "white" }}>
                No Contacts Found!
              </Alert>
            </Box>
          )}
        </Scrollbar>
      </List>
    </Box>
  );
}
