// KI-Anbindung – Oberfläche, für jede KI (Claude, Codex, Gemini, lokale Modelle …). Der Motor steckt in Hostwerk
// (/claude …, /mind …, /projects – die Pfade heißen aus Kompatibilitätsgründen weiter „claude“): Status, Anbindung,
// Spar-Werkzeuge, Verbrauch. Alles, was etwas ändert (Datei schreiben, Werkzeug installieren, Claude Desktop verbinden),
// bestätigt Hostwerk vorher; Befehle tippt die Erweiterung nur ins Terminal – starten tust du sie selbst mit Enter.
// Was nur für Claude gilt (Claude Desktop, Claude Code, Token-Messung, die meisten Tipps), ist so gekennzeichnet.
const { html, t, raw } = Hostwerk;
const $ = (id) => document.getElementById(id);
const enc = encodeURIComponent;
const I = (name, size) => raw(CL.icon(name, size));
const lang = () => (Hostwerk.info().lang === 'en' ? 'en' : 'de');
const L = (x) => (x ? x[lang()] || x.de : '');
const declined = (e) => /Abgelehnt|Declined/.test(e.message);
const fail = (e) => { if (!declined(e)) Hostwerk.toast(e.message, { kind: 'error' }); };
const n = (x) => Hostwerk.fmt.number(x || 0);

let tab = 'go';
let st = null;         // /claude/status
let projects = null;   // /projects
let pid = null;        // gewähltes Projekt
let goal = '';
let tools = null;      // /claude/tools
let usage = null;      // /claude/tools/usage
let measuring = false;
let tipCat = '';
let tipQ = '';
let templates = [];    // eigene Auftrags-Vorlagen (Hostwerk.storage – für alle, die dieses Hostwerk nutzen)
let settings = {};     // manifest.settings (Token-Tagesgrenze)
let loadError = null;  // Grunddaten nicht geladen → Fehlerzustand mit „Erneut versuchen“
let agent = 'claude';  // gewähltes KI-Werkzeug für „Loslegen“ (claude | codex | gemini)
let client = null;     // gewählte KI-App unter „Verbinden“ (CL.CLIENTS)
const locale = () => Hostwerk.lang || 'de';

// Andere KI-Werkzeuge im Terminal meldet Hostwerk ab 3.0 (st.agents); ältere Versionen kennen nur Claude
const agentInfo = (id) => ((st && st.agents) || []).find((a) => a.id === id) || null;
const agentInstalled = (id) => (id === 'claude' ? !!(st && st.installed) : !!(agentInfo(id) && agentInfo(id).installed));
const agentConnected = (id) => (id === 'claude' ? !!(st && st.codeConnected) : !!(agentInfo(id) && agentInfo(id).connected));
const agentsHere = () => CL.AGENTS.filter((a) => a.id === 'claude' || agentInfo(a.id));
const connected = () => !!(st && ((st.desktop && st.desktop.connected) || st.codeConnected || (st.agents || []).some((a) => a.connected)));
const project = () => (projects || []).find((p) => p.id === pid) || null;

async function loadBase() {
  [st, projects] = await Promise.all([Hostwerk.get('/claude/status'), Hostwerk.get('/projects').catch(() => [])]);
  try { templates = (await Hostwerk.storage.get('templates')) || []; } catch { templates = []; }
  try { const a = await Hostwerk.storage.get('agent'); if (a && CL.AGENTS.some((x) => x.id === a)) agent = a; } catch { /* Standard: Claude Code */ }
  try { const c = await Hostwerk.storage.get('client'); if (c && CL.CLIENTS.some((x) => x.id === c)) client = c; } catch { /* noch keine Wahl */ }
  try { settings = (await Hostwerk.settings.get()) || {}; } catch { settings = {}; }
  if (!pid) { try { pid = await Hostwerk.storage.get('project'); } catch { pid = null; } }
  if (!pid || !projects.some((p) => p.id === pid)) pid = projects[0] ? projects[0].id : null;
}
const setProject = (id) => { pid = id; Hostwerk.storage.set('project', id).catch(() => {}); };
const projectPicker = (id) => (projects && projects.length
  ? html`<select class="select" id="${id}" aria-label="${t('project')}">${projects.map((p) => html`<option value="${p.id}" ${p.id === pid ? raw('selected') : ''}>${p.name}</option>`)}</select>`
  : html`<div class="small muted">${t('noProjects')}</div>`);

/* ================================================================ Loslegen */
const TERM_ART = raw(`<svg class="cl-term" viewBox="0 0 260 170" aria-hidden="true">
  <rect class="win" x="4" y="4" width="252" height="162" rx="14"/><rect class="bar" x="4" y="4" width="252" height="24" rx="14"/><rect class="bar" x="4" y="18" width="252" height="10"/>
  <circle class="dot" cx="22" cy="16" r="4"/><circle class="dot" cx="36" cy="16" r="4"/><circle class="dot" cx="50" cy="16" r="4"/>
  <path class="line" d="M24 52h90M24 72h140M24 92h70"/>
  <path class="prompt" d="M24 118l8 7-8 7"/><path class="typed" d="M42 125h90"/><rect class="cursor" x="136" y="117" width="8" height="16" rx="2"/>
  <path class="spark" d="M206 104l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>
</svg>`);

