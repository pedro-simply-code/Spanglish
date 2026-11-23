"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChartLine,
  IconCheck,
  IconClock,
  IconCoin,
  IconDiscount,
  IconHeadset,
  IconListCheck,
  IconMessageCircle,
  IconMicrophone,
  IconPackage,
  IconSchool,
  IconShieldCheck,
  IconShoppingCart,
  IconSparkles,
  IconTicket,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import {
  AiBuyButton,
  AiHowItWorksCard,
  AiPackList,
  conversationPrice,
  type AiAllowanceView,
  type AiPackOption,
} from "@/features/academy/components/ai-credit-packs";
import { SummaryRow, WizardStepCard, selectTileSx } from "@/features/academy/components/wizard-parts";
import { formatMoney, selectPlanByChoice } from "@/features/academy/data";
import { tokensLabel } from "@/lib/ai-credit-pricing";
import type {
  AcademyPlan,
  ClassDuration,
  ClassType,
  PackageSize,
} from "@/features/academy/data";

type StudentTranslator = ReturnType<typeof useTranslations<"student">>;
type StudentKey = Parameters<StudentTranslator>[0];

const included = [
  {
    titleKey: "pricing.included.teachers.title",
    descriptionKey: "pricing.included.teachers.description",
    icon: <IconUser size={18} />,
  },
  {
    titleKey: "pricing.included.scheduling.title",
    descriptionKey: "pricing.included.scheduling.description",
    icon: <IconCalendarEvent size={18} />,
  },
  {
    titleKey: "pricing.included.reports.title",
    descriptionKey: "pricing.included.reports.description",
    icon: <IconChartLine size={18} />,
  },
  {
    titleKey: "pricing.included.recordings.title",
    descriptionKey: "pricing.included.recordings.description",
    icon: <IconHeadset size={18} />,
  },
];

const planNameKeys: Record<string, string> = {
  "paired-1": "pricing.plan.name.pairedSingle",
  "one-on-one-1": "pricing.plan.name.single",
  "paired-30": "pricing.plan.name.pairedStarter",
  "paired-60": "pricing.plan.name.pairedProgress",
  "paired-90": "pricing.plan.name.pairedFluency",
  "one-on-one-30": "pricing.plan.name.starterSupport",
  "one-on-one-60": "pricing.plan.name.steadyProgress",
  "one-on-one-90": "pricing.plan.name.fluencyBuilder",
};

const planLabelKeys: Record<number, string> = {
  1: "pricing.plan.label.single",
  30: "pricing.plan.label.starter",
  60: "pricing.plan.label.popular",
  90: "pricing.plan.label.value",
};

const planDescriptionKeys: Record<number, string> = {
  1: "pricing.plan.description.single",
  30: "pricing.plan.description.light",
  60: "pricing.plan.description.steady",
  90: "pricing.plan.description.fluency",
};

function planName(t: StudentTranslator, plan: AcademyPlan) {
  const key = planNameKeys[`${plan.type}-${plan.classes}`];
  // Sizes added in admin without a translation keep the name stored there.
  return key ? t(key as StudentKey) : plan.name;
}

function planLabel(t: StudentTranslator, plan: AcademyPlan) {
  const key = planLabelKeys[plan.classes];
  return key ? t(key as StudentKey) : plan.label;
}

function planDescription(t: StudentTranslator, plan: AcademyPlan) {
  const key = planDescriptionKeys[plan.classes];
  if (!key) return plan.description;
  return t(key as StudentKey, {
    audience: t(
      plan.type === "paired"
        ? "pricing.plan.audience.eachStudent"
        : "pricing.plan.audience.you",
    ),
  });
}

type PlanCardProps = {
  plan: AcademyPlan;
  selected: boolean;
  onSelect: () => void;
  t: StudentTranslator;
};

