import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

export function MarketingSectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Grid container spacing={3} justifyContent="center">
      <Grid size={{ xs: 12, sm: 10, lg: 8 }}>
        {eyebrow ? (
          <Typography
            fontSize={16}
            textTransform="uppercase"
            color="primary.main"
            fontWeight={500}
            textAlign="center"
            mb={1}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography
          variant="h2"
          fontWeight={700}
          textAlign="center"
          sx={{
            fontSize: { lg: "36px", xs: "25px" },
            lineHeight: { lg: "43px", xs: "30px" },
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="subtitle1" color="text.secondary" textAlign="center" mt={2}>
            {subtitle}
          </Typography>
        ) : null}
      </Grid>
    </Grid>
  );
}