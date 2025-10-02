export type EnvelopeState = 'green' | 'yellow' | 'red';

export interface WhyNowSignal {
  signal: string;
  evidence_tool: string;
  confidence: number; // 0..1
}

export interface WarmPath {
  via_contact_id: string;
  relationship: 'alumni' | 'coworker' | 'mutual_connection';
  intro_note: string;
}

export interface SmartLinkInfo {
  asset_id: string | null;
  reason: string;
  send_now: boolean;
}

export interface DraftMessage {
  persona: string;
  length_words: number;
  text: string;
  compliance: {
    opt_out_hint: boolean;
    forbidden_claims: boolean;
  };
}

export interface FollowUpPlan {
  if_open_no_reply_hours: number;
  if_click_no_reply_hours: number;
  if_no_engagement_hours: number;
  angles: Array<'social_proof' | 'insight_drop' | 'question'>;
  auto_send_allowed: boolean;
}

export interface RiskInfo {
  envelope_state: EnvelopeState;
  explanation: string;
}

export interface NextAction {
  tool: 'propose_send' | 'request_intro' | 'schedule_follow_up' | 'log_to_crm';
  params: Record<string, unknown>;
  human_approval_required: boolean;
}

export interface PlanCard {
  type: 'plan_card';
  account_id: string;
  lead_id: string;
  why_now: WhyNowSignal[];
  recommended_channel: 'inmail' | 'connect' | 'warm_intro' | 'wait';
  warm_paths: WarmPath[];
  smart_link: SmartLinkInfo;
  draft_message: DraftMessage;
  follow_up: FollowUpPlan;
  risk: RiskInfo;
  next_actions: NextAction[];
}

export interface RiskPause {
  type: 'risk_pause';
  reason: string;
  suggested_remediation: string[];
}

export interface ResearchOnly {
  type: 'research_only';
  reason: string;
  suggested_steps: string[];
}

export type AgentOutput = PlanCard | RiskPause | ResearchOnly;
