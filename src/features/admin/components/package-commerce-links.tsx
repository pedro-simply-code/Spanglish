import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";

/** Shared shortcuts on Packages (individual and paired filters). */
export function PackageCommerceLinks({ size = "small" }: { size?: "small" | "medium" | "large" }) {
  const t = useTranslations("admin");
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <LinkButton href="/admin/finance/teacher-rates" size={size} variant="outlined">
        {t("common.teacherPayRates")}
      </LinkButton>
      <LinkButton href="/admin/organization/students" size={size} variant="outlined">
        {t("common.studentsPairs")}
      </LinkButton>
    </Stack>
  );
}
