import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "test-model", ANTHROPIC_BASE_URL: "https://api.anthropic.com" },
}));

vi.mock("@/server/db", () => ({ db: {} }));

const { callClaude, cleanHistory, streamClaude } = await import("@/server/ai/anthropic");
const { withoutCutSentence, lastFullSentence } = await import("@/server/ai/conversations");
const { bubbleText } = await import("@/lib/ai-scene-speakers");

const json = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: "end_turn" }));

const sse = (pieces: string[]) =>
  new Response(
    [
      { type: "message_start", message: { usage: { input_tokens: 10, output_tokens: 1 } } },
      ...pieces.map((text) => ({ type: "content_block_delta", delta: { type: "text_delta", text } })),
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } },
    ]
      .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      .join(""),
  );

const sentMessages = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).messages;

afterEach(() => vi.unstubAllGlobals());

describe("cleanHistory", () => {
  it("drops empty lines, joins same-side turns and starts with the user", () => {
    expect(
      cleanHistory([
        { role: "assistant", content: "¡Hola!" },
        { role: "user", content: "Sí" },
        { role: "assistant", content: "  " },
        { role: "user", content: "¿Cuánto es?" },
      ]),
    ).toEqual([
      { role: "user", content: "(start)" },
      { role: "assistant", content: "¡Hola!" },
      { role: "user", content: "Sí\n¿Cuánto es?" },
    ]);
  });
});

describe("empty replies", () => {
  it("callClaude asks again once and sends a clean history", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json("")).mockResolvedValueOnce(json("Son 200 quetzales."));
    vi.stubGlobal("fetch", fetchMock);
    const reply = await callClaude({
      system: "s",
      messages: [
        { role: "user", content: "(start)" },
        { role: "assistant", content: "" },
        { role: "user", content: "¿Cuánto es?" },
      ],
      maxTokens: 50,
    });
    expect(reply.text).toBe("Son 200 quetzales.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentMessages(fetchMock.mock.calls[0]!)).toEqual([{ role: "user", content: "(start)\n¿Cuánto es?" }]);
  });

  it("callClaude fails after two empty replies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => json("  ")));
    await expect(callClaude({ system: "s", messages: [{ role: "user", content: "Hola" }], maxTokens: 50 })).rejects.toThrow(
      /empty reply/,
    );
  });

  it("streamClaude retries an empty stream without showing anything", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(sse(["", " "])).mockResolvedValueOnce(sse(["¡Cla", "ro!"])));
    const pieces: string[] = [];
    const reply = await streamClaude({
      system: "s",
      messages: [{ role: "user", content: "Hola" }],
      maxTokens: 50,
      onText: (piece) => pieces.push(piece),
    });
    expect(reply.text).toBe("¡Claro!");
    expect(pieces.join("")).toBe("¡Claro!");
  });
});

describe("cut sentences", () => {
  it("drops an unfinished 💡 line or the half sentence at the token cap", () => {
    expect(withoutCutSentence("¡Claro! Son 200.\n💡 Me podría dec", "max_tokens")).toBe("¡Claro! Son 200.");
    expect(withoutCutSentence("¡Claro! Son 200 quetzales. ¿Quiere pag", "max_tokens")).toBe("¡Claro! Son 200 quetzales.");
    expect(withoutCutSentence("¡Claro! ¿Algo más?\n💡 Bien.", "end_turn")).toBe("¡Claro! ¿Algo más?\n💡 Bien.");
    expect(lastFullSentence("Sin punto final")).toBe("Sin punto final");
  });

  it("bubbles keep whole sentences, ending with the last one", () => {
    const long = `${"Esta camisa es de algodón muy fino y viene en varios colores bonitos. ".repeat(3)}¿Quiere probársela?`;
    const text = bubbleText(`${long}\n💡 Corrección`);
    expect(text.endsWith("¿Quiere probársela?")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(220);
    expect(text.startsWith("Esta camisa")).toBe(true);
  });
});