function renderGo() {
  if (!st) return;
  const p = project();
  if (!agentsHere().some((a) => a.id === agent)) agent = 'claude';
  const ag = CL.agentOf(agent);
  const cmd = CL.startCommand(goal, { connected: agentConnected(agent), lang: lang(), agent });
  const chromium = (st.browsers || []).filter((b) => b.engine === 'chromium');
  const ring = (ok, ico) => (ok
    ? raw(`<svg class="cl-ring" viewBox="0 0 38 38" aria-hidden="true"><circle class="bg" cx="19" cy="19" r="16"/><circle class="fg" cx="19" cy="19" r="16"/><path class="tick" d="m12 19.5 5 5 9-10"/></svg>`)
    : raw(`<svg class="cl-ring" viewBox="0 0 38 38" aria-hidden="true"><circle class="bg" cx="19" cy="19" r="16"/><g class="ico" transform="translate(11 11)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CL.ICON[ico]}</svg></g></svg>`));
  Hostwerk.render('#go', html`<div class="cl-stack cl-fade">
    <div class="cl-hero">
      <div>
        <h2>${t('goTitle')}</h2>
        <div class="small muted">${t('goText')}</div>
        <div class="cl-form">
          <div class="row-tight" style="flex-wrap:wrap"><label class="label" for="goProject">${t('project')}</label>${projectPicker('goProject')}</div>
          ${agentsHere().length > 1 ? html`<div class="row-tight" style="flex-wrap:wrap"><span class="label" id="goAgentLbl">${t('agentLabel')}</span><div class="seg" role="group" aria-labelledby="goAgentLbl">${agentsHere().map((a) => html`<button type="button" class="${a.id === agent ? 'on' : ''}" aria-pressed="${a.id === agent ? 'true' : 'false'}" data-agent="${a.id}">${a.label}${agentInstalled(a.id) ? '' : html` <span class="tiny muted">(${t('notInstalled')})</span>`}</button>`)}</div></div>` : ''}
          <textarea class="input" id="goal" placeholder="${t('goalPlaceholder')}" aria-label="${t('goalLabel')}">${goal}</textarea>
          <div class="cl-chips">${CL.TASKS.map((x) => html`<button type="button" class="cl-chip" data-task="${x.id}">${I(x.icon, 14)}${x[lang()][0]}</button>`)}
            ${templates.map((x) => html`<span class="cl-chip cl-own"><button type="button" class="cl-chip-btn" data-own="${x.id}" title="${x.text}">${I('star', 14)}${x.title}</button><button type="button" class="cl-chip-x" data-own-del="${x.id}" aria-label="${t('tplRemove', { name: x.title })}" title="${t('tplRemove', { name: x.title })}">×</button></span>`)}</div>
          <div class="row-tight cl-tpl"><button type="button" class="btn xs ghost" id="tplSave" ${goal.trim() ? '' : raw('disabled')}>${I('star', 13)}${t('tplSave')}</button><button type="button" class="btn xs ghost" id="tplShare" ${templates.length ? '' : raw('disabled')}>${I('copy', 13)}${t('tplShare')}</button><button type="button" class="btn xs ghost" id="tplImport">${I('download', 13)}${t('tplImport')}</button></div>
          <div id="tplForm"></div>
          <div class="cl-cmd" title="${t('cmdPreview')}">${p ? `${p.path}> ` : ''}${cmd}</div>
          <div class="row-tight" style="flex-wrap:wrap">
            <button class="btn primary" id="goStart" ${!p || !goal.trim() ? raw('disabled') : ''}>${I('play', 14)}${t('startWithGoal')}</button>
            <button class="btn" id="goOpen" ${!p ? raw('disabled') : ''}>${I('terminal', 14)}${t('justOpen', { name: ag.label })}</button>
          </div>
          <div class="tiny muted">${t('goHint')}${agentConnected(agent) ? ' ' + t('goHintConnected') : ' ' + t('goHintConnect')}</div>
        </div>
      </div>
      ${TERM_ART}
    </div>
    <div class="card"><div class="card-head">${I('download')}<h3>${t('installTitle')}</h3></div>
      <div class="card-body"><div class="cl-tiles">
        <div class="cl-tile ${st.desktop.installed ? 'ok' : ''}" style="animation-delay:0ms"><div class="cl-tile-top">${ring(st.desktop.installed, 'monitor')}<div class="grow"><b>${t('desktopApp')}</b> <span class="badge">${t('forClaude')}</span><div class="tiny muted">${st.desktop.supported ? (st.desktop.installed ? t('installedHere') : t('forWinMac')) : t('desktopLinux')}</div></div></div>
          ${st.desktop.installed ? '' : html`<button class="btn sm" data-url="${st.desktop.download}">${I('external', 14)}${t('download')}</button>`}</div>
        <div class="cl-tile ${st.installed ? 'ok' : ''}" style="animation-delay:70ms"><div class="cl-tile-top">${ring(st.installed, 'terminal')}<div class="grow"><b>${t('codeInTerminal')}</b><div class="tiny muted">${st.installed ? t('installedVersion', { v: st.version || '' }) : t('officialInstaller')}</div></div></div>
          ${st.installed ? '' : html`<button class="btn sm primary" id="installCode">${I('play', 14)}${t('install')}</button>`}</div>
        ${(st.agents || []).map((a, i) => html`<div class="cl-tile ${a.installed ? 'ok' : ''}" style="animation-delay:${140 + i * 70}ms"><div class="cl-tile-top">${ring(a.installed, 'terminal')}<div class="grow"><b>${a.label}</b><div class="tiny muted">${a.installed ? t('installedHere') : t('npmInstaller')}</div></div></div>
          <div class="row-tight" style="flex-wrap:wrap">${a.installed ? '' : html`<button class="btn sm" data-install="${a.id}">${I('play', 14)}${t('install')}</button>`}<button class="btn sm ghost" data-url="${a.docs}">${I('book', 14)}${t('guide')}</button></div></div>`)}
        <div class="cl-tile" style="animation-delay:${140 + (st.agents || []).length * 70}ms"><div class="cl-tile-top">${ring(false, 'globe')}<div class="grow"><b>${t('inBrowser')}</b><div class="tiny muted">${(st.browsers || []).length ? t('foundBrowsers', { list: st.browsers.map((b) => b.label).join(', ') }) : t('noBrowser')}</div></div></div>
          <div class="row-tight" style="flex-wrap:wrap"><button class="btn sm" data-url="${st.web}">${I('external', 14)}claude.ai</button><button class="btn sm" data-url="https://chatgpt.com">${I('external', 14)}ChatGPT</button><button class="btn sm" data-url="https://gemini.google.com">${I('external', 14)}Gemini</button>${chromium.length || !(st.browsers || []).length ? html`<button class="btn sm ghost" data-url="${st.chrome}">${I('external', 14)}Claude in Chrome</button>` : ''}</div></div>
      </div></div>
      <div class="card-body" style="padding-top:0"><button class="btn ghost sm" data-url="${st.docs}">${I('book', 14)}${t('docs')}</button></div>
    </div>
  </div>`);
  const pick = $('goProject'); if (pick) pick.onchange = () => { setProject(pick.value); renderGo(); };
  const ta = $('goal');
  ta.oninput = () => { goal = ta.value; const b = $('goStart'); if (b) b.disabled = !project() || !goal.trim(); document.querySelector('.cl-cmd').textContent = `${project() ? project().path + '> ' : ''}${CL.startCommand(goal, { connected: agentConnected(agent), lang: lang(), agent })}`; };
  for (const b of document.querySelectorAll('[data-agent]')) b.onclick = () => { agent = b.dataset.agent; Hostwerk.storage.set('agent', agent).catch(() => {}); renderGo(); };
  for (const b of document.querySelectorAll('[data-install]')) b.onclick = () => { const a = agentInfo(b.dataset.install); if (a) Hostwerk.terminal(a.install, { title: t('installAgentTitle', { name: a.label }) }).then(() => Hostwerk.toast(t('typedInTerminal'), { kind: 'success' })).catch(fail); };
  for (const b of document.querySelectorAll('[data-task]')) b.onclick = () => { const x = CL.TASKS.find((y) => y.id === b.dataset.task); if (!goal.trim()) { goal = x[lang()][1]; renderGo(); const a = $('goal'); a.focus(); a.setSelectionRange(goal.length, goal.length); } };
  wireTemplates();
  const run = (withGoal) => {
    const pr = project(); if (!pr) return;
    if (!agentInstalled(agent)) { Hostwerk.toast(t('agentMissing', { name: ag.label }), { kind: 'error' }); return; }
    Hostwerk.terminal(withGoal ? CL.startCommand(goal, { connected: agentConnected(agent), lang: lang(), agent }) : ag.bin, { cwd: pr.path, title: `${ag.label} · ${pr.name}` })
      .then(() => Hostwerk.toast(t('typedInTerminal'), { kind: 'success' })).catch(fail);
  };
  $('goStart').onclick = () => run(true);
  $('goOpen').onclick = () => run(false);
  const inst = $('installCode'); if (inst) inst.onclick = () => Hostwerk.terminal(st.install.cmd, { title: t('installCodeTitle'), shell: st.install.shell }).then(() => Hostwerk.toast(t('typedInTerminal'), { kind: 'success' })).catch(fail);
  wireUrls();
}
function wireUrls() { for (const b of document.querySelectorAll('[data-url]')) b.onclick = () => Hostwerk.openUrl(b.dataset.url).catch(fail); }

