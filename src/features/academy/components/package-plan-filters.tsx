"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ClassDuration, ClassType } from "@/features/academy/data";

export type PackagePlanFiltersProps = {
  duration: ClassDuration;
  classType: ClassType;
  onDuration: (value: ClassDuration) => void;
  onClassType: (value: ClassType) => void;
  maxSavings?: number;
  showSavingsChip?: boolean;
  sx?: SxProps<Theme>;
};

export function PackagePlanFilters({
  duration,
  classType,
  onDuration,
  onClassType,
  maxSavings = 0,
  showSavingsChip = true,
  sx,
}: PackagePlanFiltersProps) {
  return (
    <Stack spacing={2.5} direction="column" alignItems="center" useFlexGap width="100%" sx={sx}>
      <Stack spacing={1} alignItems="center" width="100%">
        <Typography variant="overline" color="text.secondary" lineHeight={1.2}>
          Session length
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={duration}
          onChange={(_event, value: ClassDuration | null) => {
            if (value) onDuration(value);
          }}
          size="small"
          color="primary"
          aria-label="Session length"
        >
          <ToggleButton value={25} sx={{ px: 2.5 }}>
            25 min
          </ToggleButton>
          <ToggleButton value={50} sx={{ px: 2.5 }}>
            50 min
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={1} alignItems="center" width="100%">
        <Typography variant="overline" color="text.secondary" lineHeight={1.2}>
          Class format
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={classType}
          onChange={(_event, value: ClassType | null) => {
            if (value) onClassType(value);
          }}
          size="small"
          color="primary"
          aria-label="Class format"
        >
          <ToggleButton value="one-on-one" sx={{ px: 2.5 }}>
            Individual
          </ToggleButton>
          <ToggleButton value="paired" sx={{ px: 2.5 }}>
            Paired
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {showSavingsChip && maxSavings > 0 ? (
        <Chip label={`Save up to ${maxSavings}%`} color="success" size="small" variant="outlined" />
      ) : null}
    </Stack>
  );
}