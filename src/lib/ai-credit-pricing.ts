/*
 * How many conversations an AI credit pack gives, from its price and margin.
 * Everything comes from env (see src/env.ts / .env.example), so changing the
 * model price or the tokens per conversation updates every pack at once.
 *
 *   for AI      = price × (1 − Stripe % − margin %) − Stripe fixed fee
 *   per convo   = tokens per conversation × USD per million tokens ÷ 1M × safety multiplier
 *   credits     = floor(for AI ÷ per convo)          (1 credit = 1 conversation)
 */

export type AiPricingConfig = {
  /** Token budget of one conversation (AI_CONVERSATION_TOKEN_LIMIT). */
  tokensPerConversation: number;
  /** Conservative blended model price, USD per million tokens. */
  usdPerMillionTokens: number;
  /** Safety factor on the model cost (2 = each conversation is priced at twice its cost). */
  costMultiplier: number;
  stripePercent: number;
  stripeFixedCents: number;
};

export type AiPackMath = {
  credits: number;
  stripeFeeCents: number;
  marginCents: number;
  /** What is left to pay the model. */
  aiBudgetCents: number;
  /** Priced cost of one conversation (with the multiplier), USD. */
  costPerConversationUsd: number;
  /** Model cost of all the conversations (with the multiplier), cents. */
  aiCostCents: number;
};

export function aiPackMath(priceCents: number, marginPercent: number, config: AiPricingConfig): AiPackMath {
  const stripeFeeCents = (priceCents * config.stripePercent) / 100 + config.stripeFixedCents;
  const marginCents = (priceCents * marginPercent) / 100;
  const aiBudgetCents = Math.max(0, priceCents - stripeFeeCents - marginCents);
  const costPerConversationUsd =
    (config.tokensPerConversation * config.usdPerMillionTokens * config.costMultiplier) / 1_000_000;
  const credits = costPerConversationUsd > 0 ? Math.floor(aiBudgetCents / 100 / costPerConversationUsd) : 0;
  return {
    credits,
    stripeFeeCents: Math.round(stripeFeeCents),
    marginCents: Math.round(marginCents),
    aiBudgetCents: Math.round(aiBudgetCents),
    costPerConversationUsd,
    aiCostCents: Math.round(credits * costPerConversationUsd * 100),
  };
}

/** "10K" style label for the tokens of one conversation. */
export function tokensLabel(tokens: number) {
  return tokens >= 1000 ? `${Math.round(tokens / 100) / 10}K` : String(tokens);
}
