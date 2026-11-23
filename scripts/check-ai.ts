/**
 * Checks the AI conversation setup without opening the app:
 *   pnpm check:ai
 * - whether ANTHROPIC_API_KEY is set (never prints it);
 * - lists the models your key can use (pick the cheapest Haiku for ANTHROPIC_MODEL);
 * - sends one tiny message (a few tokens) with ANTHROPIC_MODEL.
 */
import { env } from "../src/env";
import { callClaude } from "../src/server/ai/anthropic";

const ok = (text: string) => console.log(`  ✓ ${text}`);
const bad = (text: string) => console.log(`  ✗ ${text}`);
const info = (text: string) => console.log(`  · ${text}`);

async function main() {
  console.log("\nAI conversation practice (Anthropic)");
  if (!env.ANTHROPIC_API_KEY) {
    bad("ANTHROPIC_API_KEY is not set in .env");
    return;
  }
  ok(`ANTHROPIC_API_KEY is set (${env.ANTHROPIC_API_KEY.length} characters)`);
  info(`ANTHROPIC_MODEL: ${env.ANTHROPIC_MODEL}`);

  const response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  });
  if (!response.ok) {
    bad(`Listing models failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    if (response.status === 401) info("The key is wrong or revoked. Create one at console.anthropic.com → API keys.");
    return;
  }
  const { data = [] } = (await response.json()) as { data?: { id: string; display_name?: string }[] };
  ok(`Models available to this key (${data.length}):`);
  for (const model of data) info(`${model.id}${model.display_name ? `  (${model.display_name})` : ""}`);
  if (!data.some((model) => model.id === env.ANTHROPIC_MODEL)) {
    bad(`ANTHROPIC_MODEL "${env.ANTHROPIC_MODEL}" is not in the list. Set it to one of the ids above (a Haiku is the cheapest).`);
  }

  try {
    const result = await callClaude({
      system: "Reply with one word.",
      messages: [{ role: "user", content: "Say hola." }],
      maxTokens: 10,
    });
    ok(`Test message answered: "${result.text}" (${result.inputTokens} in / ${result.outputTokens} out tokens)`);
  } catch (error) {
    bad(`Test message failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