/* ================================================================ Verbinden */
const LINK = (on, glyph) => raw(`<svg class="cl-link ${on ? 'on' : ''}" viewBox="0 0 120 40" aria-hidden="true"><rect class="node" x="2" y="6" width="28" height="28" rx="8"/><g transform="translate(8 12)"><svg width="16" height="16" viewBox="0 0 24 24" class="glyph">${CL.ICON[glyph]}</svg></g><path class="wire" d="M31 20h58"/><rect class="node b" x="90" y="6" width="28" height="28" rx="8"/><g transform="translate(96 12)"><svg width="16" height="16" viewBox="0 0 24 24" class="glyph">${CL.ICON.sparkles}</svg></g></svg>`);

/** Status einer KI-App: verbunden / installiert / unbekannt (Apps mit Einstellungsdatei meldet Hostwerk nicht). */
function clientState(c) {
  if (!st) return null;
  if (c.how === 'desktop') return st.desktop.connected ? 'connected' : st.desktop.installed ? 'installed' : 'missing';
  if (c.how === 'cli') return agentConnected(c.agent) ? 'connected' : agentInstalled(c.agent) ? 'installed' : (c.agent === 'claude' || agentInfo(c.agent)) ? 'missing' : null;
  return null;
}
const clientName = (c) => c.label || t('otherClient');

/** Einrichtung der gewählten App: Hostwerk trägt sich ein, tippt den offiziellen Befehl oder liefert die Einstellungen. */
function clientDetail(c, clients) {
  const s = clientState(c);
  const docs = html`<button class="btn sm ghost" data-url="${c.docs}">${I('book', 13)}${t('guide')}</button>`;
  if (c.how === 'desktop') {
    const d = st.desktop;
    return html`<div class="stack" style="gap:var(--sp-3)">${LINK(d.connected, 'monitor')}
      <div class="small muted">${t('desktopText')}</div>
      <div class="row-tight" style="flex-wrap:wrap">${d.connected ? html`<button class="btn" id="deskOff">${t('disconnect')}</button>` : html`<button class="btn primary" id="deskOn" ${d.supported ? '' : raw('disabled')}>${I('link', 14)}${t('connectDesktop')}</button>`}
        ${!d.installed && d.supported ? html`<button class="btn ghost" data-url="${d.download}">${I('download', 14)}${t('getDesktop')}</button>` : ''}${docs}</div>
      ${!d.supported ? html`<div class="small muted">${t('desktopLinux')}</div>` : ''}
      ${d.wanted && !d.connected ? html`<div class="info-line warn"><span>${t('desktopOverwritten')}</span></div>` : ''}</div>`;
  }
  if (c.how === 'cli') {
    const can = c.agent === 'claude' || (clients && clients.commands && clients.commands[c.agent]);
    return html`<div class="stack" style="gap:var(--sp-3)">${LINK(s === 'connected', 'terminal')}
      <div class="small muted">${t('cliOneText', { name: clientName(c) })}</div>
      <div class="row-tight" style="flex-wrap:wrap">${s === 'missing' || !can ? html`<span class="small muted grow">${t('installFirst', { name: clientName(c) })}</span>` : html`<button class="btn ${s === 'connected' ? '' : 'primary'}" data-cli="${c.id}">${I('link', 14)}${s === 'connected' ? t('reconnect') : t('connectNamed', { name: clientName(c) })}</button>`}${docs}</div></div>`;
  }
  const conf = clients ? CL.clientConfig(c.id, clients.json) : '';
  const where = !c.file ? t('otherClientText') : /^~/.test(c.file) ? t('clientFileText', { file: c.file }) : t('clientProjectFileText', { file: c.file });
  return html`<div class="stack" style="gap:var(--sp-3)">
    <div class="small muted">${where}</div>
    ${conf ? html`<pre class="cl-cmd cl-conf" tabindex="0" aria-label="${t('mcpSettings')}">${conf}</pre>` : html`<div class="small muted">${t('needsNewerHostwerk')}</div>`}
    <div class="row-tight" style="flex-wrap:wrap">${conf ? html`<button class="btn primary" id="copyConf">${I('copy', 14)}${t('copyMcp')}</button>` : ''}${c.file ? html`<button class="btn ghost" id="copyPath">${I('copy', 14)}${t('copyPath')}</button>` : ''}${docs}</div></div>`;
}

