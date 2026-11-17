"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconMenu2, IconSearch } from "@tabler/icons-react";
import { searchMessageRecipientsAction } from "@/features/email/actions";
import { roleDefinitions } from "@/features/auth";
import type { MessageRecipient } from "@/server/messages/recipients";

type EmailSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onToggleSidebar: () => void;
  onPickRecipient?: (recipient: MessageRecipient) => void;
};

export function EmailSearch({ value, onChange, onToggleSidebar, onPickRecipient }: EmailSearchProps) {
  const [matches, setMatches] = useState<MessageRecipient[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const rows = await searchMessageRecipientsAction(q);
      setMatches(rows);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <Box sx={{ p: 2, pb: matches.length && onPickRecipient ? 0 : 2 }}>
      <Box display="flex">
        <Fab
          onClick={onToggleSidebar}
          color="primary"
          size="small"
          aria-label="Open email filters"
          sx={{
            mr: 1,
            flexShrink: "0",
            display: { xs: "block", lineHeight: "10px", lg: "none" },
          }}
        >
          <IconMenu2 size={16} />
        </Fab>

        <TextField
          id="email-search"
          fullWidth
          size="small"
          value={value}
          placeholder="Search messages or academy email"
          variant="outlined"
          onChange={(event) => onChange(event.target.value)}
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

      {matches.length > 0 && onPickRecipient ? (
        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            Academy contacts (all roles)
          </Typography>
          <List dense disablePadding>
            {matches.map((recipient) => (
              <ListItemButton
                key={recipient.email}
                onClick={() => onPickRecipient(recipient)}
                sx={{ borderRadius: 1, mt: 0.5 }}
              >
                <ListItemText
                  primary={recipient.name}
                  secondary={recipient.email}
                  primaryTypographyProps={{ variant: "subtitle2" }}
                />
                <Chip size="small" variant="outlined" label={roleDefinitions[recipient.role].badge} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ) : null}
    </Box>
  );
}