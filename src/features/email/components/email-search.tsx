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
import { useTranslations } from "next-intl";
import { searchMessageRecipientsAction } from "@/features/email/actions";
import type { MessageRecipient } from "@/server/messages/recipients";

type EmailSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onToggleSidebar: () => void;
  onPickRecipient?: (recipient: MessageRecipient) => void;
};

export function EmailSearch({ value, onChange, onToggleSidebar, onPickRecipient }: EmailSearchProps) {
  const t = useTranslations("apps");
  const [matches, setMatches] = useState<MessageRecipient[]>([]);

  const roleLabels: Record<MessageRecipient["role"], string> = {
    student: t("email.roles.student"),
    teacher: t("email.roles.teacher"),
    manager: t("email.roles.manager"),
    admin: t("email.roles.admin"),
  };

  const query = value.trim();
  // Under 2 letters there is nothing to suggest (no state change needed).
  const visibleMatches = query.length < 2 ? [] : matches;

  useEffect(() => {
    if (query.length < 2) return;
    const timer = window.setTimeout(async () => {
      const rows = await searchMessageRecipientsAction(query);
      setMatches(rows);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <Box sx={{ p: 2, pb: visibleMatches.length && onPickRecipient ? 0 : 2 }}>
      <Box display="flex">
        <Fab
          onClick={onToggleSidebar}
          color="primary"
          size="small"
          aria-label={t("email.search.openFilters")}
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
          placeholder={t("email.search.placeholder")}
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

      {visibleMatches.length > 0 && onPickRecipient ? (
        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            {t("email.search.contacts")}
          </Typography>
          <List dense disablePadding>
            {visibleMatches.map((recipient) => (
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
                <Chip size="small" variant="outlined" label={roleLabels[recipient.role]} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ) : null}
    </Box>
  );
}