async function renderConnect() {
  if (!st) return;
  let targets = [];
  if (pid) { try { targets = await Hostwerk.get(`/claude/targets/${enc(pid)}`); } catch { targets = []; } }
  let kg = null; try { kg = await Hostwerk.get('/knowledge'); } catch { kg = null; }
  // Befehle (Claude Code, Codex, Gemini CLI) und MCP-Einstellungen für alle anderen Apps (Hostwerk ab 3.0)
  let code = null; try { code = await Hostwerk.get('/claude/connect/code'); } catch { code = null; }
  const clients = code && code.clients ? code.clients : null;
  // Ohne Wahl: die erste verbundene App – sonst wählt man selbst
  const cur = client ? CL.clientOf(client) : CL.CLIENTS.find((c) => clientState(c) === 'connected') || null;
  const badge = (c) => { const s = clientState(c); return s === 'connected' ? html`<span class="cl-dot ok" title="${t('connected')}"></span>` : s === 'installed' ? html`<span class="cl-dot" title="${t('installed')}"></span>` : ''; };
  Hostwerk.render('#connect', html`<div class="grid grid-2 cl-fade">
    <div class="card cl-wide"><div class="card-head">${I('plug')}<h3>${t('clientsTitle')}</h3></div>
      <div class="card-body stack" style="gap:var(--sp-3)">
        <div class="small muted">${t('clientsText')}</div>
        <div class="cl-chips" role="group" aria-label="${t('clientsTitle')}">${CL.CLIENTS.map((c) => html`<button type="button" class="cl-chip ${cur && cur.id === c.id ? 'on' : ''}" aria-pressed="${cur && cur.id === c.id ? 'true' : 'false'}" data-client="${c.id}">${I(c.icon, 14)}${clientName(c)}${badge(c)}</button>`)}</div>
        ${cur ? html`<div class="cl-client"><h4 class="cl-client-title">${clientName(cur)}</h4>${clientDetail(cur, clients)}</div>` : html`<div class="small muted">${t('pickClient')}</div>`}
      </div></div>
    <div class="card"><div class="card-head">${I('file')}<h3>${t('otherTools')}</h3></div>
      <div class="card-body stack" style="gap:var(--sp-3)">
        <div class="small muted">${t('otherToolsText')}</div>
        ${projectPicker('conProject')}
        ${targets.map((x) => html`<div class="row-tight"><span class="grow small"><b>${x.label}</b> <span class="tiny muted">${x.file}</span></span>${x.has ? html`<span class="badge ok">${t('included')}</span>` : ''}<button class="btn xs" data-target="${x.id}">${x.has ? t('update') : t('include')}</button></div>`)}
      </div></div>
    <div class="card"><div class="card-head">${I('graph')}<h3>${t('kgTitle')}</h3>${kg ? html`<span class="badge">${t('kgBuilt', { n: kg.sources.filter((s) => s.built).length })}</span>` : ''}</div>
      <div class="card-body stack" style="gap:var(--sp-3)">
        <div class="small muted">${t('kgText')}</div>
        <div class="row-tight" style="flex-wrap:wrap"><button class="btn primary" id="openKg">${I('graph', 14)}${t('openKg')}</button><button class="btn ghost" id="copyCtx">${I('copy', 14)}${t('copyContext')}</button></div>
        <div class="row-tight" style="flex-wrap:wrap"><button class="btn sm ghost" data-url="${st.web}">${I('external', 13)}claude.ai</button><button class="btn sm ghost" data-url="https://chatgpt.com">${I('external', 13)}ChatGPT</button><button class="btn sm ghost" data-url="https://gemini.google.com">${I('external', 13)}Gemini</button></div>
        <div class="tiny muted">${t('kgHint')}</div>
      </div></div>
  </div>`);
  const desk = async (on) => { try { const r = await Hostwerk.post('/claude/connect/desktop', { on }); Hostwerk.toast(on ? (r && r.restarted ? t('deskRestarted') : t('deskNextStart')) : t('deskRemoved'), { kind: 'success' }); st = await Hostwerk.get('/claude/status'); renderConnect(); } catch (e) { fail(e); } };
  if ($('deskOn')) $('deskOn').onclick = () => desk(true);
  if ($('deskOff')) $('deskOff').onclick = () => desk(false);
  for (const b of document.querySelectorAll('[data-client]')) b.onclick = () => { client = b.dataset.client; Hostwerk.storage.set('client', client).catch(() => {}); renderConnect(); };
  for (const b of document.querySelectorAll('[data-cli]')) b.onclick = async () => {
    const c = CL.clientOf(b.dataset.cli);
    try { const cmd = c.agent === 'claude' ? code.command : clients.commands[c.agent]; await Hostwerk.terminal(cmd, { title: t('connectAgentTitle', { name: clientName(c) }) }); Hostwerk.toast(t('typedInTerminal'), { kind: 'success' }); } catch (e) { fail(e); }
  };
  if ($('copyConf')) $('copyConf').onclick = () => Hostwerk.copy(CL.clientConfig(cur.id, clients.json)).then(() => Hostwerk.toast(t('mcpCopied'), { kind: 'success' })).catch(fail);
  if ($('copyPath')) $('copyPath').onclick = () => Hostwerk.copy(cur.file).then(() => Hostwerk.toast(t('pathCopied'), { kind: 'success' })).catch(fail);
  const cp = $('conProject'); if (cp) cp.onchange = () => { setProject(cp.value); renderConnect(); };
  for (const b of document.querySelectorAll('[data-target]')) b.onclick = async () => {
    try { const c = await Hostwerk.get(`/mind/context?clusters=ich,allgemein&project=${enc(pid)}`); const r = await Hostwerk.post(`/claude/write/${enc(pid)}`, { target: b.dataset.target, markdown: c.md }); Hostwerk.toast(t(r.created ? 'created' : 'updated', { file: r.file }), { kind: 'success' }); renderConnect(); } catch (e) { fail(e); }
  };
  $('openKg').onclick = () => Hostwerk.navigate('/ext/knowledge-graph').catch(fail);
  $('copyCtx').onclick = async () => { try { const c = await Hostwerk.get('/mind/context?clusters=ich,allgemein'); await Hostwerk.copy(c.md); Hostwerk.toast(t('contextCopied'), { kind: 'success' }); } catch (e) { fail(e); } };
  wireUrls();
}

