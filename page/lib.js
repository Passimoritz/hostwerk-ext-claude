/*
 * KI-Anbindung – reine Hilfsfunktionen und Inhalte (ohne Hostwerk/DOM), damit sie sich mit node --test prüfen lassen.
 * Im Browser als globales CL, in Node per require.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CL = factory();
}(typeof self !== 'undefined' ? self : this, () => {
  'use strict';

  /** Für die Windows- und Linux-Shell: in doppelte Anführungszeichen, ohne Zeilenumbrüche und doppelte Anführungszeichen. */
  function shellQuote(s) { return `"${String(s).replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim()}"`; }

  /**
   * KI-Werkzeuge fürs Terminal, die „Loslegen“ im Projektordner startet. arg = wie der Auftrag übergeben wird
   * (Claude Code und Codex: als erstes Argument; Gemini CLI: mit -i, damit die Sitzung danach offen bleibt).
   * Die Anbindung ans Gedankennetz (MCP) richtet „Verbinden“ ein – für Claude über Claude Code, für die anderen über
   * deren eigenes „mcp add“.
   */
  const AGENTS = [
    { id: 'claude', bin: 'claude', label: 'Claude Code', arg: '' },
    { id: 'codex', bin: 'codex', label: 'Codex CLI', arg: '' },
    { id: 'gemini', bin: 'gemini', label: 'Gemini CLI', arg: '-i ' },
  ];
  const agentOf = (id) => AGENTS.find((a) => a.id === id) || AGENTS[0];

  /*
   * KI-Apps, die sich mit dem Gedankennetz verbinden lassen (MCP) – als Daten, damit neue Apps nur hier dazukommen.
   *   how: desktop = Hostwerk trägt sich selbst ein (Claude Desktop), cli = offizieller „mcp add“-Befehl ins Terminal
   *        (agent = Eintrag in Hostwerks /claude/status.agents bzw. Claude Code), file = Einstellungen kopieren und in die
   *        Datei der App einfügen (format: mcpServers = Schreibweise von Claude/Cursor, servers = VS Code)
   *   file: wo die App ihre MCP-Einstellungen liest (~ = Benutzerordner; ohne ~ im Projektordner), docs: Anleitung der App
   * Unbekannte Apps nehmen „other“: dieselben Einstellungen in der verbreiteten mcpServers-Schreibweise.
   */
  const CLIENTS = [
    { id: 'claude-desktop', label: 'Claude Desktop', how: 'desktop', icon: 'monitor', docs: 'https://modelcontextprotocol.io/quickstart/user' },
    { id: 'claude-code', label: 'Claude Code', how: 'cli', agent: 'claude', icon: 'terminal', docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp' },
    { id: 'codex', label: 'Codex CLI', how: 'cli', agent: 'codex', icon: 'terminal', docs: 'https://github.com/openai/codex' },
    { id: 'gemini', label: 'Gemini CLI', how: 'cli', agent: 'gemini', icon: 'terminal', docs: 'https://github.com/google-gemini/gemini-cli' },
    { id: 'cursor', label: 'Cursor', how: 'file', format: 'mcpServers', file: '~/.cursor/mcp.json', icon: 'file', docs: 'https://docs.cursor.com/context/model-context-protocol' },
    { id: 'vscode', label: 'VS Code (Copilot)', how: 'file', format: 'servers', file: '.vscode/mcp.json', icon: 'file', docs: 'https://code.visualstudio.com/docs/copilot/chat/mcp-servers' },
    { id: 'windsurf', label: 'Windsurf', how: 'file', format: 'mcpServers', file: '~/.codeium/windsurf/mcp_config.json', icon: 'file', docs: 'https://docs.windsurf.com/windsurf/cascade/mcp' },
    { id: 'lmstudio', label: 'LM Studio', how: 'file', format: 'mcpServers', file: '~/.lmstudio/mcp.json', icon: 'file', docs: 'https://lmstudio.ai/docs/app/plugins/mcp' },
    { id: 'continue', label: 'Continue', how: 'file', format: 'mcpServers', file: '.continue/mcpServers/hostwerk.json', icon: 'file', docs: 'https://docs.continue.dev/customize/deep-dives/mcp' },
    { id: 'other', label: '', how: 'file', format: 'mcpServers', file: '', icon: 'plug', docs: 'https://modelcontextprotocol.io/clients' },
  ];
  const clientOf = (id) => CLIENTS.find((c) => c.id === id) || CLIENTS[CLIENTS.length - 1];

  /**
   * MCP-Einstellungen für eine App aus Hostwerks Start-Befehl (launch = { command, args, env } bzw. der JSON-Text von
   * /claude/connect/code → clients.json). Liefert den Text zum Einfügen – in der Schreibweise der App.
   */
  function clientConfig(id, launch) {
    let l = launch;
    if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = null; } }
    if (l && l.mcpServers) l = l.mcpServers.hostwerk;
    if (!l || !l.command) return '';
    const c = clientOf(id);
    const entry = { command: l.command, args: l.args || [], ...(l.env && Object.keys(l.env).length ? { env: l.env } : {}) };
    return JSON.stringify(c.format === 'servers' ? { servers: { hostwerk: { type: 'stdio', ...entry } } } : { mcpServers: { hostwerk: entry } }, null, 2);
  }

  /** Befehl für „Loslegen“: nur „claude“ bzw. „codex“/„gemini“ oder mit Auftrag (+ Hinweis auf das Gedankennetz, wenn verbunden). */
  function startCommand(goal, { connected = false, lang = 'de', agent = 'claude' } = {}) {
    const a = agentOf(agent);
    const g = String(goal || '').trim();
    if (!g) return a.bin;
    const hint = connected ? (lang === 'en' ? ' – read what I decided with gedankennetz_lesen first.' : ' – lies vorher mit gedankennetz_lesen, was ich festgelegt habe.') : '';
    return `${a.bin} ${a.arg}${shellQuote(g + hint)}`;
  }

  /** Verbrauch: Summen und Höchstwert für das Balkendiagramm. */
  function usageSummary(days) {
    const list = Array.isArray(days) ? days : [];
    const sum = (k) => list.reduce((a, x) => a + (Number(x[k]) || 0), 0);
    const max = Math.max(1, ...list.map((x) => Number(x.total) || 0));
    const avg = list.length ? Math.round(sum('total') / list.length) : 0;
    // Trend: zweite Hälfte gegenüber erster (in Prozent) – zeigt, ob ein Spar-Werkzeug wirkt
    const half = Math.floor(list.length / 2);
    const a = list.slice(0, half).reduce((s, x) => s + (x.total || 0), 0) / Math.max(1, half);
    const b = list.slice(half).reduce((s, x) => s + (x.total || 0), 0) / Math.max(1, list.length - half);
    const trend = half && a ? Math.round(((b - a) / a) * 100) : null;
    return { total: sum('total'), input: sum('input'), output: sum('output'), cacheRead: sum('cacheRead'), max, avg, trend };
  }

  /** Aufgaben-Vorlagen für „Loslegen“. */
  const TASKS = [
    { id: 'fix', icon: 'bug', de: ['Fehler beheben', 'Finde und behebe den Fehler: '], en: ['Fix a bug', 'Find and fix the bug: '] },
    { id: 'feature', icon: 'sparkles', de: ['Feature bauen', 'Baue folgendes Feature: '], en: ['Build a feature', 'Build the following feature: '] },
    { id: 'tests', icon: 'flask', de: ['Tests schreiben', 'Schreibe Tests für '], en: ['Write tests', 'Write tests for '] },
    { id: 'explain', icon: 'book', de: ['Code erklären', 'Erkläre mir verständlich, wie dieses Projekt aufgebaut ist und wo was passiert.'], en: ['Explain the code', 'Explain clearly how this project is structured and where things happen.'] },
    { id: 'tidy', icon: 'wand', de: ['Aufräumen', 'Räume den Code auf, ohne das Verhalten zu ändern: '], en: ['Tidy up', 'Clean up the code without changing behaviour: '] },
    { id: 'security', icon: 'shield', de: ['Sicherheit prüfen', 'Prüfe das Projekt auf Sicherheitslücken und schlage Korrekturen vor.'], en: ['Check security', 'Check the project for security issues and suggest fixes.'] },
  ];

  /**
   * Tipps & Tricks. cat: context | prompt | keys | hostwerk. code = zum Kopieren, key = Taste(n).
   * only: 'claude' = gilt nur für Claude Code (Stand der offiziellen Doku) – die Seite kennzeichnet das; alle anderen
   * Tipps helfen mit jeder KI.
   */
  const TIPS = [
    { id: 'clear', only: 'claude', cat: 'context', code: '/clear', de: ['Neue Aufgabe, neuer Verlauf', '/clear leert das Gespräch. Was Claude dauerhaft wissen soll, gehört in die CLAUDE.md – dann muss es nicht jedes Mal mitgeschleppt werden.'], en: ['New task, new history', '/clear empties the conversation. What Claude should always know belongs in CLAUDE.md – then it doesn’t have to be carried along every time.'] },
    { id: 'compact', only: 'claude', cat: 'context', code: '/compact ', de: ['Zusammenfassen statt neu anfangen', '/compact fasst den bisherigen Verlauf zusammen. Mit einem Hinweis behält Claude das Wichtige, z. B. „/compact behalte die API-Änderungen“.'], en: ['Summarise instead of starting over', '/compact summarises the history so far. Add a hint and Claude keeps what matters, e.g. “/compact keep the API changes”.'] },
    { id: 'claudemd', only: 'claude', cat: 'context', code: '/init', de: ['CLAUDE.md kurz halten', 'Sie wird in jeder Sitzung geladen. Nur Regeln, Befehle und Fallen hinein – keine Romane. /init legt eine erste Fassung an.'], en: ['Keep CLAUDE.md short', 'It’s loaded in every session. Only rules, commands and pitfalls – no novels. /init creates a first draft.'] },
    { id: 'at', only: 'claude', cat: 'context', code: '@', de: ['Dateien mit @ nennen', '„@src/app.js“ statt „schau dich mal um“ – Claude liest genau diese Datei und spart sich die Suche.'], en: ['Name files with @', '“@src/app.js” instead of “have a look around” – Claude reads exactly that file and skips the search.'] },
    { id: 'logs', cat: 'context', de: ['Lange Ausgaben kürzen', 'Keine kompletten Protokolle einfügen: nur die Fehlerzeilen oder das Ende (z. B. „| tail -50“). Jede Zeile kostet Tokens – bei jeder weiteren Nachricht wieder.'], en: ['Trim long output', 'Don’t paste whole logs: only the error lines or the end (e.g. “| tail -50”). Every line costs tokens – again with every following message.'] },
    { id: 'mcp', only: 'claude', cat: 'context', code: '/mcp', de: ['Unbenutzte MCP-Server abschalten', 'Jeder MCP-Server bringt Werkzeug-Beschreibungen mit, die in jeder Anfrage stecken. /mcp zeigt, was eingebunden ist.'], en: ['Turn off unused MCP servers', 'Every MCP server brings tool descriptions that are part of every request. /mcp shows what’s connected.'] },
    { id: 'agents', only: 'claude', cat: 'context', code: '/agents', de: ['Teilagenten für die Suche', 'Lass Claude große Erkundungen an Teilagenten abgeben – deren Zwischenschritte landen nicht im Hauptverlauf. /agents verwaltet eigene Teilagenten.'], en: ['Subagents for searching', 'Let Claude hand big explorations to subagents – their intermediate steps don’t end up in the main history. /agents manages your own subagents.'] },
    { id: 'plan', only: 'claude', cat: 'prompt', key: 'Shift+Tab', de: ['Erst planen, dann bauen', 'Shift+Tab schaltet die Modi durch bis zum Plan-Modus: Claude liest und schlägt einen Plan vor, ändert aber nichts, bis du zustimmst.'], en: ['Plan first, then build', 'Shift+Tab cycles through the modes to plan mode: Claude reads and proposes a plan but changes nothing until you agree.'] },
    { id: 'done', cat: 'prompt', de: ['Sag, woran „fertig“ zu erkennen ist', '„…und lass danach die Tests laufen“ oder „die Seite soll ohne Fehler in der Konsole laden“ – mit einem klaren Ziel arbeitet jede KI gezielter.'], en: ['Say what “done” looks like', '“…and run the tests afterwards” or “the page should load without console errors” – with a clear goal any AI works more precisely.'] },
    { id: 'images', cat: 'prompt', key: 'Strg+V', keyEn: 'Ctrl+V', de: ['Bilder zeigen', 'Screenshots einfach einfügen – Claude Code, Codex und Gemini CLI sehen sie. Ein Bild von der kaputten Seite sagt oft mehr als drei Sätze.'], en: ['Show pictures', 'Just paste screenshots – Claude Code, Codex and Gemini CLI can see them. A picture of the broken page often says more than three sentences.'] },
    { id: 'steps', cat: 'prompt', de: ['In Etappen arbeiten', 'Große Umbauten in kleine Schritte teilen und nach jedem kurz prüfen. Fehler fallen früh auf, und der Verlauf bleibt übersichtlich.'], en: ['Work in stages', 'Split big changes into small steps and check after each one. Mistakes show up early and the history stays clear.'] },
    { id: 'esc', only: 'claude', cat: 'keys', key: 'Esc', de: ['Esc unterbricht', 'Esc stoppt Claude sofort, ohne den Verlauf zu verlieren. Zweimal Esc springt zu einer früheren Nachricht zurück, um sie anders zu stellen.'], en: ['Esc interrupts', 'Esc stops Claude right away without losing the history. Press Esc twice to jump back to an earlier message and rephrase it.'] },
    { id: 'bang', only: 'claude', cat: 'keys', code: '!git status', de: ['! für Shell-Befehle', 'Eine Zeile mit ! am Anfang läuft direkt in der Shell – die Ausgabe sieht Claude gleich mit.'], en: ['! for shell commands', 'A line starting with ! runs straight in the shell – Claude sees the output too.'] },
    { id: 'continue', only: 'claude', cat: 'keys', code: 'claude --continue', de: ['Weitermachen, wo du warst', '„claude --continue“ setzt das letzte Gespräch im Ordner fort, „claude --resume“ lässt dich eins auswählen.'], en: ['Pick up where you left off', '“claude --continue” resumes the last conversation in the folder, “claude --resume” lets you choose one.'] },
    { id: 'commands', only: 'claude', cat: 'keys', code: '.claude/commands/', de: ['Eigene /Befehle', 'Markdown-Dateien in .claude/commands/ werden zu eigenen /Befehlen – praktisch für Abläufe, die du oft brauchst.'], en: ['Your own /commands', 'Markdown files in .claude/commands/ become your own /commands – handy for routines you use a lot.'] },
    { id: 'model', only: 'claude', cat: 'keys', code: '/model', de: ['Passendes Modell wählen', '/model wechselt das Modell – für kleine, klare Aufgaben reicht oft ein schnelleres.'], en: ['Choose the right model', '/model switches the model – for small, clear tasks a faster one is often enough.'] },
    { id: 'print', only: 'claude', cat: 'keys', code: 'claude -p "Fasse die letzten Commits zusammen"', codeEn: 'claude -p "Summarise the last commits"', de: ['Ohne Sitzung, für Skripte', '„claude -p …“ gibt die Antwort aus und beendet sich – gut für Aufgaben in Hostwerk oder eigene Skripte.'], en: ['Without a session, for scripts', '“claude -p …” prints the answer and exits – good for Hostwerk tasks or your own scripts.'] },
    { id: 'rulesfile', cat: 'context', code: 'AGENTS.md', de: ['Eine Anweisungsdatei je Projekt', 'Codex, Cursor, Zed und Copilot lesen AGENTS.md, Gemini CLI GEMINI.md, Claude Code CLAUDE.md. Kurz halten: Regeln, Befehle, Fallen. Unter „Verbinden“ schreibt Hostwerk dein Gedankennetz hinein.'], en: ['One instructions file per project', 'Codex, Cursor, Zed and Copilot read AGENTS.md, Gemini CLI reads GEMINI.md, Claude Code CLAUDE.md. Keep it short: rules, commands, pitfalls. Under “Connect” Hostwerk writes your thought net into it.'] },
    { id: 'graph', cat: 'hostwerk', action: 'graph', de: ['Graph fragen statt Dateien lesen', 'Mit der Erweiterung „Wissensgraph“ fragt deine KI den Graphen deines Projekts, statt Dutzende Dateien zu öffnen.'], en: ['Ask the graph instead of reading files', 'With the “Knowledge graph” extension your AI queries your project’s graph instead of opening dozens of files.'] },
    { id: 'start', cat: 'hostwerk', action: 'go', de: ['Direkt im Projekt starten', '„Loslegen“ öffnet Claude Code, Codex oder Gemini CLI im richtigen Ordner im Hostwerk-Terminal – mit deinem Auftrag schon eingetippt.'], en: ['Start right in the project', '“Get going” opens Claude Code, Codex or Gemini CLI in the right folder in the Hostwerk terminal – with your task already typed in.'] },
    { id: 'measure', cat: 'hostwerk', action: 'tokens', only: 'claude', de: ['Messen, ob es wirkt', 'Unter „Token sparen“ zeigt „Messen“ den Verbrauch von Claude Code je Tag – so siehst du, ob ein Werkzeug oder Tipp etwas bringt.'], en: ['Measure whether it works', 'Under “Save tokens”, “Measure” shows Claude Code’s usage per day – so you see whether a tool or tip helps.'] },
  ];
  const CATS = [
    { id: 'context', de: 'Kontext klein halten', en: 'Keep the context small' },
    { id: 'prompt', de: 'Gute Aufträge', en: 'Good requests' },
    { id: 'keys', de: 'Tasten & Befehle', en: 'Keys & commands' },
    { id: 'hostwerk', de: 'Mit Hostwerk', en: 'With Hostwerk' },
  ];
  /** Tipps filtern (Kategorie + Suchtext über Titel, Text und Befehl). */
  function filterTips(list, { cat = '', q = '', lang = 'de' } = {}) {
    const s = String(q || '').trim().toLowerCase();
    return list.filter((x) => (!cat || x.cat === cat) && (!s || [...(x[lang] || x.de), x.code || '', x.key || ''].join(' ').toLowerCase().includes(s)));
  }

  /** Kleine Strich-Symbole (24er-Raster, Stil wie Hostwerk) */
  const ICON = {
    bug: '<path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 0 1 6 0v1.1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H3M21 13h-3.5M6 18l-2.5 1.5M18 18l2.5 1.5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M21 5h-4"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.2 7.1 15.6 7.7M7 8.4l2.2 7.2M16.4 10.1l-4.6 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>',
    gauge: '<path d="m12 14 4-4M3.3 19a10 10 0 1 1 17.4 0"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.4-6.4 2.1 2.1-6.4z"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 14h.01M16 14h.01M2 14h2M20 14h2"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  };
  const icon = (name, size = 16) => `<svg class="cl-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ICON.sparkles}</svg>`;

  /** Eigene Auftrags-Vorlagen: nur Titel (≤ 40) und Text (≤ 2000), mit stabiler Kennung. */
  function cleanTemplates(list) {
    const out = [];
    for (const x of Array.isArray(list) ? list : []) {
      const title = String((x && x.title) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const text = String((x && x.text) || '').trim().slice(0, 2000);
      if (!title || !text) continue;
      const id = /^[a-z0-9]{6,20}$/.test((x && x.id) || '') ? x.id : `t${Math.abs([...title + text].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 7)).toString(36)}`;
      out.push({ id, title, text });
    }
    return out;
  }
  /** Zum Teilen im Team: kurzer Text, den andere unter „Vorlagen einfügen“ wieder einlesen. */
  function exportTemplates(list) { return JSON.stringify({ hostwerkClaudeTemplates: 1, templates: cleanTemplates(list).map(({ title, text }) => ({ title, text })) }); }
  function importTemplates(text) {
    try { const j = JSON.parse(String(text || '').trim()); return cleanTemplates(Array.isArray(j) ? j : j && j.templates); } catch { return []; }
  }

  /** Token-Tagesgrenze: heutiger Verbrauch (Tag im Format JJJJ-MM-TT, Ortszeit) gegen die Grenze. */
  function budgetState(days, limit, now = new Date()) {
    const pad = (x) => String(x).padStart(2, '0');
    const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const d = (Array.isArray(days) ? days : []).find((x) => String(x.date || '').slice(0, 10) === key);
    const today = d ? Number(d.total) || 0 : null;
    const pct = today == null || !limit ? 0 : Math.round((today / limit) * 100);
    return { today, pct, level: !limit || today == null ? 'none' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' };
  }

  return { AGENTS, agentOf, CLIENTS, clientOf, clientConfig, shellQuote, startCommand, usageSummary, TASKS, TIPS, CATS, filterTips, ICON, icon, cleanTemplates, exportTemplates, importTemplates, budgetState };
}));
