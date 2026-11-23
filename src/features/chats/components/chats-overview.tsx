"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ChatContent } from "@/features/chats/components/chat-content";
import { ChatMsgSent } from "@/features/chats/components/chat-msg-sent";
import { ChatSidebar } from "@/features/chats/components/chat-sidebar";
import { createChats } from "@/features/chats/data";
import type { Chat } from "@/features/chats/types";

const CURRENT_USER_ID = "me";

export function ChatsOverview() {
  const t = useTranslations("apps");
  const [chats, setChats] = useState<Chat[]>(() => createChats(t));
  const [activeChatId, setActiveChatId] = useState(1);
  const [search, setSearch] = useState("");
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showInsideSidebar, setShowInsideSidebar] = useState(true);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleSend = (text: string) => {
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: `${chat.id}-${chat.messages.length}`,
                  createdAt: new Date(),
                  msg: text,
                  senderId: CURRENT_USER_ID,
                  type: "text",
                  attachment: [],
                },
              ],
            }
          : chat,
      ),
    );
  };

  return (
    <Box>
      <Breadcrumb
        title={t("chat.breadcrumb.title")}
        subtitle={t("chat.breadcrumb.subtitle")}
      />

      <Card
        elevation={9}
        sx={{ display: "flex", p: 0, overflow: "hidden" }}
      >
        <ChatSidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
          chats={filteredChats}
          activeChatId={activeChatId}
          search={search}
          onSearchChange={setSearch}
          onSelectChat={(chatId) => {
            setActiveChatId(chatId);
            setMobileSidebarOpen(false);
          }}
        />

        <Box flexGrow={1} minWidth={0}>
          <ChatContent
            chat={activeChat}
            showInsideSidebar={showInsideSidebar}
            onToggleInsideSidebar={() => setShowInsideSidebar((value) => !value)}
            onToggleChatSidebar={() => setMobileSidebarOpen(true)}
          />
          <Divider />
          <ChatMsgSent onSend={handleSend} />
        </Box>
      </Card>
    </Box>
  );
}