function PlanCard({ plan, selected, onSelect, t }: PlanCardProps) {
  return (
    <ButtonBase
      onClick={onSelect}
      aria-pressed={selected}
      sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 1 }}
    >
      <Box
        sx={{
          p: "15px",
          borderRadius: 1,
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.light" : "background.paper",
          boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
          {/* Classes in the package, in the place of the date block of the class cards. */}
          <Box
            sx={{
              width: { xs: "100%", sm: 72 },
              py: 1.25,
              textAlign: "center",
              bgcolor: selected ? "background.paper" : "grey.200",
              color: selected ? "primary.main" : "text.secondary",
              flexShrink: 0,
            }}
          >
            <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
              {plan.classes}
            </Typography>
            <Typography variant="caption" display="block">
              {t("pricing.classesUnit", { count: plan.classes })}
            </Typography>
          </Box>

          <Box flexGrow={1} minWidth={0}>
            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
              <Chip
                label={planLabel(t, plan)}
                size="small"
                color={plan.classes === 60 ? "primary" : "default"}
                variant={plan.classes === 60 ? "filled" : "outlined"}
              />
              <Chip size="small" variant="outlined" label={t("common.minutes", { count: plan.duration })} />
              {plan.savings > 0 ? (
                <Chip label={t("pricing.save", { percent: plan.savings })} color="success" size="small" />
              ) : null}
            </Stack>
            <Typography variant="h5" mt={1.25}>
              {planName(t, plan)}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {planDescription(t, plan)}
            </Typography>
          </Box>

          <Box sx={{ flexShrink: 0, textAlign: { sm: "right" }, minWidth: 120 }}>
            <Stack direction="row" spacing={0.5} alignItems="baseline" justifyContent={{ sm: "flex-end" }}>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {formatMoney(plan.pricePerClass)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("pricing.perClass")}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatMoney(plan.total)} {t("common.total").toLowerCase()}
            </Typography>
            {plan.perStudentPerClass !== null ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {t("pricing.perStudentTotal", { amount: formatMoney(plan.perStudentPerClass) })}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ sm: "flex-end" }} mt={0.75}>
              {selected ? <IconCheck size={16} color="#FA896B" /> : null}
              <Typography
                variant="body2"
                fontWeight={selected ? 600 : 400}
                color={selected ? "primary.main" : "text.secondary"}
              >
                {selected ? t("pricing.selectedPlan") : t("pricing.selectPlan")}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </ButtonBase>
  );
}

type Product = "classes" | "ai";
type Step = "product" | "format" | "package" | "pack" | "review";

const STEPS: Record<Product, Step[]> = {
  classes: ["product", "format", "package", "review"],
  ai: ["product", "pack", "review"],
};

type PricingOverviewProps = {
  plans: AcademyPlan[];
  /** Student's current class credits (for the summary). */
  creditsLeft?: number;
  /** AI credit packs on sale (1 credit = 1 conversation with Luna or in the chat). */
  aiPacks?: AiPackOption[];
  /** The student's AI allowance; null for staff previewing the page. */
  aiAllowance?: AiAllowanceView | null;
  /** Token budget of one conversation (AI_CONVERSATION_TOKEN_LIMIT). */
  tokensPerConversation?: number;
};

/** Big option tile used by the first two steps. */
function OptionTile({
  selected,
  title,
  detail,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <ButtonBase onClick={onSelect} aria-pressed={selected} sx={{ display: "block", width: "100%", height: "100%", textAlign: "left", borderRadius: 1 }}>
      <Box sx={selectTileSx(selected)}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1,
              bgcolor: selected ? "background.paper" : "primary.light",
              color: "primary.main",
            }}
          >
            {icon}
          </Box>
          <Box flexGrow={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {detail}
            </Typography>
          </Box>
          {selected ? <IconCheck size={18} color="#FA896B" /> : null}
        </Stack>
      </Box>
    </ButtonBase>
  );
}

