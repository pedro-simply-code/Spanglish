import Stack from "@mui/material/Stack";
import { LinkButton } from "@/components/ui/link-button";

/** Shared shortcuts on Packages (individual and paired filters). */
export function PackageCommerceLinks({ size = "small" }: { size?: "small" | "medium" | "large" }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <LinkButton href="/admin/finance/teacher-rates" size={size} variant="outlined">
        Teacher pay rates
      </LinkButton>
      <LinkButton href="/admin/organization/students" size={size} variant="outlined">
        Students & pairs
      </LinkButton>
    </Stack>
  );
}