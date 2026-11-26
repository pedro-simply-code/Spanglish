import { env } from "@/env";

/*
 * Minimal Claude Messages API client (plain fetch, no SDK dependency).
 * https://docs.claude.com/en/api/messages
 */

/** ANTHROPIC_BASE_URL lets development and tests point at a fake server (no real calls). */
const API_URL = `${env.ANTHROPIC_BASE_URL.replace(/\/+$/, "")}/v1/messages`;
const API_VERSION = "2023-06-01";

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

export type ClaudeResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
};

export function isAnthropicConfigured() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Anthropic error type: authentication_error, not_found_error, rate_limit_error, … */
    readonly type: string = "api_error",
  ) {
    super(message);
  }
}

/** Why a call failed, in words the student UI can show. */
export type ClaudeFailure = "ai_auth" | "ai_model" | "ai_credit" | "ai_rate" | "ai_error";

export function classifyClaudeError(error: unknown): ClaudeFailure {
  if (!(error instanceof ClaudeError)) return "ai_error";
  if (error.status === 401 || error.status === 403 || error.type === "authentication_error") return "ai_auth";
  if (error.status === 404 || error.type === "not_found_error") return "ai_model";
  if (/credit balance|billing/i.test(error.message)) return "ai_credit";
  if (error.status === 429 || error.type === "rate_limit_error") return "ai_rate";
  return "ai_error";
}

/** Throws a ClaudeError with the API's own type and message (never the key). */
async function throwApiError(response: Response): Promise<never> {
  const detail = await response.text().catch(() => "");
  let type = "api_error";
  let message = detail.slice(0, 300);
  try {
    const body = JSON.parse(detail) as { error?: { type?: string; message?: string } };
    type = body.error?.type ?? type;
    message = body.error?.message ?? message;
  } catch {
    /* not JSON */
  }
  throw new ClaudeError(`Claude API ${response.status} ${type}: ${message}`, response.status, type);
}

/**
 * The API rejects empty messages and two turns in a row from the same side, so
 * one bad line (an empty reply saved earlier, a double send) would break every
 * later turn. Drops empty lines, joins same-side neighbours and makes sure the
 * conversation starts with the user.
 */
export function cleanHistory(messages: ClaudeMessage[]): ClaudeMessage[] {
  const clean: ClaudeMessage[] = [];
  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;
    const last = clean.at(-1);
    if (last && last.role === message.role) last.content = `${last.content}\n${content}`;
    else clean.push({ role: message.role, content });
  }
  if (clean[0]?.role === "assistant") clean.unshift({ role: "user", content: "(start)" });
  return clean;
}

/** The model answered with no text (it can happen now and then): retried once. */
const EMPTY_REPLY_ATTEMPTS = 2;

function emptyReplyError(stopReason: string | null) {
  return new ClaudeError(`Claude API returned an empty reply (stop_reason: ${stopReason ?? "none"})`, 502, "empty_reply");
}

function requestInit(input: { system: string; messages: ClaudeMessage[]; maxTokens: number }, stream: boolean) {
  if (!env.ANTHROPIC_API_KEY) throw new ClaudeError("Anthropic is not configured.", 503);
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: input.maxTokens,
      // No `temperature`: newer models reject it ("deprecated for this model").
      system: input.system,
      messages: cleanHistory(input.messages),
      ...(stream ? { stream: true } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  } satisfies RequestInit;
}

/**
 * Same as `callClaude`, but the reply arrives in pieces (server-sent events):
 * `onText` gets each new piece as soon as the model writes it.
 */
export async function streamClaude(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens: number;
  onText: (piece: string) => void;
}): Promise<ClaudeResult> {
  for (let attempt = 1; ; attempt++) {
    const result = await streamOnce(input);
    // Nothing reached `onText` yet, so trying again is invisible to the student.
    if (result.text) return result;
    if (attempt >= EMPTY_REPLY_ATTEMPTS) throw emptyReplyError(result.stopReason);
  }
}

async function streamOnce(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens: number;
  onText: (piece: string) => void;
}): Promise<ClaudeResult> {
  const response = await fetch(API_URL, requestInit(input, true));
  if (!response.ok || !response.body) return throwApiError(response);
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: string | null = null;
  let pendingBlank = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line.startsWith("data:")) continue;
      const event = JSON.parse(line.slice(5)) as {
        type: string;
        delta?: { type?: string; text?: string; stop_reason?: string | null };
        message?: { usage?: { input_tokens?: number; output_tokens?: number } };
        usage?: { input_tokens?: number; output_tokens?: number };
        error?: { type?: string; message?: string };
      };
      if (event.type === "message_start") {
        inputTokens = event.message?.usage?.input_tokens ?? 0;
        outputTokens = event.message?.usage?.output_tokens ?? 0;
      } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const piece = event.delta.text ?? "";
        text += piece;
        // Leading blank pieces are held back so an empty reply can be retried.
        if (text.trim()) {
          input.onText(pendingBlank + piece);
          pendingBlank = "";
        } else pendingBlank += piece;
      } else if (event.type === "message_delta") {
        outputTokens = event.usage?.output_tokens ?? outputTokens;
        inputTokens = event.usage?.input_tokens ?? inputTokens;
        stopReason = event.delta?.stop_reason ?? stopReason;
      } else if (event.type === "error") {
        throw new ClaudeError(
          `Claude API stream ${event.error?.type ?? "error"}: ${event.error?.message ?? ""}`,
          500,
          event.error?.type ?? "api_error",
        );
      }
    }
  }
  return { text: text.trim(), inputTokens, outputTokens, stopReason };
}

export async function callClaude(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens: number;
}): Promise<ClaudeResult> {
  for (let attempt = 1; ; attempt++) {
    const result = await callOnce(input);
    if (result.text) return result;
    if (attempt >= EMPTY_REPLY_ATTEMPTS) throw emptyReplyError(result.stopReason);
  }
}

async function callOnce(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens: number;
}): Promise<ClaudeResult> {
  const response = await fetch(API_URL, requestInit(input, false));
  if (!response.ok) return throwApiError(response);
  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    stop_reason?: string | null;
  };
  return {
    text: (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim(),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    stopReason: data.stop_reason ?? null,
  };
}
