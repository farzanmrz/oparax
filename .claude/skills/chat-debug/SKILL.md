---
name: chat-debug
description: Debug the Oparax new-agent chat's reasoning/tool/logic flow by dispatching a subagent that converses with it via the /api/agents/chat-debug dev endpoint (no browser, no pnpm) and reports the transcript + findings.
---

# chat-debug

Debug the Oparax new-agent chat by dispatching a general-purpose subagent that acts as a reporter setting up an agent. The subagent conversations over HTTP with the dev-only `/api/agents/chat-debug` endpoint and returns a full transcript with reasoning, tool calls, and logic observations.

## Precondition

The dev server must be running at `http://localhost:3000` before invoking this skill.

## How to debug

Dispatch a general-purpose subagent with instructions to:

1. Choose a `sessionId` (any UUID or short string, e.g. `"dbg-$(date +%s)"`).
2. For each turn, POST to `http://localhost:3000/api/agents/chat-debug` with JSON body:
   ```json
   { "sessionId": "<id>", "userMessage": "<text>", "userEmail": "<email>" }
   ```
3. Read the returned `{ text, reasoning, toolCalls, durationMs }`.
4. Decide the next realistic user message based on the agent's reply and loop until the target flow is exercised — for example: beat → clarification → sources → "give me your best handles and websites" → voice step → confirm.
5. Report the full transcript: per turn, print reasoning (if any), each tool call (name, input, output), the final assistant text, and elapsed seconds. Then summarise any logic issues observed (wrong tool order, missing verification, unexpected skips, etc.).

`userEmail` defaults to `farzanmrz@gmail.com` (X connected — covers voice/X-connected paths). Pass `testuser@oparax.com` to exercise the not-connected path.

Pass `"reset": true` in the first request to clear any previous session with that id.

## Endpoint reference

**POST** `http://localhost:3000/api/agents/chat-debug`

Request body:
```json
{
  "sessionId": "dbg1",
  "userMessage": "monitor FC Barcelona news",
  "userEmail": "farzanmrz@gmail.com",
  "reset": false
}
```

Response body:
```json
{
  "text": "<assistant reply>",
  "reasoning": "<model reasoning or null>",
  "toolCalls": [
    { "name": "verifyHandles", "input": { "handles": ["FCBarcelona"] }, "output": { ... } }
  ],
  "durationMs": 4200
}
```

The endpoint is **dev/preview only** — it returns 404 in production. No auth required (service-role is used server-side to resolve the user).

## Example curl

```bash
curl -s localhost:3000/api/agents/chat-debug \
  -H 'content-type: application/json' \
  -d '{"sessionId":"dbg1","userMessage":"monitor FC Barcelona news"}'
```

Subsequent turns reuse the same `sessionId` and carry full conversation context automatically.
