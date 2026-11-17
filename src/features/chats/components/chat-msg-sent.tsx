"use client";

import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { IconPaperclip, IconPhoto, IconSend } from "@tabler/icons-react";

type ChatMsgSentProps = {
  onSend: (message: string) => void;
};

export function ChatMsgSent({ onSend }: ChatMsgSentProps) {
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
          placeholder="Type a Message"
          size="small"
          type="text"
          inputProps={{ "aria-label": "Type a Message" }}
          onChange={(event) => setMsg(event.target.value)}
        />

        <IconButton
          type="submit"
          aria-label="Send message"
          color="primary"
          disabled={!msg}
        >
          <IconSend stroke={1.5} size={20} />
        </IconButton>

        <IconButton aria-label="Send a photo">
          <IconPhoto stroke={1.5} size={20} />
        </IconButton>

        <IconButton aria-label="Attach a file">
          <IconPaperclip stroke={1.5} size={20} />
        </IconButton>
      </form>
    </Box>
  );
}
