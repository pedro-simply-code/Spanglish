import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { PackageCommerceLinks } from "@/features/admin/components/package-commerce-links";
import { individualRules, pairedRules } from "@/features/admin/data";

/** Side column on Packages when filtering by class type. */
export function PackageKindRulesCard({ kind }: { kind: "one-on-one" | "paired" }) {
  const t = useTranslations("admin");
  const isIndividual = kind === "one-on-one";
  const rules = isIndividual ? individualRules(t) : pairedRules(t);
  return (
    <SectionCard
      title={t(isIndividual ? "commerce.rules.individual.title" : "commerce.rules.paired.title")}
      subtitle={t(
        isIndividual ? "commerce.rules.individual.subtitle" : "commerce.rules.paired.subtitle",
      )}
    >
      <Stack spacing={2}>
        {rules.map((rule) => (
          <div key={rule.id}>
            <Typography variant="subtitle2" fontWeight={600}>
              {rule.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rule.detail}
            </Typography>
          </div>
        ))}
        <Typography variant="body2" color="text.secondary">
          {t(isIndividual ? "commerce.rules.individual.footnote" : "commerce.rules.paired.footnote")}
        </Typography>
        <PackageCommerceLinks />
      </Stack>
    </SectionCard>
  );
}
