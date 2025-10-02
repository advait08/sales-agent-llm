async function api(path, opts={}){
  const res = await fetch(path, {headers:{'Content-Type':'application/json'}, ...opts});
  if(!res.ok){ throw new Error(await res.text()); }
  return res.json();
}

const output = document.getElementById('output');
document.getElementById('genBtn').addEventListener('click', async () => {
  const account_id = document.getElementById('accountId').value.trim();
  const lead_id = document.getElementById('leadId').value.trim();
  const seat_id = document.getElementById('seatId').value.trim();
  output.innerHTML = '<div class="card"><em>Generating plan…</em></div>';
  try {
    const plan = await api('/api/agent/plan', { method: 'POST', body: JSON.stringify({ account_id, lead_id, seat_id })});
    renderResult(plan);
  } catch (e) {
    output.innerHTML = '<div class="card"><strong>Error:</strong> ' + e.message + '</div>';
  }
});

function renderResult(data){
  if(data.type === 'plan_card'){ renderPlanCard(data); }
  else if(data.type === 'risk_pause'){ renderRiskPause(data); }
  else if(data.type === 'research_only'){ renderResearch(data); }
  else { output.innerHTML = '<div class="card">Unknown response</div>'; }
}

function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if(k==='class') e.className = v;
    else if(k==='text') e.textContent = v;
    else e.setAttribute(k,v);
  });
  (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c => e.appendChild(typeof c==='string'?document.createTextNode(c):c));
  return e;
}

function renderPlanCard(p){
  const badge = el('span', {class:'badge ' + p.risk.envelope_state, text:p.risk.envelope_state.toUpperCase()});
  const why = el('div', {}, p.why_now.map(s => el('span', {class:'badge'}, `${s.signal} (conf ${Math.round(s.confidence*100)}%)`)));
  const warm = el('ul', {}, p.warm_paths.map(w => el('li', {}, `${w.relationship} via ${w.via_contact_id} — “${w.intro_note}”`)));
  const draft = el('pre', {}, p.draft_message.text);

  const card = el('div', {class:'card'}, [
    el('h3', {text:`Plan for ${p.account_id} → ${p.lead_id}`}),
    el('div', {class:'row'}, [
      el('div', {class:'kv'}, `Channel: ${p.recommended_channel}`),
      el('div', {class:'kv'}, `Smart Link: ${p.smart_link.asset_id || 'none'}`),
      el('div', {class:'kv'}, `Persona: ${p.draft_message.persona}`),
      el('div', {class:'kv'}, `Follow-ups: open ${p.follow_up.if_open_no_reply_hours}h · click ${p.follow_up.if_click_no_reply_hours}h · no-eng ${p.follow_up.if_no_engagement_hours}h`),
      badge
    ]),
    el('div', {class:'section-title', text:'Why now'}),
    why,
    el('div', {class:'section-title', text:'Warm paths'}),
    warm,
    el('div', {class:'section-title', text:'Draft'}),
    draft,
    el('div', {class:'section-title', text:'Risk'}),
    el('p', {}, p.risk.explanation),
    el('div', {class:'actions'}, [
      btn('Approve & Queue Send', async () => {
        disableButtons(card, true);
        const resp = await api('/api/propose_send', { method:'POST', body: JSON.stringify({
          channel: p.recommended_channel,
          lead_id: p.lead_id,
          draft: p.draft_message.text,
          smart_link_asset_id: p.smart_link.asset_id,
          opt_out: p.draft_message.compliance.opt_out_hint
        })});
        alert('Queued send: ' + resp.id);
        disableButtons(card, false);
      }),
      btn('Log to CRM', async () => {
        disableButtons(card, true);
        const resp = await api('/api/log_to_crm', { method:'POST', body: JSON.stringify({
          lead_id: p.lead_id,
          account_id: p.account_id,
          activity_type: 'agent_plan',
          payload: p
        })});
        alert('Logged activity: ' + resp.id);
        disableButtons(card, false);
      }),
      btn('Schedule Follow-up', async () => {
        disableButtons(card, true);
        const resp = await api('/api/schedule_follow_up', { method:'POST', body: JSON.stringify({
          lead_id: p.lead_id,
          template: 'insight_drop',
          wait_hours: p.follow_up.if_open_no_reply_hours,
          auto_send: false
        })});
        alert('Follow-up scheduled');
        disableButtons(card, false);
      }, 'ghost')
    ])
  ]);
  output.innerHTML = '';
  output.appendChild(card);
}

function renderRiskPause(r){
  const card = el('div', {class:'card'}, [
    el('h3', {text:'Risk pause'}),
    el('p', {}, r.reason),
    el('ul', {}, r.suggested_remediation.map(s => el('li', {}, s)))
  ]);
  output.innerHTML = '';
  output.appendChild(card);
}

function renderResearch(r){
  const card = el('div', {class:'card'}, [
    el('h3', {text:'Research only'}),
    el('p', {}, r.reason),
    el('ul', {}, r.suggested_steps.map(s => el('li', {}, s)))
  ]);
  output.innerHTML = '';
  output.appendChild(card);
}

function btn(label, onClick, variant='secondary'){
  const b = el('button', {class: variant, text: label});
  b.addEventListener('click', onClick);
  return b;
}

function disableButtons(container, disabled){
  container.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
}
