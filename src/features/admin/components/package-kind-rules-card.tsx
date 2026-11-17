import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SectionCard } from "@/components/ui/section-card";
import { PackageCommerceLinks } from "@/features/admin/components/package-commerce-links";
import { individualRules, pairedRules } from "@/features/admin/data";

const copy = {
  "one-on-one": {
    title: "Individual class rules",
    subtitle: "One student per live class",
    rules: individualRules,
    footnote: "Students buy and book on their own account.",
  },
  paired: {
    title: "Paired class rules",
    subtitle: "Two students share one credit pool",
    rules: pairedRules,
    footnote: "Form pairs under Organization → Students (manager) before students can buy these packages.",
  },
} as const;

/** Side column on Packages when filtering by class type. */
export function PackageKindRulesCard({ kind }: { kind: "one-on-one" | "paired" }) {
  const block = copy[kind];
  return (
    <SectionCard title={block.title} subtitle={block.subtitle}>
      <Stack spacing={2}>
        {block.rules.map((rule) => (
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
          {block.footnote}
        </Typography>
        <PackageCommerceLinks />
      </Stack>
    </SectionCard>
  );
}