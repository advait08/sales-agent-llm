import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  get_account_iq, get_buyer_intent, get_relationship_paths, get_triggers,
  get_smart_links, get_crm_context, get_policy_envelope, get_calendar_availability,
  propose_send, schedule_follow_up, log_to_crm, request_intro, build_plan_card
} from './tools.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static UI
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- API routes (mocked) ----
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/agent/plan', async (req, res) => {
  try {
    const { account_id, lead_id, seat_id } = req.body || {};
    if (!account_id || !lead_id || !seat_id) return res.status(400).json({ error: 'account_id, lead_id, seat_id are required' });

    const useLLM = String(process.env.USE_LLM || 'false').toLowerCase() === 'true';
    if(useLLM){
      const { llmPlan } = await import('./llm.js');
      const result = await llmPlan({ account_id, lead_id, seat_id });
      return res.json(result);
    } else {
      const plan = await build_plan_card({ account_id, lead_id, seat_id });
      return res.json(plan);
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'internal_error', details: e?.message });
  }
});
    const plan = await build_plan_card({ account_id, lead_id, seat_id });
    res.json(plan);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/get_account_iq', async (req, res) => res.json(await get_account_iq({ account_id: String(req.query.account_id) })));
app.get('/api/get_buyer_intent', async (req, res) => res.json(await get_buyer_intent({ account_id: String(req.query.account_id) })));
app.get('/api/get_relationship_paths', async (req, res) => res.json(await get_relationship_paths({ lead_id: String(req.query.lead_id) })));
app.get('/api/get_triggers', async (req, res) => res.json(await get_triggers({ account_id: String(req.query.account_id), lead_id: String(req.query.lead_id) })));
app.get('/api/get_smart_links', async (req, res) => res.json(await get_smart_links({ account_id: String(req.query.account_id), persona: String(req.query.persona || 'VP Engineering') })));
app.get('/api/get_crm_context', async (req, res) => res.json(await get_crm_context({ lead_id: String(req.query.lead_id) })));
app.get('/api/get_policy_envelope', async (req, res) => res.json(await get_policy_envelope({ seat_id: String(req.query.seat_id) })));
app.get('/api/get_calendar_availability', async (req, res) => res.json(await get_calendar_availability({ seat_id: String(req.query.seat_id) })));

app.post('/api/propose_send', async (req, res) => res.json(await propose_send(req.body)));
app.post('/api/schedule_follow_up', async (req, res) => res.json(await schedule_follow_up(req.body)));
app.post('/api/log_to_crm', async (req, res) => res.json(await log_to_crm(req.body)));
app.post('/api/request_intro', async (req, res) => res.json(await request_intro(req.body)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Navigator Agent mock server running on http://localhost:${PORT}`);
});
