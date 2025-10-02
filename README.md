# Navigator Agent — Replit Skeleton (TypeScript/Node)

This is a minimal skeleton for a **Sales Navigator Agent** with mocked tool endpoints and a tiny web UI to render plan cards.

## Quick start (on Replit or locally)
```bash
npm install
npm run dev
# open http://localhost:3000
```

## What’s inside
- **Express + TypeScript** server
- **Mocked tool endpoints** under `/api/*`
- **Agent plan endpoint** (`POST /api/agent/plan`) that composes mock signals and returns a **plan_card** JSON
- **Static web UI** in `/public` that calls the plan endpoint and renders a plan card with an **Approve Send** button (which calls `propose_send` mock)

## Files
- `src/server.ts` — Express app + routes
- `src/tools.ts` — Mocked tool functions (get_buyer_intent, get_triggers, get_policy_envelope, etc.)
- `src/types.ts` — Shared TypeScript types including the **plan_card** schema
- `public/index.html`, `public/app.js`, `public/styles.css` — Tiny UI
- `prompts/system.md` — System prompt you can paste into your LLM provider

## Notes
- All endpoints are **mocked** and return static or randomly varied data.
- The UI shows: Why Now, Draft, Warm Paths, Smart Link, Risk, and action buttons.
- Replace the mock agent in `src/tools.ts` with real LLM calls and LinkedIn-approved integrations.


---

## Use a real LLM (OpenAI) instead of mocks

1. Copy `.env.example` to `.env` and set:
```
USE_LLM=true
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# (optional) OPENAI_BASE_URL=
```
2. `npm install` (adds `openai` + `zod`)
3. `npm run dev`
4. In the UI, **Generate Plan** now uses the LLM. You should still see strict JSON (`plan_card | risk_pause | research_only`).

If you prefer to keep it mocked, leave `USE_LLM=false`.

### Where the prompt lives
- Full system prompt: `prompts/system-full.md`
- Short system prompt: `prompts/system.md`

### Validation
We use **zod** to validate the LLM JSON before returning it to the UI (see `src/llm.ts`). If validation fails, check your model selection or prompt.

