"use client";

import { useEffect, useState } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { searchMessageRecipientsAction, verifyMessageRecipientAction } from "@/features/email/actions";
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
  label,
  value,
  onChange,
  onValidityChange,
  disabled,
}: RecipientEmailFieldProps) {
  const t = useTranslations("apps");
  const [options, setOptions] = useState<MessageRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<MessageRecipient | null>(null);
  const [unknown, setUnknown] = useState(false);

  const roleLabels: Record<MessageRecipient["role"], string> = {
    student: t("email.roles.student"),
    teacher: t("email.roles.teacher"),
    manager: t("email.roles.manager"),
    admin: t("email.roles.admin"),
  };

  const trimmed = value.trim();
  // An empty field has nothing to suggest or check (no state change needed).
  const shownOptions = trimmed ? options : [];
  const shownVerified = trimmed ? verified : null;
  const shownUnknown = trimmed ? unknown : false;

  useEffect(() => {
    if (!trimmed) {
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
  }, [trimmed, onValidityChange]);

  const selected =
    shownVerified ??
    shownOptions.find((option) => option.email.toLowerCase() === value.trim().toLowerCase()) ??
    null;

  return (
    <Box>
      <Autocomplete
        freeSolo
        filterOptions={(items, state) => filter(items, state)}
        options={shownOptions}
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
              label={roleLabels[option.role]}
              sx={{ ml: "auto" }}
              variant="outlined"
            />
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            id={id}
            label={label ?? t("email.compose.to")}
            size="small"
            placeholder={t("email.compose.toPlaceholder")}
            disabled={disabled}
          />
        )}
      />
      {shownUnknown ? (
        <FormHelperText error>{t("email.compose.recipientUnknown")}</FormHelperText>
      ) : shownVerified?.bounced ? (
        <FormHelperText>{t("email.compose.recipientBounced")}</FormHelperText>
      ) : shownVerified ? (
        <FormHelperText>
          {shownVerified.name} · {roleLabels[shownVerified.role]}
        </FormHelperText>
      ) : (
        <FormHelperText>{t("email.compose.recipientHint")}</FormHelperText>
      )}
    </Box>
  );
}
