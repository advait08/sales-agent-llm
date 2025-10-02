import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AgentOutput } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'system-full.md');

export const OutputSchema = z.union([
  z.object({
    type: z.literal('plan_card'),
    account_id: z.string(),
    lead_id: z.string(),
    why_now: z.array(z.object({
      signal: z.string(),
      evidence_tool: z.string(),
      confidence: z.number().min(0).max(1)
    })),
    recommended_channel: z.enum(['inmail','connect','warm_intro','wait']),
    warm_paths: z.array(z.object({
      via_contact_id: z.string(),
      relationship: z.enum(['alumni','coworker','mutual_connection']),
      intro_note: z.string()
    })),
    smart_link: z.object({
      asset_id: z.string().nullable(),
      reason: z.string(),
      send_now: z.boolean()
    }),
    draft_message: z.object({
      persona: z.string(),
      length_words: z.number(),
      text: z.string(),
      compliance: z.object({
        opt_out_hint: z.boolean(),
        forbidden_claims: z.boolean()
      })
    }),
    follow_up: z.object({
      if_open_no_reply_hours: z.number(),
      if_click_no_reply_hours: z.number(),
      if_no_engagement_hours: z.number(),
      angles: z.array(z.enum(['social_proof','insight_drop','question'])),
      auto_send_allowed: z.boolean()
    }),
    risk: z.object({
      envelope_state: z.enum(['green','yellow','red']),
      explanation: z.string()
    }),
    next_actions: z.array(z.object({
      tool: z.enum(['propose_send','request_intro','schedule_follow_up','log_to_crm']),
      params: z.record(z.any()),
      human_approval_required: z.boolean()
    }))
  }),
  z.object({
    type: z.literal('risk_pause'),
    reason: z.string(),
    suggested_remediation: z.array(z.string())
  }),
  z.object({
    type: z.literal('research_only'),
    reason: z.string(),
    suggested_steps: z.array(z.string())
  })
]);

export type LLMProvider = 'openai'|'azure-openai';

export interface PlanInputs {
  account_id: string;
  lead_id: string;
  seat_id: string;
  // You can pass pre-fetched signals to reduce token usage
  signals?: Record<string, unknown>;
}

function loadSystemPrompt(): string {
  return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
}

function messagesFor(inputs: PlanInputs, systemPrompt: string){
  const user = {
    task: 'plan_outreach',
    account_id: inputs.account_id,
    lead_id: inputs.lead_id,
    seat_id: inputs.seat_id,
    notes: "Return only a single JSON object of type plan_card | risk_pause | research_only.",
    // Optional: small hints so LLM can request certain tools hypothetically.
    preferred_persona: "VP Engineering"
  };
  const developer = {
    info: "Your runtime exposes mocked tool endpoints; assume you can call them implicitly. You MUST include concrete signals and a single draft message 120–180 words with trigger -> value -> CTA."
  };
  return [
    { role: 'system', content: systemPrompt },
    { role: 'developer', content: JSON.stringify(developer) },
    { role: 'user', content: JSON.stringify(user) }
  ] as Array<{role:'system'|'developer'|'user', content: string}>;
}

export async function llmPlan(inputs: PlanInputs): Promise<AgentOutput> {
  const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;
  const systemPrompt = loadSystemPrompt();
  const msgs = messagesFor(inputs, systemPrompt);

  if(provider === 'openai'){
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined
    });

    // Prefer chat.completions for broad compatibility. Model must support JSON mode reliably.
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: msgs.map(m => ({ role: m.role as any, content: m.content }))
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error('LLM did not return valid JSON'); }
    const validated = OutputSchema.parse(parsed);
    return validated as AgentOutput;
  }

  // Placeholder for Azure OpenAI
  throw new Error(`LLM provider '${provider}' not implemented. Set USE_LLM=false to use mock planner.`);
}
