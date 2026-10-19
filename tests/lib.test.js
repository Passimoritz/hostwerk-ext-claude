const test = require('node:test');
const assert = require('node:assert');
const CL = require('../page/lib.js');

test('Startbefehl: ohne Auftrag nur „claude“, mit Auftrag sicher in Anführungszeichen', () => {
  assert.strictEqual(CL.startCommand(''), 'claude');
  assert.strictEqual(CL.startCommand('Baue "X"\nund Y'), 'claude "Baue \'X\' und Y"');
  assert.ok(CL.startCommand('Fix', { connected: true }).includes('gedankennetz_lesen'));
  assert.ok(CL.startCommand('Fix', { connected: true, lang: 'en' }).includes('read what I decided'));
});

test('Verbrauch: Summen, Schnitt und Trend', () => {
  const days = [{ total: 100, input: 50, output: 10, cacheRead: 40 }, { total: 100 }, { total: 50 }, { total: 50 }];
  const s = CL.usageSummary(days);
  assert.strictEqual(s.total, 300); assert.strictEqual(s.max, 100); assert.strictEqual(s.avg, 75); assert.strictEqual(s.trend, -50);
  assert.deepStrictEqual(CL.usageSummary([]).trend, null);
});

test('Jeder Tipp hat Deutsch und Englisch und eine bekannte Kategorie', () => {
  const cats = new Set(CL.CATS.map((c) => c.id));
  const ids = new Set();
  for (const x of CL.TIPS) {
    assert.ok(cats.has(x.cat), x.id); assert.ok(!ids.has(x.id), `doppelt: ${x.id}`); ids.add(x.id);
    for (const l of ['de', 'en']) { assert.strictEqual(x[l].length, 2, `${x.id}/${l}`); assert.ok(x[l][0] && x[l][1].length > 20, `${x.id}/${l}`); }
  }
  for (const x of CL.TASKS) for (const l of ['de', 'en']) assert.strictEqual(x[l].length, 2);
});

test('Tipps filtern nach Bereich und Suchtext (auch im Befehl)', () => {
  assert.ok(CL.filterTips(CL.TIPS, { cat: 'keys' }).every((x) => x.cat === 'keys'));
  assert.ok(CL.filterTips(CL.TIPS, { q: '/compact' }).some((x) => x.id === 'compact'));
  assert.ok(CL.filterTips(CL.TIPS, { q: 'subagents', lang: 'en' }).some((x) => x.id === 'agents'));
  assert.strictEqual(CL.filterTips(CL.TIPS, { q: 'gibtesnicht123' }).length, 0);
});

test('Symbole sind reines SVG ohne Skript', () => {
  for (const [k, v] of Object.entries(CL.ICON)) assert.ok(!/script|on\w+=/i.test(v), k);
  assert.ok(CL.icon('play').startsWith('<svg'));
});
