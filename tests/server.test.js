'use strict';
/* Server part: notification at 80 % and 100 % of the daily token limit – once per day each. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createBudget } = require('../server/index');

test('daily token limit: one message per step and day', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-claude-'));
  const sent = [];
  let total = 500; let now = new Date(2026, 9, 21, 12); let limit = 1000;
  const host = { ctx: { paths: { data: dir } }, t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s), lang: () => 'en' };
  const check = createBudget(host, {
    usage: async () => ({ days: [{ date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, total }] }),
    send: async (title, text, o) => { sent.push({ title, text, o }); },
    settings: () => ({ dailyTokens: limit }),
    now: () => now,
  });
  await check();
  assert.strictEqual(sent.length, 0, 'below 80 %');
  total = 820; await check(); await check();
  assert.strictEqual(sent.length, 1);
  assert.match(sent[0].title, /80 %/);
  assert.strictEqual(sent[0].o.kind, 'warn');
  total = 1200; await check(); await check();
  assert.strictEqual(sent.length, 2);
  assert.match(sent[1].title, /reached/);
  assert.match(sent[1].text, /1,200 of 1,000/);
  now = new Date(2026, 9, 22, 12); total = 1500; await check();
  assert.strictEqual(sent.length, 3, 'next day: straight to "reached", 80 % is skipped');
  limit = 0; total = 99999; await check();
  assert.strictEqual(sent.length, 3, 'no limit → no message');
});