/** "Comprar créditos": classes or AI credits, step by step like booking a class. */
export function PricingOverview({
  plans,
  creditsLeft = 0,
  aiPacks = [],
  aiAllowance = null,
  tokensPerConversation = 10_000,
}: PricingOverviewProps) {
  const t = useTranslations("student");
  const searchParams = useSearchParams();
  // Links can preselect the purchase ("Buy again" in My credits):
  //   ?product=ai&pack=<id>&step=review   ·   ?type=paired&duration=50&classes=30
  const initial = useMemo(() => {
    const ai = searchParams.get("product") === "ai";
    const packParam = searchParams.get("pack");
    const pack = aiPacks.find((item) => item.id === packParam) ?? null;
    const typeParam = searchParams.get("type");
    const durationParam = Number(searchParams.get("duration"));
    const classesParam = Number(searchParams.get("classes"));
    const presetClasses = !ai && Boolean(typeParam || durationParam || classesParam);
    const sizes = new Set(plans.map((plan) => plan.classes));
    return {
      product: (ai ? "ai" : "classes") as Product,
      // AI: the pack step (or review when the pack is given); classes: the package step when preselected.
      step: ai ? (pack && searchParams.get("step") === "review" ? 2 : 1) : presetClasses ? 2 : 0,
      type: (typeParam === "paired" ? "paired" : "one-on-one") as ClassType,
      duration: (durationParam === 50 ? 50 : 25) as ClassDuration,
      classes: (sizes.has(classesParam as PackageSize) ? classesParam : 60) as PackageSize,
      packId: pack?.id ?? aiPacks[1]?.id ?? aiPacks[0]?.id ?? null,
    };
  }, [searchParams, aiPacks, plans]);
  const [product, setProduct] = useState<Product>(initial.product);
  const [stepIndex, setStepIndex] = useState(initial.step);
  const [duration, setDuration] = useState<ClassDuration>(initial.duration);
  const [type, setType] = useState<ClassType>(initial.type);
  const [classes, setClasses] = useState<PackageSize>(initial.classes);
  const [aiPackId, setAiPackId] = useState<string | null>(initial.packId);

  const steps = STEPS[product];
  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const lastStep = stepIndex >= steps.length - 1;

  const selectedPlan = selectPlanByChoice(plans, type, duration, classes);
  const packageOptions = plans
    .filter((plan) => plan.type === type && plan.duration === duration)
    .sort((a, b) => a.classes - b.classes);
  const maxSavings = Math.max(0, ...plans.map((plan) => plan.savings));
  const lowestPrice = plans.length ? Math.min(...plans.map((plan) => plan.pricePerClass)) : 0;
  const aiPack = aiPacks.find((pack) => pack.id === aiPackId) ?? null;
  const tokens = tokensLabel(tokensPerConversation);

  const chooseProduct = (value: Product) => {
    setProduct(value);
    setStepIndex(0);
  };
  const canContinue = step === "pack" ? Boolean(aiPack) : true;

  const stepIcons: Record<Step, ReactNode> = {
    product: <IconShoppingCart size={16} />,
    format: <IconClock size={16} />,
    package: <IconPackage size={16} />,
    pack: <IconSparkles size={16} />,
    review: <IconListCheck size={16} />,
  };

  return (
    <Box>
      <Breadcrumb title={t("pricing.breadcrumbTitle")} subtitle={t("pricing.breadcrumbSubtitle")} />

      {product === "classes" ? (
        <SummaryBanner
          items={[
            { key: "credits", icon: IconTicket, color: "primary", value: creditsLeft, label: t("pricing.summary.credits") },
            { key: "from", icon: IconCoin, color: "secondary", value: formatMoney(lowestPrice), label: t("pricing.summary.from") },
            { key: "save", icon: IconDiscount, color: "success", value: `${maxSavings}%`, label: t("pricing.summary.save") },
            { key: "valid", icon: IconCalendarEvent, color: "warning", value: t("pricing.summary.validValue"), label: t("pricing.summary.valid") },
          ]}
        />
      ) : (
        <SummaryBanner
          items={[
            { key: "ai", icon: IconSparkles, color: "primary", value: aiAllowance?.credits ?? 0, label: t("pricing.ai.summary.credits") },
            { key: "luna", icon: IconMicrophone, color: "secondary", value: aiAllowance?.freeVoice ?? 0, label: t("pricing.ai.summary.freeLuna") },
            { key: "chat", icon: IconMessageCircle, color: "success", value: aiAllowance?.freeChat ?? 0, label: t("pricing.ai.summary.freeChat") },
            { key: "tokens", icon: IconCoin, color: "warning", value: tokens, label: t("pricing.ai.summary.tokens") },
          ]}
        />
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {/* The steps sit where the tabs and filters do in the other tabs. */}
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Grid container spacing={1.5}>
                  {steps.map((item, index) => (
                    <Grid key={item} size={{ xs: 6, sm: 12 / steps.length }}>
                      <WizardStepCard
                        index={index}
                        label={t(`pricing.steps.${item}`)}
                        icon={stepIcons[item]}
                        active={stepIndex === index}
                        complete={stepIndex > index}
                        disabled={index > stepIndex}
                        onSelect={() => {
                          if (index < stepIndex) setStepIndex(index);
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Stack spacing={0.5} mb={2.5}>
                  <Typography variant="h5">{t(`pricing.steps.${step}`)}</Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t(`pricing.stepHints.${step}`, { tokens })}
                  </Typography>
                </Stack>

                {step === "product" ? (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <OptionTile
                        selected={product === "classes"}
                        title={t("pricing.productClasses")}
                        detail={t("pricing.productClassesDetail")}
                        icon={<IconSchool size={20} />}
                        onSelect={() => chooseProduct("classes")}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <OptionTile
                        selected={product === "ai"}
                        title={t("pricing.productAi")}
                        detail={t("pricing.productAiDetail", { tokens })}
                        icon={<IconSparkles size={20} />}
                        onSelect={() => chooseProduct("ai")}
                      />
                    </Grid>
                  </Grid>
                ) : null}

                {step === "format" ? (
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        {t("pricing.sessionLength")}
                      </Typography>
                      <Grid container spacing={2} mt={0.5}>
                        {([25, 50] as const).map((value) => (
                          <Grid key={value} size={{ xs: 12, sm: 6 }}>
                            <OptionTile
                              selected={duration === value}
                              title={t("common.minutes", { count: value })}
                              detail={t(value === 25 ? "pricing.duration25Detail" : "pricing.duration50Detail")}
                              icon={<IconClock size={20} />}
                              onSelect={() => setDuration(value)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        {t("pricing.classFormat")}
                      </Typography>
                      <Grid container spacing={2} mt={0.5}>
                        {(["one-on-one", "paired"] as const).map((value) => (
                          <Grid key={value} size={{ xs: 12, sm: 6 }}>
                            <OptionTile
                              selected={type === value}
                              title={value === "paired" ? t("classTypes.paired") : t("classTypes.individual")}
                              detail={t(value === "paired" ? "pricing.pairedDetail" : "pricing.individualDetail")}
                              icon={value === "paired" ? <IconUsers size={20} /> : <IconUser size={20} />}
                              onSelect={() => setType(value)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Stack>
                ) : null}

                {step === "package" ? (
                  <Stack spacing={2}>
                    {packageOptions.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        selected={plan.classes === classes}
                        onSelect={() => setClasses(plan.classes)}
                        t={t}
                      />
                    ))}
                    <Typography variant="body2" color="text.secondary">
                      {t("pricing.monthlyNote")} {t("pricing.priceNote")}
                    </Typography>
                  </Stack>
                ) : null}

                {step === "pack" ? (
                  <AiPackList
                    packs={aiPacks}
                    selectedId={aiPackId}
                    onSelect={setAiPackId}
                    tokensPerConversation={tokensPerConversation}
                  />
                ) : null}

                {step === "review" ? (
                  <Stack spacing={1.5}>
                    {product === "classes" ? (
                      <>
                        <SummaryRow label={t("common.package")} value={planName(t, selectedPlan)} />
                        <SummaryRow label={t("pricing.classesLabel")} value={t("pricing.packageOption", { count: selectedPlan.classes })} />
                        <SummaryRow label={t("common.duration")} value={t("pricing.durationOption", { count: selectedPlan.duration })} />
                        <SummaryRow
                          label={t("common.format")}
                          value={selectedPlan.type === "paired" ? t("pricing.formatPaired") : t("pricing.formatIndividual")}
                        />
                        <SummaryRow label={t("common.pricePerClass")} value={formatMoney(selectedPlan.pricePerClass)} />
                        <SummaryRow label={t("pricing.total")} value={formatMoney(selectedPlan.total)} />
                        <Typography variant="body2" color="text.secondary">
                          {t("pricing.finePrint")}
                        </Typography>
                      </>
                    ) : aiPack ? (
                      <>
                        <SummaryRow label={t("pricing.ai.pack")} value={aiPack.name} />
                        <SummaryRow label={t("pricing.ai.conversations")} value={String(aiPack.credits)} />
                        <SummaryRow label={t("pricing.ai.tokensEach")} value={tokens} />
                        <SummaryRow label={t("pricing.ai.pricePerConversation")} value={conversationPrice(aiPack)} />
                        <SummaryRow label={t("pricing.ai.total")} value={formatMoney(aiPack.priceCents / 100)} />
                        <Typography variant="body2" color="text.secondary">
                          {t("pricing.ai.finePrint")}
                        </Typography>
                      </>
                    ) : null}
                  </Stack>
                ) : null}

                <Divider sx={{ my: 3 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    variant="outlined"
                    color="inherit"
                    disabled={stepIndex === 0}
                    onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  >
                    {t("schedule.back")}
                  </Button>
                  {!lastStep ? (
                    <Button
                      variant="contained"
                      size="large"
                      disabled={!canContinue}
                      onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}
                    >
                      {t("schedule.stepNext")}
                    </Button>
                  ) : product === "classes" ? (
                    <LinkButton
                      href={`/checkout?plan=${selectedPlan.id}`}
                      variant="contained"
                      size="large"
                      endIcon={<IconArrowRight size={18} />}
                    >
                      {t("actions.continueCheckout")}
                    </LinkButton>
                  ) : (
                    <AiBuyButton pack={aiPack} disabled={!aiAllowance} />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3} sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
            {/* Like "Your booking": what is chosen so far. */}
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5">{t("pricing.yourPurchase")}</Typography>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={t("schedule.stepProgress", { current: stepIndex + 1, total: steps.length })}
                  />
                </Stack>
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  <SummaryRow
                    label={t("pricing.steps.product")}
                    value={product === "classes" ? t("pricing.productClasses") : t("pricing.productAi")}
                    done
                  />
                  {product === "classes" ? (
                    <>
                      <SummaryRow
                        label={t("pricing.steps.format")}
                        value={`${t("common.minutes", { count: duration })} · ${
                          type === "paired" ? t("classTypes.paired") : t("classTypes.individual")
                        }`}
                        done={stepIndex > 1}
                      />
                      <SummaryRow
                        label={t("pricing.steps.package")}
                        value={stepIndex >= 2 ? t("pricing.packageOption", { count: selectedPlan.classes }) : "—"}
                        done={stepIndex > 2}
                      />
                      <SummaryRow label={t("pricing.total")} value={stepIndex >= 2 ? formatMoney(selectedPlan.total) : "—"} done={stepIndex > 2} />
                    </>
                  ) : (
                    <>
                      <SummaryRow
                        label={t("pricing.steps.pack")}
                        value={aiPack && stepIndex >= 1 ? `${aiPack.name} · ${aiPack.credits}` : "—"}
                        done={Boolean(aiPack) && stepIndex > 1}
                      />
                      <SummaryRow
                        label={t("pricing.ai.total")}
                        value={aiPack && stepIndex >= 1 ? formatMoney(aiPack.priceCents / 100) : "—"}
                        done={Boolean(aiPack) && stepIndex > 1}
                      />
                    </>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="flex-start" mt={2}>
                  <Box sx={{ color: "success.main", mt: "2px" }}>
                    <IconShieldCheck size={18} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {product === "classes" ? t("pricing.finePrint") : t("pricing.ai.finePrint")}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {product === "classes" ? (
              <SectionCard padding="15px" title={t("pricing.includesTitle")} subtitle={t("pricing.includesSubtitle")}>
                <Stack spacing={2}>
                  {included.map((item) => (
                    <Stack key={item.titleKey} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "primary.light",
                          color: "primary.main",
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {t(item.titleKey as StudentKey)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(item.descriptionKey as StudentKey)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
            ) : (
              <AiHowItWorksCard allowance={aiAllowance} tokensPerConversation={tokensPerConversation} />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
