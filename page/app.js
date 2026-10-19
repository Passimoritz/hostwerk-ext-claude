// Claude – Oberfläche. Der Motor steckt in Hostwerk (/claude …, /mind …, /projects): Status, Anbindung, Spar-Werkzeuge,
// Verbrauch. Alles, was etwas ändert (Datei schreiben, Werkzeug installieren, Claude Desktop verbinden), bestätigt
// Hostwerk vorher; Befehle tippt die Erweiterung nur ins Terminal – starten tust du sie selbst mit Enter.
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

const connected = () => !!(st && ((st.desktop && st.desktop.connected) || st.codeConnected));
const project = () => (projects || []).find((p) => p.id === pid) || null;

async function loadBase() {
  [st, projects] = await Promise.all([Hostwerk.get('/claude/status'), Hostwerk.get('/projects').catch(() => [])]);
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
  const cmd = CL.startCommand(goal, { connected: connected(), lang: lang() });
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
          <textarea class="input" id="goal" placeholder="${t('goalPlaceholder')}" aria-label="${t('goalLabel')}">${goal}</textarea>
          <div class="cl-chips">${CL.TASKS.map((x) => html`<button type="button" class="cl-chip" data-task="${x.id}">${I(x.icon, 14)}${x[lang()][0]}</button>`)}</div>
          <div class="cl-cmd" title="${t('cmdPreview')}">${p ? `${p.path}> ` : ''}${cmd}</div>
          <div class="row-tight" style="flex-wrap:wrap">
            <button class="btn primary" id="goStart" ${!p || !goal.trim() ? raw('disabled') : ''}>${I('play', 14)}${t('startWithGoal')}</button>
            <button class="btn" id="goOpen" ${!p ? raw('disabled') : ''}>${I('terminal', 14)}${t('justOpen')}</button>
          </div>
          <div class="tiny muted">${t('goHint')}${connected() ? ' ' + t('goHintConnected') : ' ' + t('goHintConnect')}</div>
        </div>
      </div>
      ${TERM_ART}
    </div>
    <div class="card"><div class="card-head">${I('download')}<h3>${t('installTitle')}</h3></div>
      <div class="card-body"><div class="cl-tiles">
        <div class="cl-tile ${st.desktop.installed ? 'ok' : ''}" style="animation-delay:0ms"><div class="cl-tile-top">${ring(st.desktop.installed, 'monitor')}<div class="grow"><b>${t('desktopApp')}</b><div class="tiny muted">${st.desktop.supported ? (st.desktop.installed ? t('installedHere') : t('forWinMac')) : t('desktopLinux')}</div></div></div>
          ${st.desktop.installed ? '' : html`<button class="btn sm" data-url="${st.desktop.download}">${I('external', 14)}${t('download')}</button>`}</div>
        <div class="cl-tile ${st.installed ? 'ok' : ''}" style="animation-delay:70ms"><div class="cl-tile-top">${ring(st.installed, 'terminal')}<div class="grow"><b>${t('codeInTerminal')}</b><div class="tiny muted">${st.installed ? t('installedVersion', { v: st.version || '' }) : t('officialInstaller')}</div></div></div>
          ${st.installed ? '' : html`<button class="btn sm primary" id="installCode">${I('play', 14)}${t('install')}</button>`}</div>
        <div class="cl-tile" style="animation-delay:140ms"><div class="cl-tile-top">${ring(false, 'globe')}<div class="grow"><b>${t('inBrowser')}</b><div class="tiny muted">${(st.browsers || []).length ? t('foundBrowsers', { list: st.browsers.map((b) => b.label).join(', ') }) : t('noBrowser')}</div></div></div>
          <div class="row-tight" style="flex-wrap:wrap"><button class="btn sm" data-url="${st.web}">${I('external', 14)}${t('openWeb')}</button>${chromium.length || !(st.browsers || []).length ? html`<button class="btn sm ghost" data-url="${st.chrome}">${I('external', 14)}Claude in Chrome</button>` : ''}</div></div>
      </div></div>
      <div class="card-body" style="padding-top:0"><button class="btn ghost sm" data-url="${st.docs}">${I('book', 14)}${t('docs')}</button></div>
    </div>
  </div>`);
  const pick = $('goProject'); if (pick) pick.onchange = () => { setProject(pick.value); renderGo(); };
  const ta = $('goal');
  ta.oninput = () => { goal = ta.value; const b = $('goStart'); if (b) b.disabled = !project() || !goal.trim(); document.querySelector('.cl-cmd').textContent = `${project() ? project().path + '> ' : ''}${CL.startCommand(goal, { connected: connected(), lang: lang() })}`; };
  for (const b of document.querySelectorAll('[data-task]')) b.onclick = () => { const x = CL.TASKS.find((y) => y.id === b.dataset.task); if (!goal.trim()) { goal = x[lang()][1]; renderGo(); const a = $('goal'); a.focus(); a.setSelectionRange(goal.length, goal.length); } };
  const run = (withGoal) => {
    const pr = project(); if (!pr) return;
    if (!st.installed) { Hostwerk.toast(t('codeMissing'), { kind: 'error' }); return; }
    Hostwerk.terminal(withGoal ? CL.startCommand(goal, { connected: connected(), lang: lang() }) : 'claude', { cwd: pr.path, title: `Claude · ${pr.name}` })
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

async function renderConnect() {
  if (!st) return;
  const d = st.desktop;
  let targets = [];
  if (pid) { try { targets = await Hostwerk.get(`/claude/targets/${enc(pid)}`); } catch { targets = []; } }
  let kg = null; try { kg = await Hostwerk.get('/knowledge'); } catch { kg = null; }
  Hostwerk.render('#connect', html`<div class="grid grid-2 cl-fade">
    <div class="card"><div class="card-head">${I('monitor')}<h3>Claude Desktop</h3><span class="badge ${d.connected ? 'ok' : ''}">${d.connected ? t('connected') : d.installed ? t('installed') : t('notFound')}</span></div>
      <div class="card-body stack" style="gap:10px">${LINK(d.connected, 'monitor')}
        <div class="small muted">${t('desktopText')}</div>
        <div class="row-tight" style="flex-wrap:wrap">${d.connected ? html`<button class="btn" id="deskOff">${t('disconnect')}</button>` : html`<button class="btn primary" id="deskOn" ${d.supported ? '' : raw('disabled')}>${I('link', 14)}${t('connectDesktop')}</button>`}
          ${!d.installed && d.supported ? html`<button class="btn ghost" data-url="${d.download}">${I('download', 14)}${t('getDesktop')}</button>` : ''}</div>
        ${d.wanted && !d.connected ? html`<div class="info-line warn"><span>${t('desktopOverwritten')}</span></div>` : ''}
      </div></div>
    <div class="card"><div class="card-head">${I('terminal')}<h3>Claude Code</h3><span class="badge ${st.codeConnected ? 'ok' : ''}">${st.codeConnected ? t('connected') : st.installed ? t('installed') : t('notFound')}</span></div>
      <div class="card-body stack" style="gap:10px">${LINK(st.codeConnected, 'terminal')}
        <div class="small muted">${t('codeText')}</div>
        <div class="row-tight">${st.installed ? html`<button class="btn ${st.codeConnected ? '' : 'primary'}" id="codeConnect">${I('link', 14)}${st.codeConnected ? t('reconnect') : t('connectCode')}</button>` : html`<span class="small muted">${t('installCodeFirst')}</span>`}</div>
      </div></div>
    <div class="card"><div class="card-head">${I('file')}<h3>${t('otherTools')}</h3></div>
      <div class="card-body stack" style="gap:10px">
        <div class="small muted">${t('otherToolsText')}</div>
        ${projectPicker('conProject')}
        ${targets.map((x) => html`<div class="row-tight"><span class="grow small"><b>${x.label}</b> <span class="tiny muted">${x.file}</span></span>${x.has ? html`<span class="badge ok">${t('included')}</span>` : ''}<button class="btn xs" data-target="${x.id}">${x.has ? t('update') : t('include')}</button></div>`)}
      </div></div>
    <div class="card"><div class="card-head">${I('graph')}<h3>${t('kgTitle')}</h3>${kg ? html`<span class="badge">${t('kgBuilt', { n: kg.sources.filter((s) => s.built).length })}</span>` : ''}</div>
      <div class="card-body stack" style="gap:10px">
        <div class="small muted">${t('kgText')}</div>
        <div class="row-tight" style="flex-wrap:wrap"><button class="btn primary" id="openKg">${I('graph', 14)}${t('openKg')}</button><button class="btn ghost" id="copyCtx">${I('copy', 14)}${t('copyContext')}</button><button class="btn ghost" data-url="${st.web}">${I('external', 14)}${t('openWeb')}</button></div>
        <div class="tiny muted">${t('kgHint')}</div>
      </div></div>
  </div>`);
  const desk = async (on) => { try { const r = await Hostwerk.post('/claude/connect/desktop', { on }); Hostwerk.toast(on ? (r && r.restarted ? t('deskRestarted') : t('deskNextStart')) : t('deskRemoved'), { kind: 'success' }); st = await Hostwerk.get('/claude/status'); renderConnect(); } catch (e) { fail(e); } };
  if ($('deskOn')) $('deskOn').onclick = () => desk(true);
  if ($('deskOff')) $('deskOff').onclick = () => desk(false);
  if ($('codeConnect')) $('codeConnect').onclick = async () => { try { const r = await Hostwerk.get('/claude/connect/code'); await Hostwerk.terminal(r.command, { title: t('connectCodeTitle') }); Hostwerk.toast(t('typedInTerminal'), { kind: 'success' }); } catch (e) { fail(e); } };
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
async function renderTokens() {
  if (!tools) { Hostwerk.render('#tokens', html`<div class="hw-skeleton" style="height:240px"></div>`); try { tools = await Hostwerk.get('/claude/tools'); } catch (e) { fail(e); return; } }
  const d = tools; const list = d.tools.filter((x) => !x.builtin);
  const days = (usage && usage.days) || []; const s = CL.usageSummary(days);
  Hostwerk.render('#tokens', html`<div class="cl-stack cl-fade">
    ${!d.claude ? html`<div class="callout warn"><b>${t('codeNotFound')}</b> ${t('codeNotFoundText')}</div>` : ''}
    <div class="grid grid-2">
      <div class="card"><div class="card-head">${I('gauge')}<h3>${t('usageTitle')}</h3><span class="small muted">${t('usageSub')}</span><div class="right"><button class="btn sm" id="measure" ${measuring ? raw('disabled') : ''}>${I('refresh', 14)}${measuring ? t('measuring') : usage ? t('measureAgain') : t('measure')}</button></div></div>
        <div class="card-body stack" style="gap:10px">${!usage ? html`<div class="small muted">${t('usageIntro')}</div>`
          : usage.error ? html`<div class="small muted">${usage.error}</div>`
          : !days.length ? html`<div class="small muted">${t('noSessions')}</div>`
          : html`${chart(days)}<div class="cl-kpis"><div class="cl-kpi"><b>${n(s.total)}</b><span>${t('kpiTotal')}</span></div><div class="cl-kpi"><b>${n(s.avg)}</b><span>${t('kpiAvg')}</span></div><div class="cl-kpi"><b>${n(s.cacheRead)}</b><span>${t('kpiCache')}</span></div>${s.trend != null ? html`<div class="cl-kpi"><b class="${s.trend <= 0 ? 'down' : 'up'}">${s.trend > 0 ? '+' : ''}${s.trend} %</b><span>${t('kpiTrend')}</span></div>` : ''}</div>`}</div></div>
      <div class="card"><div class="card-head">${I('refresh')}<h3>${t('careTitle')}</h3></div>
        <div class="card-body stack" style="gap:12px">
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
    : html`${list.map((r) => html`<div class="list-item">${I('sparkles', 15)}<div class="grow small" style="min-width:0"><b>${r.repo}</b><div class="tiny muted">${r.description || ''}</div></div><span class="tiny muted">${I('star', 11)} ${n(r.stars)}</span><button class="btn xs ghost" data-url="${r.url}">${I('external', 13)}</button></div>`)}<div class="tiny muted" style="margin-top:8px">${t('discoverHint')}</div>`);
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
    <div class="cl-tipbar">
      <input class="input" id="tipQ" type="search" placeholder="${t('tipSearch')}" aria-label="${t('tipSearch')}" value="${tipQ}">
      <div class="seg" role="tablist" aria-label="${t('categories')}"><button class="${tipCat ? '' : 'on'}" data-cat="">${t('all')}</button>${CL.CATS.map((c) => html`<button class="${tipCat === c.id ? 'on' : ''}" data-cat="${c.id}">${L(c)}</button>`)}</div>
    </div>
    ${!own.length && !extra.length ? html`<div class="empty"><b>${t('noTips')}</b></div>` : ''}
    <div class="cl-tips">${own.map((x, i) => { const [title, text] = x[lang()] || x.de; const code = lang() === 'en' && x.codeEn ? x.codeEn : x.code; const key = lang() === 'en' && x.keyEn ? x.keyEn : x.key; return html`<article class="cl-tip" style="animation-delay:${Math.min(i, 12) * 35}ms">
      <div class="cl-tip-top"><div class="cl-tip-art">${art(x.cat)}</div><h3>${title}</h3></div>
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
      <div class="card"><div class="card-head">${I('book')}<h3>${t('memWhat')}</h3></div><div class="card-body cl-stack" style="gap:8px">
        ${cl.map((c) => sw(`mc-${c.id}`, mem.clusters.includes(c.id), c.title))}
        ${sw('mProj', mem.project, t('memProject'))}
        ${sw('mGraph', mem.graph, t('memGraph'))}
        <label class="label" for="mMax">${t('memMax', { n: n(mem.maxTokens) })}</label>
        <input type="range" id="mMax" min="200" max="8000" step="100" value="${mem.maxTokens}" aria-valuetext="${n(mem.maxTokens)} Tokens">
        <p class="tiny muted" style="margin:0">${t('memPrivate')}</p>
      </div></div>
      <div class="card"><div class="card-head">${I('bot')}<h3>${t('memWho')}</h3></div><div class="card-body cl-stack" style="gap:8px">
        ${P.map((p) => sw(`mp-${p.id}`, mem.providers[p.id] !== false, p.label))}
        <p class="tiny muted" style="margin:0">${t('memWhoHint')}</p>
      </div></div>
    </div>
    <div class="card"><div class="card-head">${I('eye')}<h3>${t('memPreview')}</h3><div class="right row-tight"><select class="select" id="mPv" aria-label="${t('memPreviewFor')}">${P.map((p) => html`<option value="${p.id}" ${p.id === memProvider ? raw('selected') : ''}>${p.label}</option>`)}</select><button class="btn sm" id="mPvGo">${t('memShow')}</button></div></div>
      <div class="card-body">${memPreview == null ? html`<p class="small muted" style="margin:0">${t('memPreviewHint')}</p>` : memPreview.text ? html`<div class="tiny muted" style="margin-bottom:6px">≈ ${n(memPreview.tokens)} Tokens</div><pre class="cl-mem-pre">${memPreview.text}</pre>` : html`<p class="small muted" style="margin:0">${t('memNothing')}</p>`}</div></div>
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
  const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? t('justNow') : m < 60 ? t('minAgo', { m }) : m < 1440 ? t('hAgo', { h: Math.round(m / 60) }) : new Date(ts).toLocaleDateString(); };
  Hostwerk.render('#log', html`<div class="card cl-fade"><div class="card-head">${I('bot')}<h3>${t('logTitle')}</h3><span class="badge ${connected() ? 'ok' : ''}">${connected() ? t('connected') : t('notConnected')}</span></div>
    ${!list.length ? html`<div class="card-body small muted">${connected() ? t('logEmpty') : t('logNotConnected')}</div>` : html`<div class="card-body cl-log">${list.slice(0, 200).map((x, i) => html`<div class="cl-log-row" style="animation-delay:${Math.min(i, 15) * 20}ms">${I(x.action === 'read' ? 'book' : 'sparkles', 14)}<span class="grow"><b>${x.client}</b> ${t(`act_${x.action}`)}: ${x.text}</span><span class="tiny muted">${ago(x.at)}</span></div>`)}</div>`}
  </div>`);
}

/* ================================================================ Rahmen */
function show(next) {
  tab = next || 'go';
  for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab;
  const fn = { memory: renderMemory, go: renderGo, connect: renderConnect, tokens: renderTokens, tips: renderTips, log: renderLog }[tab];
  if (fn) Promise.resolve(fn()).catch(fail);
}
Hostwerk.ready().then(async (info) => {
  tab = info.tab || 'go';
  Hostwerk.on('tab', show);
  Hostwerk.on('lang', () => show(tab));
  try { await loadBase(); } catch (e) { fail(e); }
  show(tab);
  // Stand regelmäßig auffrischen (Verbindung, Installation) – nur wenn sichtbar und ohne Eingabe zu stören
  setInterval(async () => {
    if (document.hidden || document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    try { const ns = await Hostwerk.get('/claude/status'); if (JSON.stringify(ns) !== JSON.stringify(st)) { st = ns; if (tab === 'go' || tab === 'connect' || tab === 'log') show(tab); } } catch { /* offline */ }
  }, 20000);
});
