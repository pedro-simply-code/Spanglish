"use client";

import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { IconPaperclip, IconPhoto, IconSend } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

type ChatMsgSentProps = {
  onSend: (message: string) => void;
};

export function ChatMsgSent({ onSend }: ChatMsgSentProps) {
  const t = useTranslations("apps");
  const [msg, setMsg] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!msg.trim()) {
      return;
    }

    onSend(msg.trim());
    setMsg("");
  };

  return (
    <Box p={2}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        <InputBase
          id="msg-sent"
          fullWidth
          value={msg}
          placeholder={t("chat.composer.placeholder")}
          size="small"
          type="text"
          inputProps={{ "aria-label": t("chat.composer.placeholder") }}
          onChange={(event) => setMsg(event.target.value)}
        />

        <IconButton
          type="submit"
          aria-label={t("chat.composer.send")}
          color="primary"
          disabled={!msg}
        >
          <IconSend stroke={1.5} size={20} />
        </IconButton>

        <IconButton aria-label={t("chat.composer.photo")}>
          <IconPhoto stroke={1.5} size={20} />
        </IconButton>

        <IconButton aria-label={t("chat.composer.attach")}>
          <IconPaperclip stroke={1.5} size={20} />
        </IconButton>
      </form>
    </Box>
  );
}
