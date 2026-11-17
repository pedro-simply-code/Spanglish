"use client";

import { useEffect, useState } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { searchMessageRecipientsAction, verifyMessageRecipientAction } from "@/features/email/actions";
import { roleDefinitions } from "@/features/auth";
import type { MessageRecipient } from "@/server/messages/recipients";

type RecipientEmailFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (email: string) => void;
  onValidityChange?: (valid: boolean | null) => void;
  disabled?: boolean;
};

const filter = createFilterOptions<MessageRecipient>();

export function RecipientEmailField({
  id = "compose-to",
  label = "To (academy email)",
  value,
  onChange,
  onValidityChange,
  disabled,
}: RecipientEmailFieldProps) {
  const [options, setOptions] = useState<MessageRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<MessageRecipient | null>(null);
  const [unknown, setUnknown] = useState(false);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setOptions([]);
      setVerified(null);
      setUnknown(false);
      onValidityChange?.(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [matches, check] = await Promise.all([
          searchMessageRecipientsAction(trimmed),
          verifyMessageRecipientAction(trimmed),
        ]);
        setOptions(matches);
        setVerified(check.recipient);
        setUnknown(!check.found);
        onValidityChange?.(check.found);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, onValidityChange]);

  const selected =
    verified ??
    options.find((option) => option.email.toLowerCase() === value.trim().toLowerCase()) ??
    null;

  return (
    <Box>
      <Autocomplete
        freeSolo
        filterOptions={(items, state) => filter(items, state)}
        options={options}
        loading={loading}
        inputValue={value}
        value={selected}
        onInputChange={(_, newValue) => onChange(newValue)}
        onChange={(_, option) => {
          if (typeof option === "string") {
            onChange(option);
            return;
          }
          if (option) onChange(option.email);
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : `${option.name} <${option.email}>`
        }
        isOptionEqualToValue={(a, b) => a.email === b.email}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.email}>
            <Box>
              <Typography variant="subtitle2">{option.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.email}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={roleDefinitions[option.role].badge}
              sx={{ ml: "auto" }}
              variant="outlined"
            />
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            id={id}
            label={label}
            size="small"
            placeholder="Search name or email in the academy"
            disabled={disabled}
          />
        )}
      />
      {unknown ? (
        <FormHelperText error>No academy account matches this email.</FormHelperText>
      ) : verified?.bounced ? (
        <FormHelperText>
          Account found (external mail bounced — Spanglish inbox still works in the app).
        </FormHelperText>
      ) : verified ? (
        <FormHelperText>
          {verified.name} · {roleDefinitions[verified.role].badge}
        </FormHelperText>
      ) : (
        <FormHelperText>Type a name or email to search all roles in the academy.</FormHelperText>
      )}
    </Box>
  );
}