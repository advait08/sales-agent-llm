import type { AgentOutput, PlanCard, RiskPause, ResearchOnly, EnvelopeState } from './types.js';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ---- Mocked READ tools ----
export async function get_account_iq({ account_id }: { account_id: string }) {
  return {
    account_id,
    summary: 'High-growth SaaS firm expanding into EU; engineering headcount +12%.',
    hiring: { trend: 'up', roles: ['Sales', 'Platform', 'Security'] },
    news: [{ title: 'Secured Series B funding', ts: '2025-09-05' }]
  };
}

export async function get_buyer_intent({ account_id }: { account_id: string }) {
  const levels = ['Low','Medium','High'] as const;
  const level = levels[Math.floor(Math.random() * levels.length)];
  const trend = ['Up','Flat','Down'][Math.floor(Math.random() * 3)];
  return { level, trend, ts: new Date().toISOString() };
}

export async function get_relationship_paths({ lead_id }: { lead_id: string }) {
  return [
    { via_contact_id: 'alex-chen', relationship: 'alumni', intro_note: 'Alex, quick intro to Dana at Acme re: SN agent and rep efficiency?' },
    { via_contact_id: 'priya-singh', relationship: 'coworker', intro_note: 'Priya, would you vouch for a short intro to Dana? Happy to share context first.' }
  ];
}

export async function get_triggers({ account_id, lead_id }: { account_id: string; lead_id: string }) {
  return [
    { type: 'job_change', text: 'VP Engineering joined 3 weeks ago', ts: '2025-09-10' },
    { type: 'post', text: 'Lead posted about pipeline quality and SDR tools', ts: '2025-09-28' }
  ];
}

export async function get_smart_links({ account_id, persona }: { account_id: string; persona: string }) {
  return [
    { asset_id: 'roi-onepager-v3', title: 'SN Agent ROI 1-pager', historical_performance: 'high_dwell' },
    { asset_id: 'playbook-lt', title: 'Low-volume High-relevance Playbook', historical_performance: 'medium_dwell' }
  ];
}

export async function get_crm_context({ lead_id }: { lead_id: string }) {
  return { last_touch_ts: '2025-09-18', open_opps: 0, notes: 'No prior contact from this seat.' };
}

export async function get_policy_envelope({ seat_id }: { seat_id: string }) {
  // Randomize envelope state mildly in favor of green
  const r = Math.random();
  let state: EnvelopeState = 'green';
  if (r > 0.85) state = 'red';
  else if (r > 0.65) state = 'yellow';
  return {
    state,
    credits: Math.floor(rand(5, 20)),
    ceilings: { inmail_daily: 50, connect_daily: 80 }
  };
}

export async function get_calendar_availability({ seat_id }: { seat_id: string }) {
  return {
    timeslots: ['2025-10-03T10:00Z','2025-10-03T15:00Z','2025-10-04T11:30Z']
  };
}

// ---- Mocked WRITE tools ----
export async function propose_send({ channel, lead_id, draft, smart_link_asset_id, opt_out } : any) {
  return { queued: true, channel, lead_id, id: 'send-'.concat(String(Math.floor(Math.random()*1e6))) };
}

export async function schedule_follow_up({ lead_id, template, wait_hours, auto_send }: any) {
  return { scheduled: true, lead_id, wait_hours, auto_send: !!auto_send };
}

export async function log_to_crm({ lead_id, account_id, activity_type, payload }: any) {
  return { logged: true, id: 'log-'.concat(String(Math.floor(Math.random()*1e6))) };
}

export async function request_intro({ via_contact_id, lead_id, note }: any) {
  return { sent: true, via_contact_id, lead_id };
}

// ---- Simple Agent Composer (mocked LLM) ----
export async function build_plan_card({ account_id, lead_id, seat_id }: { account_id: string; lead_id: string; seat_id: string }): Promise<AgentOutput> {
  const [accountIQ, intent, paths, triggers, assets, crm, envelope] = await Promise.all([
    get_account_iq({ account_id }),
    get_buyer_intent({ account_id }),
    get_relationship_paths({ lead_id }),
    get_triggers({ account_id, lead_id }),
    get_smart_links({ account_id, persona: 'VP Engineering' }),
    get_crm_context({ lead_id }),
    get_policy_envelope({ seat_id })
  ]);

  if (envelope.state === 'red') {
    const risk: RiskPause = {
      type: 'risk_pause',
      reason: 'Seat at red envelope: daily ceiling near or exceeded.',
      suggested_remediation: [
        `Queue warm intro via ${paths[0]?.via_contact_id ?? 'mutual'}`,
        'Defer 24h to reset envelope',
        'Switch to research-only and monitor intent spike confirmation'
      ]
    };
    return risk;
  }

  const why_now = [
    { signal: `BuyerIntent ${intent.level} (${intent.trend})`, evidence_tool: 'get_buyer_intent', confidence: intent.level === 'High' ? 0.85 : 0.65 },
    { signal: triggers[0]?.text ?? 'Recent relevant activity', evidence_tool: 'get_triggers', confidence: 0.78 }
  ];

  const draftText = `Dana—congrats on the new role. I noticed your team’s been leaning into outbound efficiency (intent activity is ${intent.trend.toLowerCase()} this week). Many eng-led orgs use Sales Navigator’s agent to cut research time and lift qualified meetings without increasing send volume. Here’s a 1-pager that outlines how teams reduced InMail burn while improving reply rate: <SmartLink>. If helpful, could we compare your current prospecting flow with what similar teams run in 15 minutes? Tue 11:00–11:30 or Thu 15:00–15:30 both work—happy to adjust or share notes async. If not relevant, reply ‘stop’ and I won’t follow up.`;

  const plan: PlanCard = {
    type: 'plan_card',
    account_id,
    lead_id,
    why_now,
    recommended_channel: 'inmail',
    warm_paths: paths.map(p => ({
      via_contact_id: p.via_contact_id,
      relationship: p.relationship,
      intro_note: p.intro_note
    })),
    smart_link: {
      asset_id: assets[0]?.asset_id ?? null,
      reason: 'Fast proof of value for VP Eng',
      send_now: true
    },
    draft_message: {
      persona: 'VP Engineering',
      length_words: draftText.split(/\s+/).length,
      text: draftText,
      compliance: { opt_out_hint: true, forbidden_claims: false }
    },
    follow_up: {
      if_open_no_reply_hours: 48,
      if_click_no_reply_hours: 24,
      if_no_engagement_hours: 96,
      angles: ['insight_drop','social_proof'],
      auto_send_allowed: false
    },
    risk: {
      envelope_state: envelope.state,
      explanation: envelope.state === 'yellow' ? 'Approaching daily ceilings; proceed with caution.' : 'Within daily ceilings and credits.'
    },
    next_actions: [
      { tool: 'propose_send', params: { channel: 'inmail' }, human_approval_required: true }
    ]
  };

  return plan;
}
