"use client";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { formatDistanceToNowStrict } from "date-fns";
import { IconAlertCircle, IconStar, IconTrash } from "@tabler/icons-react";
import { EmailLabelChip } from "@/features/email/components/email-label-chip";
import type { Email } from "@/features/email/types";

type EmailListItemProps = {
  email: Email;
  isSelected: boolean;
  onSelect: () => void;
  onCheckedChange: (checked: boolean) => void;
};

export function EmailListItem({
  email,
  isSelected,
  onSelect,
  onCheckedChange,
}: EmailListItemProps) {
  const theme = useTheme();

  const warningColor = theme.palette.warning.main;
  const errorColor = theme.palette.error.light;

  return (
    <ListItemButton
      sx={{ mb: 1, py: 2 }}
      selected={isSelected}
      alignItems="flex-start"
      onClick={onSelect}
    >
      <ListItemIcon sx={{ minWidth: "35px", mt: "0" }}>
        <Checkbox
          edge="start"
          id={`check${email.id}`}
          tabIndex={-1}
          disableRipple
          checked={email.checked}
          inputProps={{ "aria-label": `Select email from ${email.from}` }}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
      </ListItemIcon>

      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Typography variant="subtitle2" mb={0.5} fontWeight={600} mr="auto">
            {email.from}
          </Typography>
          <EmailLabelChip label={email.label} size="small" />
        </Stack>

        <Typography variant="subtitle2" noWrap width="80%" color="text.secondary">
          {email.subject}
        </Typography>

        <Stack direction="row" mt={1} gap="10px" alignItems="center">
          <IconStar
            stroke={1}
            size={18}
            style={{
              fill: email.starred ? warningColor : "",
              stroke: email.starred ? warningColor : "",
            }}
          />
          <IconAlertCircle
            size={18}
            stroke={1.2}
            style={{ fill: email.important ? errorColor : "" }}
          />
          {email.checked ? <IconTrash stroke={1.5} size={16} /> : null}
          <Box sx={{ ml: "auto" }}>
            <Typography variant="caption" noWrap>
              {formatDistanceToNowStrict(email.time, { addSuffix: false })} ago
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
}
