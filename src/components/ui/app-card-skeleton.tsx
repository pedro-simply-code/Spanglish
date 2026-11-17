import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/**
 * Placeholder for app pages whose content streams behind a Suspense
 * boundary. With Cache Components, Next.js prerenders the shell, and these
 * pages read the current time while rendering, so their content is deferred
 * to the request pass instead of being baked into the static shell.
 */
export function AppCardSkeleton() {
  return (
    <Box mt={3}>
      <Skeleton variant="rounded" height={130} sx={{ mb: "30px" }} />

      <Card elevation={9} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={360} />
          <Skeleton variant="rounded" width="35%" height={24} />
        </Stack>
      </Card>
    </Box>
  );
}
