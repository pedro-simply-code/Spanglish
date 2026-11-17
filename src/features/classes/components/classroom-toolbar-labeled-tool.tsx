import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function LabeledToolbarTool({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip title={tooltip}>
      <Stack alignItems="center" spacing={0.25} sx={{ minWidth: 48, maxWidth: 64 }}>
        {children}
        <Typography
          component="span"
          sx={{
            fontSize: 9,
            lineHeight: 1.15,
            textAlign: "center",
            color: "rgba(255,255,255,0.62)",
            px: 0.25,
          }}
        >
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}