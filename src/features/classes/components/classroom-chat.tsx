"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconSend } from "@tabler/icons-react";
import type { ClassroomChatMessage } from "@/features/classes/classroom-protocol";

type ClassroomChatProps = {
  messages: ClassroomChatMessage[];
  disabled?: boolean;
  onSend: (text: string) => void;
};

export function ClassroomChat({
  messages,
  disabled,
  onSend,
}: ClassroomChatProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <Stack sx={{ height: "100%", minHeight: 0, width: "100%" }}>
      <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 1.5, py: 1 }}>
        {messages.length ? (
          messages.map((message) => (
            <Box key={message.id} sx={{ mb: 1.25 }}>
              <Typography variant="caption" color="rgba(255,255,255,0.55)">
                {message.name}
              </Typography>
              <Typography variant="body2" color="#fff">
                {message.text}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="rgba(255,255,255,0.45)">
            No messages yet. Say hello to the class.
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ p: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Message everyone"
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          sx={{
            "& .MuiInputBase-input": { color: "#fff", fontSize: 14 },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.2)",
            },
          }}
        />
        <IconButton
          type="button"
          onClick={submit}
          disabled={disabled}
          aria-label="Send message"
          sx={{
            color: "#fff",
            flexShrink: 0,
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <IconSend size={18} />
        </IconButton>
      </Stack>
    </Stack>
  );
}