/* ================================================================ Token sparen */
function chart(days) {
  if (!days.length) return '';
  const W = 640; const H = 150; const pad = 22; const s = CL.usageSummary(days);
  const bw = (W - pad) / days.length;
  const bars = days.map((x, i) => { const h = Math.max(2, ((x.total || 0) / s.max) * (H - pad - 6)); const xx = pad + i * bw + bw * 0.15; return `<rect class="bar" x="${xx.toFixed(1)}" y="${(H - pad - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="3" style="animation-delay:${i * 35}ms"><title>${String(x.date).replace(/[<&]/g, '')}: ${n(x.total)}</title></rect>`; }).join('');
  const labels = days.map((x, i) => (i % 2 === 0 ? `<text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${String(x.date).slice(5).replace(/[<&]/g, '')}</text>` : '')).join('');
  return raw(`<svg class="cl-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${Hostwerk.esc(t('chartLabel'))}"><line class="axis" x1="${pad}" y1="${H - pad}" x2="${W}" y2="${H - pad}"/>${bars}${labels}</svg>`);
}
function saveMeter(text) {
  // „30–60 %“ → Balken bis zur oberen Grenze (nur Anzeige der Herstellerangabe)
  const m = String(text || '').match(/(\d+)\s*(?:[–-]\s*(\d+))?\s*%/);
  if (!m) return '';
  const v = Math.min(95, Number(m[2] || m[1]));
  return html`<div class="cl-save"><span class="tiny muted">${t('savings')}</span><div class="cl-meter"><i style="width:${v}%"></i></div><b class="small">${text}</b></div>`;
}
const KIND = (k) => t(`kind_${k}`);
/** Tagesgrenze aus den Einstellungen: heutiger Verbrauch als Balken, Benachrichtigung kommt von Hostwerk (Server-Teil). */
function budget(days) {
  const limit = Number(settings.dailyTokens) || 0;
  if (!limit) return html`<div class="small muted">${t('budgetOff')} <button type="button" class="btn xs ghost" id="budgetSet">${t('budgetSet')}</button></div>`;
  const b = CL.budgetState(days, limit);
  return html`<div class="callout ${b.level === 'over' ? 'err' : b.level === 'warn' ? 'warn' : ''}"><div class="callout-body"><b class="callout-title">${t('budgetTitle', { limit: n(limit) })}</b>
    <div class="small">${b.today == null ? t('budgetUnknown') : t('budgetToday', { used: n(b.today), pct: b.pct })}</div>
    ${b.today == null ? '' : html`<div class="cl-meter cl-budget"><i style="width:${Math.min(100, b.pct)}%"></i></div>`}
    <div class="tiny muted">${t('budgetHint')} <button type="button" class="btn xs ghost" id="budgetSet">${t('budgetChange')}</button></div></div></div>`;
}
async function renderTokens() {
  if (!tools) { Hostwerk.render('#tokens', html`<div class="hw-skeleton" style="height:240px"></div>`); try { tools = await Hostwerk.get('/claude/tools'); } catch (e) { fail(e); return; } }
  const d = tools; const list = d.tools.filter((x) => !x.builtin);
  const days = (usage && usage.days) || []; const s = CL.usageSummary(days);
  Hostwerk.render('#tokens', html`<div class="cl-stack cl-fade">
    <div class="small muted">${t('tokensClaudeOnly')}</div>
    ${!d.claude ? html`<div class="callout warn"><b>${t('codeNotFound')}</b> ${t('codeNotFoundText')}</div>` : ''}
    ${budget(days)}
    <div class="grid grid-2">
      <div class="card"><div class="card-head">${I('gauge')}<h3>${t('usageTitle')}</h3><span class="small muted">${t('usageSub')}</span><div class="right"><button class="btn sm" id="measure" ${measuring ? raw('disabled') : ''}>${I('refresh', 14)}${measuring ? t('measuring') : usage ? t('measureAgain') : t('measure')}</button></div></div>
        <div class="card-body stack" style="gap:var(--sp-3)">${!usage ? html`<div class="small muted">${t('usageIntro')}</div>`
          : usage.error ? html`<div class="small muted">${usage.error}</div>`
          : !days.length ? html`<div class="small muted">${t('noSessions')}</div>`
          : html`${chart(days)}<div class="cl-kpis"><div class="cl-kpi"><b>${n(s.total)}</b><span>${t('kpiTotal')}</span></div><div class="cl-kpi"><b>${n(s.avg)}</b><span>${t('kpiAvg')}</span></div><div class="cl-kpi"><b>${n(s.cacheRead)}</b><span>${t('kpiCache')}</span></div>${s.trend != null ? html`<div class="cl-kpi"><b class="${s.trend <= 0 ? 'down' : 'up'}">${s.trend > 0 ? '+' : ''}${s.trend} %</b><span>${t('kpiTrend')}</span></div>` : ''}</div>`}</div></div>
      <div class="card"><div class="card-head">${I('refresh')}<h3>${t('careTitle')}</h3></div>
        <div class="card-body stack" style="gap:var(--sp-3)">
          <label class="row-tight"><input type="checkbox" id="autoUpd" ${d.autoUpdate ? raw('checked') : ''}><span class="grow"><b class="small">${t('autoUpdate')}</b><div class="tiny muted">${t('autoUpdateText')}</div></span></label>
          <div class="small"><b>${d.mcp.length}</b> ${t('mcpCount')}${d.mcp.length ? `: ${d.mcp.join(', ')}` : ''} <span class="muted">${t('mcpCost')}</span></div>
          <button class="btn ghost sm" id="toTips">${I('bulb', 14)}${t('moreTips')}</button>
        </div></div>
    </div>
    <div class="cl-tools">${list.map((x, i) => html`<div class="cl-tool ${x.installed ? 'on' : ''}" style="animation-delay:${i * 50}ms">
      <div class="cl-tool-head"><h3>${x.name}</h3>${x.recommended ? html`<span class="badge ok">${I('star', 11)} ${t('recommended')}</span>` : ''}<span class="badge">${KIND(x.kind)}</span><span class="badge">${x.area}</span></div>
      <div class="cl-tool-body"><div class="small">${x.summary}</div>${saveMeter(x.savings)}
        <div class="cl-procon"><ul class="pro">${(x.pros || []).map((p) => html`<li>${I('check', 13)}<span>${p}</span></li>`)}</ul><ul class="con">${(x.cons || []).map((p) => html`<li>${I('bulb', 13)}<span>${p}</span></li>`)}</ul></div>
        <div class="tiny muted">${t('licence', { l: x.license, tel: x.telemetry })}</div></div>
      <div class="cl-tool-foot">${x.installed ? html`<span class="small"><span class="cl-live ${x.active ? 'on' : ''}"></span> ${x.active ? t('active') : t('hookMissing')}${x.version ? ` · ${x.version}` : ''}${x.update ? html`<b class="c-warn"> → ${x.latest}</b>` : ''}</span>` : html`<span class="small muted">${x.manual ? t('manual') : x.platformOk === false ? t('noAutoWay') : t('notInstalled')}</span>`}
        <div class="right">
          ${x.installable && !x.installed ? html`<button class="btn sm primary" data-act="install" data-id="${x.id}">${I('download', 14)}${t('install')}</button>` : ''}
          ${x.installed && x.update ? html`<button class="btn sm primary" data-act="update" data-id="${x.id}">${I('refresh', 14)}${t('update')}</button>` : ''}
          ${x.installed && x.installable && !x.active ? html`<button class="btn sm" data-act="install" data-id="${x.id}">${I('plug', 14)}${t('setUp')}</button>` : ''}
          ${x.installed && x.installable ? html`<button class="btn sm ghost" data-act="remove" data-id="${x.id}">${I('trash', 14)}${t('remove')}</button>` : ''}
          ${x.manual ? html`<button class="btn sm" data-url="${x.manual}">${I('book', 14)}${t('guide')}</button>` : ''}
          <button class="btn sm ghost" data-url="https://github.com/${x.repo}">${I('external', 14)}GitHub</button>
        </div></div></div>`)}</div>
    <div class="card"><div class="card-head">${I('shield')}<h3>${t('compare')}</h3></div>
      <div class="table-wrap"><table class="table small"><thead><tr><th>${t('tool')}</th><th>${t('kind')}</th><th>${t('area')}</th><th>${t('savings')}</th><th>${t('licenceCol')}</th><th>${t('telemetry')}</th><th>${t('here')}</th></tr></thead>
        <tbody>${d.tools.map((x) => html`<tr><td><b>${x.name}</b></td><td>${KIND(x.kind)}</td><td>${x.area}</td><td>${x.savings}</td><td>${x.license}</td><td>${x.telemetry}</td><td>${x.installed ? html`<span class="c-ok">${t('installed')}</span>` : x.installable ? t('oneClick') : x.builtin ? t('builtIn') : t('byHand')}</td></tr>`)}</tbody></table></div>
      <div class="card-body tiny muted">${t('compareHint')}</div></div>
    <div class="card" id="discover"><div class="card-head">${I('compass')}<h3>${t('discoverTitle')}</h3><span class="small muted">${t('discoverSub')}</span></div><div class="card-body"><div class="hw-skeleton" style="height:60px"></div></div></div>
  </div>`);
  $('measure').onclick = measure;
  if ($('budgetSet')) $('budgetSet').onclick = () => Hostwerk.settings.open();
  $('toTips').onclick = () => Hostwerk.setTab('tips');
  $('autoUpd').onchange = async (e) => { try { await Hostwerk.put('/claude/tools', { autoUpdate: e.target.checked }); tools = null; renderTokens(); } catch (er) { e.target.checked = !e.target.checked; fail(er); } };
  for (const b of document.querySelectorAll('[data-act]')) b.onclick = () => toolAction(b.dataset.id, b.dataset.act, b);
  wireUrls();
  loadDiscover();
}
async function measure() {
  measuring = true; renderTokens();
  try { usage = await Hostwerk.get('/claude/tools/usage'); } catch (e) { usage = { error: e.message }; }
  measuring = false; renderTokens();
}
async function toolAction(id, action, btn) {
  btn.disabled = true;
  const before = JSON.stringify((tools.tools.find((x) => x.id === id) || {}));
  try {
    await Hostwerk.post(`/claude/tools/${enc(id)}/${action}`, {});
    Hostwerk.toast(t('runsInBackground'), { kind: 'info' });
    // Fortschritt zeigt Hostwerk unten rechts; hier nachladen, sobald sich der Stand des Werkzeugs ändert
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const nt = await Hostwerk.get('/claude/tools');
      if (JSON.stringify(nt.tools.find((x) => x.id === id) || {}) !== before) { tools = nt; break; }
    }
  } catch (e) { fail(e); }
  tools = null; if (tab === 'tokens') renderTokens();
}
async function loadDiscover() {
  let list;
  try { list = await Hostwerk.get('/claude/tools/discover'); } catch (e) { list = { error: e.message }; }
  const box = document.querySelector('#discover .card-body'); if (!box) return;
  Hostwerk.render(box, list.error ? html`<div class="small muted">${list.error}</div>` : !list.length ? html`<div class="small muted">${t('discoverNone')}</div>`
    : html`${list.map((r) => html`<div class="list-item">${I('sparkles', 15)}<div class="grow small" style="min-width:0"><b>${r.repo}</b><div class="tiny muted">${r.description || ''}</div></div><span class="tiny muted">${I('star', 11)} ${n(r.stars)}</span><button class="btn xs ghost" data-url="${r.url}">${I('external', 13)}</button></div>`)}<div class="tiny muted" style="margin-top:var(--sp-2)">${t('discoverHint')}</div>`);
  wireUrls();
}

