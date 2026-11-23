"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCheck } from "@tabler/icons-react";

/* Pieces shared by the step-by-step flows: booking a class and buying credits. */

export const selectTileSx = (selected: boolean) => ({
  p: 2.5,
  height: "100%",
  borderRadius: 1,
  border: "1px solid",
  borderColor: selected ? "primary.main" : "divider",
  bgcolor: selected ? "primary.light" : "background.paper",
  boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
  transition: "border-color 120ms ease, box-shadow 120ms ease",
});

export function SummaryRow({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
      <Stack direction="row" spacing={1} alignItems="center">
        {done !== undefined ? (
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: done ? "success.light" : "action.hover",
              color: done ? "success.dark" : "text.disabled",
              flexShrink: 0,
            }}
          >
            {done ? <IconCheck size={14} stroke={2.5} /> : null}
          </Box>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="subtitle2" fontWeight={600} textAlign="right" maxWidth="55%">
        {value}
      </Typography>
    </Stack>
  );
}

export function WizardStepCard({
  index,
  label,
  icon,
  active,
  complete,
  disabled,
  onSelect,
}: {
  index: number;
  label: string;
  icon: ReactNode;
  active: boolean;
  complete: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      onClick={onSelect}
      disabled={disabled}
      sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 1 }}
    >
      <Box
        sx={{
          ...selectTileSx(active),
          opacity: disabled && !active ? 0.55 : 1,
          px: 1.5,
          py: 1.75,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: active || complete ? "primary.main" : "action.selected",
              color: active || complete ? "primary.contrastText" : "text.secondary",
              flexShrink: 0,
            }}
          >
            {complete && !active ? <IconCheck size={16} /> : active ? icon : index + 1}
          </Box>
          <Stack spacing={0.25} minWidth={0}>
            {/* The step icon lives in the circle (number when pending, check when done) so the label fits; long labels wrap to a second line. */}
            <Typography variant="subtitle2" fontWeight={active ? 700 : 500} lineHeight={1.2}>
              {label}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </ButtonBase>
  );
}
