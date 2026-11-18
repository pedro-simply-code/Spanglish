import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

/**
 * Marks this route as intentionally dynamic so the root layout's localized
 * metadata (which reads the request locale) can stream without blocking the
 * static shell from prerendering.
 */
async function Connection() {
  await connection();
  return null;
}

async function NotFoundContent() {
  const t = await getTranslations("metadata");

  return (
    <>
      <Typography variant="h1" component="h1">
        {t("notFoundTitle")}
      </Typography>
      <Typography color="text.secondary">{t("notFoundDescription")}</Typography>
      <Button component="a" href="/" variant="contained">
        {t("backHome")}
      </Button>
    </>
  );
}

export default function NotFound() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Suspense>
        <NotFoundContent />
      </Suspense>
      <Suspense>
        <Connection />
      </Suspense>
    </Box>
  );
}
