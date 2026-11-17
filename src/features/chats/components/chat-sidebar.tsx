"use client";

import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ChatListing } from "@/features/chats/components/chat-listing";
import type { Chat } from "@/features/chats/types";

const drawerWidth = 320;

type ChatSidebarProps = {
  isMobileSidebarOpen: boolean;
  onSidebarClose: () => void;
  chats: Chat[];
  activeChatId: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectChat: (chatId: number) => void;
};

export function ChatSidebar({
  isMobileSidebarOpen,
  onSidebarClose,
  chats,
  activeChatId,
  search,
  onSearchChange,
  onSelectChat,
}: ChatSidebarProps) {
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));

  return (
    <Drawer
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant={lgUp ? "permanent" : "temporary"}
      sx={{
        width: lgUp ? drawerWidth : undefined,
        flexShrink: 0,
        zIndex: lgUp ? 0 : 1,
        "& .MuiDrawer-paper": {
          position: lgUp ? "relative" : "fixed",
          width: drawerWidth,
          borderColor: "divider",
        },
      }}
    >
      <ChatListing
        chats={chats}
        activeChatId={activeChatId}
        search={search}
        onSearchChange={onSearchChange}
        onSelectChat={onSelectChat}
      />
    </Drawer>
  );
}
