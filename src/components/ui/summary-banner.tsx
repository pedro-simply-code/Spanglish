import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type SummaryBannerItem = {
  key: string;
  icon: ComponentType<{ size?: number }>;
  /** Palette name: primary, secondary, success, warning, error, info. */
  color: string;
  value: ReactNode;
  label: ReactNode;
  /** Makes the whole item a link. */
  href?: string;
};

type SummaryBannerProps = {
  items: SummaryBannerItem[];
  /** Optional button(s) on the right. */
  action?: ReactNode;
};

/**
 * Full-width summary at the top of a student tab (same look as the credits
 * hero in My classes): a row of icon + value + label items.
 */
export function SummaryBanner({ items, action }: SummaryBannerProps) {
  // With an action the items share the free space and the buttons keep their natural width.
  const itemSize = action ? { xs: 6, md: "grow" as const } : { xs: 6, md: 12 / items.length };
  return (
    <Card elevation={9} sx={{ mb: 3, background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
        <Grid container spacing={3} alignItems="center">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 44, height: 44, bgcolor: `${item.color}.light`, color: `${item.color}.main` }}>
                  <Icon size={22} />
                </Avatar>
                <Box minWidth={0}>
                  <Typography variant="h6" lineHeight={1.2}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            );
            return (
              <Grid key={item.key} size={itemSize}>
                {item.href ? (
                  <Box component={Link} href={item.href} sx={{ textDecoration: "none", color: "inherit" }}>
                    {content}
                  </Box>
                ) : (
                  content
                )}
              </Grid>
            );
          })}
          {action ? (
            <Grid size={{ xs: 12, md: "auto" }}>
              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: "flex-start", md: "flex-end" }}
                sx={{ "& .MuiButton-root": { whiteSpace: "nowrap" } }}
              >
                {action}
              </Stack>
            </Grid>
          ) : null}
        </Grid>
      </CardContent>
    </Card>
  );
}
