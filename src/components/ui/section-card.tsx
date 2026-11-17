import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Shared card container for content sections. Keeps titles, subtitles and
 * actions aligned across features instead of duplicating the same layout.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: SectionCardProps) {
  return (
    <Card elevation={9} sx={{ height: "100%" }}>
      <CardContent sx={{ p: "30px" }}>
        {title ? (
          <Stack
            direction="row"
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <Typography variant="h5">{title}</Typography>
              {subtitle ? (
                <Typography variant="subtitle2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
            {action}
          </Stack>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