/* ================================================================ Tipps & Tricks */
const CAT_ART = {
  context: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  prompt: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
  hostwerk: CL.ICON.graph,
};
async function renderTips() {
  if (!tools) { try { tools = await Hostwerk.get('/claude/tools'); } catch { tools = { tips: [], tools: [], mcp: [] }; } }
  const own = CL.filterTips(CL.TIPS, { cat: tipCat, q: tipQ, lang: lang() });
  const extra = (tools.tips || []).filter((x) => !tipCat && (!tipQ || `${x.title} ${x.text}`.toLowerCase().includes(tipQ.toLowerCase())));
  const art = (cat) => raw(`<svg class="cl-cat-art" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_ART[cat] || CL.ICON.bulb}</svg>`);
  Hostwerk.render('#tips', html`<div class="cl-stack cl-fade">
    <div class="small muted">${t('tipsIntro')}</div>
    <div class="cl-tipbar">
      <input class="input" id="tipQ" type="search" placeholder="${t('tipSearch')}" aria-label="${t('tipSearch')}" value="${tipQ}">
      <div class="seg" role="group" aria-label="${t('categories')}"><button class="${tipCat ? '' : 'on'}" aria-pressed="${tipCat ? 'false' : 'true'}" data-cat="">${t('all')}</button>${CL.CATS.map((c) => html`<button class="${tipCat === c.id ? 'on' : ''}" aria-pressed="${tipCat === c.id ? 'true' : 'false'}" data-cat="${c.id}">${L(c)}</button>`)}</div>
    </div>
    ${!own.length && !extra.length ? html`<div class="empty"><b>${t('noTips')}</b></div>` : ''}
    <div class="cl-tips">${own.map((x, i) => { const [title, text] = x[lang()] || x.de; const code = lang() === 'en' && x.codeEn ? x.codeEn : x.code; const key = lang() === 'en' && x.keyEn ? x.keyEn : x.key; return html`<article class="cl-tip" style="animation-delay:${Math.min(i, 12) * 35}ms">
      <div class="cl-tip-top"><div class="cl-tip-art">${art(x.cat)}</div><h3>${title}</h3>${x.only === 'claude' ? html`<span class="badge">Claude Code</span>` : ''}</div>
      <p>${text}</p>
      <div class="cl-tip-foot">${key ? html`<span class="cl-key">${key}</span>` : ''}${code ? html`<code class="cl-cmd">${code}</code><button class="btn xs ghost" data-copy="${code}" title="${t('copy')}" aria-label="${t('copy')}">${I('copy', 13)}</button>` : ''}${x.action ? html`<button class="btn xs" data-go="${x.action}">${t(`go_${x.action}`)}</button>` : ''}</div>
    </article>`; })}</div>
    ${extra.length ? html`<div class="card"><div class="card-head">${I('bulb')}<h3>${t('catalogTips')}</h3></div>${extra.map((x) => html`<div class="list-item">${I('bulb', 14)}<div class="grow small"><b>${x.title}</b><div class="tiny muted">${x.text}</div></div></div>`)}</div>` : ''}
  </div>`);
  const q = $('tipQ'); q.oninput = () => { tipQ = q.value; clearTimeout(renderTips.tm); renderTips.tm = setTimeout(() => { renderTips().then(() => { const e = $('tipQ'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); }); }, 180); };
  for (const b of document.querySelectorAll('[data-cat]')) b.onclick = () => { tipCat = b.dataset.cat; renderTips(); };
  for (const b of document.querySelectorAll('[data-copy]')) b.onclick = () => Hostwerk.copy(b.dataset.copy).then(() => Hostwerk.toast(t('copied'), { kind: 'success' })).catch(fail);
  for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => (b.dataset.go === 'graph' ? Hostwerk.navigate('/ext/knowledge-graph') : Hostwerk.setTab(b.dataset.go)).catch(fail);
}

