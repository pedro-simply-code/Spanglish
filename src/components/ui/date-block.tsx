import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useFormatter } from "next-intl";

type DateBlockProps = {
  date: Date;
  timeZone?: string;
  /** Brand colours (e.g. attended, due soon); grey otherwise. */
  highlight?: boolean;
  /** Error colours (e.g. overdue). Wins over highlight. */
  alert?: boolean;
};

/** Weekday / day / "month year" block on the left of the list cards (same as My classes). */
export function DateBlock({ date, timeZone, highlight = false, alert = false }: DateBlockProps) {
  const format = useFormatter();
  const palette = alert ? "error" : highlight ? "primary" : null;
  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 72 },
        py: 1.25,
        px: { xs: 2, sm: 1 },
        textAlign: "center",
        bgcolor: palette ? `${palette}.light` : "grey.200",
        color: palette ? `${palette}.main` : "text.secondary",
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" display="block" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {format.dateTime(date, { weekday: "short", timeZone })}
      </Typography>
      <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
        {format.dateTime(date, { day: "numeric", timeZone })}
      </Typography>
      <Typography variant="caption" display="block">
        {format.dateTime(date, { month: "short", timeZone })} {format.dateTime(date, { year: "numeric", timeZone })}
      </Typography>
    </Box>
  );
}
