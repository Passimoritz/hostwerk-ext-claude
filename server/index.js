'use strict';
/*
 * AI Connect – small server part (runs as part of Hostwerk for the official package): watches the daily token limit of
 * Claude Code (setting "dailyTokens") and tells the user through Hostwerk's notifications (push, Discord, ntfy, mail –
 * Live → Alerts) at 80 % and when the limit is reached – once per day each. The page itself stays in its frame.
 * Usage comes from Hostwerk's own measurement (ccusage, cached by Hostwerk) and is only read while a limit is set.
 * Data: data/claude-budget.json ({ day, sent: [80, 100] })
 */
const fs = require('fs');
const path = require('path');
const { budgetState } = require('../page/lib.js');

const HOUR = 3600000;

/** One check – deps: { usage() → { days }, send(title, text, opts), settings() → { dailyTokens, budgetNotify }, now() } */
function createBudget(host, deps) {
  const file = path.join(host.ctx.paths.data, 'claude-budget.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { day: null, sent: [] }; } };
  const write = (v) => { try { fs.writeFileSync(file, JSON.stringify(v)); } catch { /* next hour */ } };
  return async function check() {
    const s = deps.settings();
    const limit = Number(s.dailyTokens) || 0;
    if (!limit || s.budgetNotify === false) return null;
    const u = await deps.usage();
    if (!u || u.error || !Array.isArray(u.days)) return null;
    const now = deps.now();
    const b = budgetState(u.days, limit, now);
    if (b.today == null) return b;
    const day = b.today != null ? `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}` : null;
    const st = read();
    if (st.day !== day) { st.day = day; st.sent = []; }
    const step = b.pct >= 100 ? 100 : b.pct >= 80 ? 80 : 0;
    if (step && !st.sent.includes(step)) {
      st.sent.push(step);
      if (step === 100) st.sent.push(80);
      const title = step === 100 ? host.t('Claude Code: daily token limit reached') : host.t('Claude Code: 80 % of the daily token limit used');
      const text = host.t('{used} of {limit} tokens today.', { used: b.today.toLocaleString(host.lang && host.lang() === 'en' ? 'en' : 'de'), limit: limit.toLocaleString(host.lang && host.lang() === 'en' ? 'en' : 'de') });
      try { await deps.send(title, text, { kind: step === 100 ? 'error' : 'warn', event: 'claude-budget', force: true }); } catch { /* notifications are optional */ }
      write(st);
    }
    return b;
  };
}

let timer = null;

function activate(host) {
  const { ctx } = host;
  if (!ctx || !ctx.paths) return; // sandboxed (not from the Hostwerk catalogue): no access to the measurement
  const check = createBudget(host, {
    usage: () => (ctx.claudeTools ? ctx.claudeTools.usage() : null),
    send: (title, text, o) => (ctx.monitor && ctx.monitor.send ? ctx.monitor.send(title, text, o) : null),
    settings: () => { try { return ctx.extMarket.settingsFor(host.id) || {}; } catch { return {}; } },
    now: () => new Date(),
  });
  if (process.env.HW_TEST) return;
  const loop = (ms) => { timer = setTimeout(async () => { await check().catch(() => {}); loop(HOUR); }, ms); if (timer.unref) timer.unref(); };
  loop(5 * 60000);
  host.on('shutdown', () => clearTimeout(timer));
}

function deactivate() { clearTimeout(timer); timer = null; }

module.exports = { activate, deactivate, createBudget };