/* ================================================================ Memory for every AI */
// Hostwerk adds the thought net (about you, general, per project) to the system prompt of EVERY AI provider –
// local or online. Everything here is adjustable: on/off, which areas, the attached project's area, an excerpt of the
// knowledge graph, size limit and per provider. Private notes never leave Hostwerk; online providers additionally get
// secrets blacked out (privacy settings per provider in the AI assistant).
let mem = null;
let memPreview = null;
let memProvider = '';
async function renderMemory() {
  try { mem = await Hostwerk.get('/ai/memory-share'); } catch (e) { Hostwerk.render('#memory', html`<div class="card"><div class="empty"><b>${t('memUnavailable')}</b><p class="small muted">${e.message}</p></div></div>`); return; }
  const P = mem.available.providers; if (!memProvider || !P.some((x) => x.id === memProvider)) memProvider = (P[0] || {}).id || '';
  const cl = mem.available.clusters.filter((c) => c.kind !== 'project');
  const sw = (id, on, label) => html`<label class="cl-sw"><input type="checkbox" id="${id}" ${on ? raw('checked') : ''}><span>${label}</span></label>`;
  Hostwerk.render('#memory', html`<div class="cl-stack cl-fade">
    <div class="cl-mem-hero"><div class="cl-mem-orb" aria-hidden="true">${I('sparkles', 26)}</div><div><h2>${t('memTitle')}</h2><p class="muted">${t('memText')}</p></div>
      <label class="cl-sw big"><input type="checkbox" id="mOn" ${mem.on ? raw('checked') : ''}><span>${mem.on ? t('memOn') : t('memOff')}</span></label></div>
    ${!mem.mindOn ? html`<div class="callout warn"><div class="callout-body small">${t('memMindOff')}</div></div>` : ''}
    <div class="grid grid-2">
      <div class="card"><div class="card-head">${I('book')}<h3>${t('memWhat')}</h3></div><div class="card-body cl-stack" style="gap:var(--sp-2)">
        ${cl.map((c) => sw(`mc-${c.id}`, mem.clusters.includes(c.id), c.title))}
        ${sw('mProj', mem.project, t('memProject'))}
        ${sw('mGraph', mem.graph, t('memGraph'))}
        <label class="label" for="mMax">${t('memMax', { n: n(mem.maxTokens) })}</label>
        <input type="range" id="mMax" min="200" max="8000" step="100" value="${mem.maxTokens}" aria-valuetext="${n(mem.maxTokens)} Tokens">
        <p class="tiny muted" style="margin:0">${t('memPrivate')}</p>
      </div></div>
      <div class="card"><div class="card-head">${I('bot')}<h3>${t('memWho')}</h3></div><div class="card-body cl-stack" style="gap:var(--sp-2)">
        ${P.map((p) => sw(`mp-${p.id}`, mem.providers[p.id] !== false, p.label))}
        <p class="tiny muted" style="margin:0">${t('memWhoHint')}</p>
      </div></div>
    </div>
    <div class="card"><div class="card-head">${I('eye')}<h3>${t('memPreview')}</h3><div class="right row-tight"><select class="select" id="mPv" aria-label="${t('memPreviewFor')}">${P.map((p) => html`<option value="${p.id}" ${p.id === memProvider ? raw('selected') : ''}>${p.label}</option>`)}</select><button class="btn sm" id="mPvGo">${t('memShow')}</button></div></div>
      <div class="card-body">${memPreview == null ? html`<p class="small muted" style="margin:0">${t('memPreviewHint')}</p>` : memPreview.text ? html`<div class="tiny muted" style="margin-bottom:var(--sp-2)">≈ ${n(memPreview.tokens)} Tokens</div><pre class="cl-mem-pre">${memPreview.text}</pre>` : html`<p class="small muted" style="margin:0">${t('memNothing')}</p>`}</div></div>
  </div>`);
  const save = async (body) => { try { mem = { ...mem, ...(await Hostwerk.put('/ai/memory-share', body)) }; memPreview = null; renderMemory(); } catch (e) { fail(e); renderMemory(); } };
  $('mOn').onchange = (e) => save({ on: e.target.checked });
  for (const c of cl) $(`mc-${c.id}`).onchange = (e) => save({ clusters: e.target.checked ? [...new Set([...mem.clusters, c.id])] : mem.clusters.filter((x) => x !== c.id) });
  $('mProj').onchange = (e) => save({ project: e.target.checked });
  $('mGraph').onchange = (e) => save({ graph: e.target.checked });
  $('mMax').onchange = (e) => save({ maxTokens: Number(e.target.value) });
  for (const p of P) $(`mp-${p.id}`).onchange = (e) => save({ providers: { ...mem.providers, [p.id]: e.target.checked } });
  $('mPv').onchange = (e) => { memProvider = e.target.value; };
  $('mPvGo').onclick = async () => { try { memPreview = await Hostwerk.post('/ai/memory-share/preview', { provider: memProvider, question: '' }); renderMemory(); } catch (e) { fail(e); } };
}

