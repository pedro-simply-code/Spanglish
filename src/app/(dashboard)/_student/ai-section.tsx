import Box from "@mui/material/Box";
import { getTranslations } from "next-intl/server";
import { Breadcrumb, HideBreadcrumb } from "@/components/layout/breadcrumb";
import { AiPractice } from "@/features/ai-practice";
import { requireDashboard } from "@/server/auth/session";
import {
  aiPracticeConfig,
  canOpenAiConversation,
  getAiConversation,
  listAiConversations,
  listAiScenarios,
} from "@/server/ai/conversations";
import { getAiAllowance } from "@/server/ai/credits";

/**
 * The two AI practices, each with its own page in the sidebar:
 *   /speak  Habla con la IA   (Luna, by voice)
 *   /chat   Chatea con la IA  (written role-play scenes)
 * `conversationId` opens one conversation (chats only while they have tokens left).
 */
export async function AiSection({
  kind,
  conversationId,
}: {
  kind: "speak" | "chat";
  conversationId?: string;
}) {
  const actor = await requireDashboard("student");
  const t = await getTranslations("student.ai.pages");
  const config = aiPracticeConfig();
  const mode = kind === "speak" ? "voice" : "chat";
  const [scenarios, list, selected, allowance] = await Promise.all([
    kind === "chat" ? listAiScenarios() : Promise.resolve([]),
    listAiConversations(actor.userId, mode),
    conversationId ? getAiConversation(actor.userId, conversationId) : Promise.resolve(null),
    getAiAllowance(actor.userId),
  ]);
  const open = selected && selected.mode === mode && canOpenAiConversation(selected) ? selected : null;
  return (
    <Box>
      <Breadcrumb title={t(`${kind}.title`)} subtitle={t(`${kind}.subtitle`)} />
      <HideBreadcrumb>
        <AiPractice
          kind={kind}
          configured={config.configured}
          scenarios={scenarios}
          freeLeft={allowance.free[mode].left}
          perClass={allowance.perClass}
          credits={allowance.credits}
          tokensPerConversation={config.tokenLimit}
          conversations={list.conversations}
          selected={open}
        />
      </HideBreadcrumb>
    </Box>
  );
}
