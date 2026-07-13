# Upgrade Copilot to Claude API

The Copilot bar currently uses a **rule-based answer engine** (`components/copilot/rules.ts`) with regex-matched canned responses. This document describes how to replace it with a real LLM-backed copilot using the Anthropic Messages API.

## Architecture Overview

```
CopilotBar  →  POST /api/copilot  →  Anthropic Messages API  →  streaming response
```

The client calls a serverless route instead of the local `answerFor()` function. The route streams the response back via the Web Streams API (`ReadableStream`).

## 1. Serverless Route

Create `app/api/copilot/route.ts`:

```ts
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const { question, surface, data } = await req.json();

  const systemPrompt = buildSystemPrompt(surface, data);
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

## 2. System Prompt

Build a context-aware system prompt using the surface and live data:

```ts
function buildSystemPrompt(surface: string, data: unknown): string {
  const base = `You are Meridian's electronics copilot. Answer questions about
components, parts, stock, pricing, and design. Be concise and technical.
Current surface: ${surface}.`;

  if (surface === "detail" && data) {
    return `${base}\n\nPart data (JSON):\n${JSON.stringify(data, null, 2)}`;
  }
  if (surface === "results" && data) {
    return `${base}\n\nSearch results (JSON):\n${JSON.stringify(data, null, 2)}`;
  }
  if (surface === "compare" && data) {
    return `${base}\n\nComparison data (JSON):\n${JSON.stringify(data, null, 2)}`;
  }
  return base;
}
```

## 3. Client Integration

Update `CopilotBar.tsx` to call the API route instead of `answerFor()`:

```ts
async function askAI(q: string, surface: Surface, data?: unknown): Promise<string> {
  const res = await fetch("/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q, surface, data }),
  });
  if (!res.ok) throw new Error("Copilot API error");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}
```

Keep `answerFor()` as a fallback for when `ANTHROPIC_API_KEY` is not set.

## 4. Environment Variable

Add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The route should check for this env var and fall back to the rule engine if missing:

```ts
if (!process.env.ANTHROPIC_API_KEY) {
  // Fall back to rules.ts answerFor()
}
```

## 5. Model Selection

Use `claude-sonnet-4-20250514` (Sonnet) for the copilot. It provides a good balance of speed, cost, and quality for electronics part Q&A. For deeper analysis tasks, consider `claude-opus-4-20250514`.

The repo's `claude-api` skill/guidance documents available model IDs and rate limits.

## 6. Cost Considerations

- Sonnet is ~$3/MTok input, $15/MTok output.
- A typical copilot Q&A exchanges ~500 tokens total = ~$0.001 per query.
- Keep `max_tokens` at 1024 to bound cost.
- Consider caching frequent queries in-memory or in Supabase.

## 7. Streaming UX

The `CopilotBar` already shows a "..." typing indicator while waiting. With streaming, replace the typing indicator with a progressive text render — the bubble appears immediately and fills in as tokens arrive. Use the same 700ms minimum delay before showing the first token to feel responsive.

## 8. Migration Steps

1. Add `@anthropic-ai/sdk` to `package.json` dependencies.
2. Create `app/api/copilot/route.ts` with the streaming handler.
3. Update `CopilotBar.tsx` to prefer the API route, fall back to `answerFor()`.
4. Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel env.
5. Test with the same preset questions from `rules.ts` — answers should be similar but more nuanced.