/* ================================================================ Protokoll */
async function renderLog() {
  let list = [];
  try { list = await Hostwerk.get('/mind/activity'); } catch (e) { fail(e); }
  const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? t('justNow') : m < 60 ? t('minAgo', { m }) : m < 1440 ? t('hAgo', { h: Math.round(m / 60) }) : new Date(ts).toLocaleDateString(locale()); };
  Hostwerk.render('#log', html`<div class="card cl-fade"><div class="card-head">${I('bot')}<h3>${t('logTitle')}</h3><span class="badge ${connected() ? 'ok' : ''}">${connected() ? t('connected') : t('notConnected')}</span></div>
    ${!list.length ? html`<div class="card-body small muted">${connected() ? t('logEmpty') : t('logNotConnected')}</div>` : html`<div class="card-body cl-log">${list.slice(0, 200).map((x, i) => html`<div class="cl-log-row" style="animation-delay:${Math.min(i, 15) * 20}ms">${I(x.action === 'read' ? 'book' : 'sparkles', 14)}<span class="grow"><b>${x.client}</b> ${t(`act_${x.action}`)}: ${x.text}</span><span class="tiny muted">${ago(x.at)}</span></div>`)}</div>`}
  </div>`);
}

/* ================================================================ Rahmen */
/* ================================================================ Eigene Vorlagen */
const saveTemplates = async (list) => { templates = list; try { await Hostwerk.storage.set('templates', list); } catch (e) { fail(e); } renderGo(); };
function wireTemplates() {
  for (const b of document.querySelectorAll('[data-own]')) b.onclick = () => { const x = templates.find((y) => y.id === b.dataset.own); if (x) { goal = x.text; renderGo(); const a = $('goal'); a.focus(); a.setSelectionRange(goal.length, goal.length); } };
  for (const b of document.querySelectorAll('[data-own-del]')) b.onclick = () => saveTemplates(templates.filter((y) => y.id !== b.dataset.ownDel));
  const form = (body) => Hostwerk.render('#tplForm', body);
  const save = $('tplSave');
  if (save) save.onclick = () => {
    form(html`<div class="row-tight cl-tpl-form"><input class="input grow" id="tplName" maxlength="40" placeholder="${t('tplName')}" aria-label="${t('tplName')}"><button class="btn sm primary" id="tplOk">${t('tplSaveShort')}</button></div>`);
    const name = $('tplName'); name.focus();
    const ok = () => { const title = name.value.trim(); if (!title) return; saveTemplates([...templates.filter((y) => y.title !== title), ...CL.cleanTemplates([{ title, text: goal }])].slice(-30)); Hostwerk.toast(t('tplSaved'), { kind: 'success' }); };
    $('tplOk').onclick = ok; name.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
  };
  const share = $('tplShare');
  if (share) share.onclick = () => Hostwerk.copy(CL.exportTemplates(templates)).then(() => Hostwerk.toast(t('tplCopied'), { kind: 'success' })).catch(fail);
  const imp = $('tplImport');
  if (imp) imp.onclick = () => {
    form(html`<div class="stack cl-tpl-form"><textarea class="input mono" id="tplText" rows="3" placeholder="${t('tplPaste')}" aria-label="${t('tplPaste')}"></textarea><div class="row-tight"><button class="btn sm primary" id="tplImpOk">${t('tplImportShort')}</button></div></div>`);
    $('tplImpOk').onclick = () => {
      const got = CL.importTemplates($('tplText').value);
      if (!got.length) { Hostwerk.toast(t('tplNothing'), { kind: 'error' }); return; }
      const titles = new Set(got.map((x) => x.title));
      saveTemplates([...templates.filter((y) => !titles.has(y.title)), ...got].slice(-30));
      Hostwerk.toast(t('tplImported', { n: got.length }), { kind: 'success' });
    };
  };
}

/* ================================================================ Aktionen (Kürzel, Schnellsuche, „Neu“, Wissensgraph) */
function runAction(a) {
  if (!a || !a.id) return;
  if (a.id === 'graph-claude') goal = lang() === 'en' ? 'Use the knowledge graph of this project (gedankennetz_lesen) to answer first: ' : 'Nutze zuerst den Wissensgraphen dieses Projekts (gedankennetz_lesen), um zu beantworten: ';
  if (['start-claude', 'graph-claude', 'claude-go'].includes(a.id)) {
    if (Hostwerk.embed === 'page' && tab !== 'go') Hostwerk.setTab('go').catch(() => {});
    show('go');
    setTimeout(() => { const el = $('goal'); if (el) { el.focus(); el.setSelectionRange(goal.length, goal.length); } }, 50);
  }
}

function showError() {
  const box = document.querySelector(`[data-tab="${tab}"] > div`);
  if (box) Hostwerk.render(box, html`<div class="card"><div class="empty"><h3>${t('loadFailed')}</h3><p class="small muted">${loadError}</p><button class="btn primary empty-action" id="retry">${I('refresh', 14)}${t('retry')}</button></div></div>`);
  const b = $('retry');
  if (b) b.onclick = async () => { try { await loadBase(); loadError = null; show(tab); } catch (e) { loadError = e.message; showError(); } };
}

function show(next) {
  // Als Reiter im Bereich „Projekte“ (contributes.tabs) gibt es nur „Loslegen“
  tab = Hostwerk.embed === 'tab' ? 'go' : next || 'go';
  if (loadError && ['go', 'connect', 'log'].includes(tab)) { for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab; showError(); return; }
  for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab;
  const fn = { memory: renderMemory, go: renderGo, connect: renderConnect, tokens: renderTokens, tips: renderTips, log: renderLog }[tab];
  if (fn) Promise.resolve(fn()).catch(fail);
}
Hostwerk.ready().then(async (info) => {
  tab = info.tab || 'go';
  Hostwerk.on('tab', show);
  Hostwerk.on('lang', () => show(tab));
  Hostwerk.on('action', runAction);
  Hostwerk.on('settings', (v) => { settings = v || {}; if (tab === 'tokens') show(tab); });
  try { await loadBase(); } catch (e) { loadError = e.message; }
  show(tab);
  if (info.action) runAction(info.action);
  // Stand auffrischen (Verbindung, Installation): wenn der Reiter wieder sichtbar wird und sonst selten –
  // nie im Hintergrund und ohne eine Eingabe zu stören
  const refresh = async () => {
    if (document.hidden || loadError || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) return;
    try { const ns = await Hostwerk.get('/claude/status'); if (JSON.stringify(ns) !== JSON.stringify(st)) { st = ns; if (tab === 'go' || tab === 'connect' || tab === 'log') show(tab); } } catch { /* offline */ }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('focus', refresh);
  setInterval(refresh, 60000);
});
