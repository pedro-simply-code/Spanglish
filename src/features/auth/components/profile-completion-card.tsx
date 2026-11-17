"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type ProfileCompletion = {
  hasGoal: boolean;
  hasPhoto: boolean;
  twoFactorEnabled: boolean;
  hasPassword: boolean;
};

const items = [
  { key: "goal", done: (p: ProfileCompletion) => p.hasGoal },
  { key: "photo", done: (p: ProfileCompletion) => p.hasPhoto },
  { key: "password", done: (p: ProfileCompletion) => p.hasPassword },
  { key: "twoFactor", done: (p: ProfileCompletion) => p.twoFactorEnabled },
] as const;

/**
 * "Complete your profile (X%)": optional details after onboarding. Hidden
 * once everything is done. The required onboarding counts as the first 60%.
 */
export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  const t = useTranslations("profile.card");
  const pending = items.filter((item) => !item.done(completion));
  if (!pending.length) return null;

  const done = items.length - pending.length;
  const percent = Math.round(60 + (40 * done) / items.length);

  return (
    <Card elevation={9} sx={{ mt: 3 }}>
      <CardContent sx={{ p: "24px" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box flex={1} minWidth={0}>
            <Typography variant="h6">{t("title", { percent })}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("subtitle")}
            </Typography>
            <LinearProgress variant="determinate" value={percent} sx={{ mt: 1.5, mb: 1.5 }} />
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {pending.map((item) => (
                <Typography component="li" key={item.key} variant="body2">
                  {t(item.key)}
                </Typography>
              ))}
            </Stack>
          </Box>
          <Button component={Link} href="/settings" variant="outlined">
            {t("action")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
