## 1.5.0

- Lives in the AI assistant: the whole page is the “AI Connect” tab (AI → AI Connect), its tabs are a list on the left, the address is `#/ki/anbindung/<tab>`; no own sidebar entry any more. Old links (`#/ext/claude/…`) lead there. Needs a Hostwerk with `"page": true` tabs – older versions show the page as a plain AI tab. / Steckt im KI-Helfer: die ganze Seite ist der Reiter „KI-Anbindung“ (KI → KI-Anbindung), ihre Reiter stehen links als Liste, Adresse `#/ki/anbindung/<reiter>`; kein eigener Eintrag mehr in der Seitenleiste. Alte Links (`#/ext/claude/…`) führen dorthin. Braucht ein Hostwerk mit `"page": true`-Reitern – ältere zeigen die Seite als normalen KI-Reiter.
- Connect: pick your AI app – Claude Desktop, Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code (Copilot), Windsurf, LM Studio, Continue or any other MCP app – and get exactly its way: one click, the official command, or the settings in the app’s own notation (VS Code: `servers`) plus the file path. The list of apps is data (`CLIENTS` in `page/lib.js`); unknown apps take the general MCP way. / Verbinden: deine KI-App wählen – Claude Desktop, Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code (Copilot), Windsurf, LM Studio, Continue oder jede andere MCP-App – und genau ihren Weg bekommen: ein Klick, der offizielle Befehl oder die Einstellungen in der Schreibweise der App (VS Code: `servers`) samt Dateipfad. Die App-Liste sind Daten (`CLIENTS` in `page/lib.js`); unbekannte Apps nehmen den allgemeinen MCP-Weg.
- Tab “Save tokens” without “(Claude Code)” in its name – the page itself says what only works with Claude Code. / Reiter „Token sparen“ ohne „(Claude Code)“ im Namen – was nur mit Claude Code geht, sagt die Seite selbst.

## 1.4.0

- For every AI, not just Claude: names, descriptions, tabs, actions and texts are provider-neutral; parts that only work with Claude (Claude Desktop, Claude Code, token measuring, most tips) are marked “for Claude” / “Claude Code”. / Für jede KI, nicht nur Claude: Namen, Beschreibungen, Reiter, Aktionen und Texte anbieterneutral; was nur mit Claude geht (Claude Desktop, Claude Code, Token-Messung, die meisten Tipps), ist mit „für Claude“ bzw. „Claude Code“ gekennzeichnet.
- Get going: choose Claude Code, Codex CLI or Gemini CLI; the tool is remembered, installed from the page and started in the project folder. / Loslegen: Claude Code, Codex CLI oder Gemini CLI wählen; die Wahl bleibt gespeichert, Installation direkt von der Seite, Start im Projektordner.
- Connect: Codex CLI and Gemini CLI via their official “mcp add”, MCP settings to copy for any other MCP app (Cursor, VS Code, Windsurf, LM Studio …), GEMINI.md next to CLAUDE.md, AGENTS.md, Copilot and Cursor; web chats claude.ai, ChatGPT and Gemini. / Verbinden: Codex CLI und Gemini CLI über ihr offizielles „mcp add“, MCP-Einstellungen zum Kopieren für jede andere MCP-App (Cursor, VS Code, Windsurf, LM Studio …), GEMINI.md neben CLAUDE.md, AGENTS.md, Copilot und Cursor; Web-Chats claude.ai, ChatGPT und Gemini.
- New general tip about instruction files (AGENTS.md, GEMINI.md, CLAUDE.md). / Neuer allgemeiner Tipp zu Anweisungsdateien (AGENTS.md, GEMINI.md, CLAUDE.md).
- The new parts need Hostwerk 3.0; with older versions the page shows the Claude parts as before. Id stays `claude`. / Die neuen Teile brauchen Hostwerk 3.0; mit älteren Versionen zeigt die Seite die Claude-Teile wie bisher. Die Kennung bleibt `claude`.

## 1.3.0

- Tab “Get going with AI” in the Projects area, shortcut Ctrl+Alt+C, quick search and “New” entry “Start Claude in a project”. / Reiter „Mit KI loslegen“ im Bereich Projekte, Kürzel Strg+Alt+C, Schnellsuche und „Neu“-Eintrag „Claude im Projekt starten“.
- Button “Ask Claude with the graph” on the knowledge graph page. / Knopf „Claude mit dem Graphen fragen“ auf der Seite des Wissensgraphen.
- Daily token limit with notifications at 80 % and 100 % (small server part, Settings → Notifications). / Token-Tagesgrenze mit Benachrichtigung bei 80 % und 100 % (kleiner Server-Teil, Einstellungen → Benachrichtigungen).
- Own task templates – saved for everyone on this Hostwerk, shareable with the team. / Eigene Auftrags-Vorlagen – für alle auf diesem Hostwerk gespeichert, im Team teilbar.
- No polling every 20 s any more: refresh when the tab becomes visible again (and every minute while visible). / Keine Abfrage mehr alle 20 s: frisch, sobald der Reiter wieder sichtbar wird (und jede Minute, solange er sichtbar ist).
- Error state with “Try again”, dates in Hostwerk’s language, design scale instead of fixed sizes. / Fehlerzustand mit „Erneut versuchen“, Datum in Hostwerk-Sprache, Design-Skala statt fester Größen.
- READMEs name it consistently (AI Connect / KI-Anbindung, id claude) and describe the Memory tab. / READMEs mit einheitlichem Namen (KI-Anbindung / AI Connect, Kennung claude) und dem Reiter „Gedächtnis“.
- More tests; place in the sidebar under “System”; other extensions may add tabs; release package contains everything except the repository tooling. / Mehr Tests; Platz in der Seitenleiste unter „System“; andere Erweiterungen dürfen Reiter ergänzen; Release-Paket enthält alles außer dem Repo-Werkzeug.

## 1.2.1

- The category filter in “Tips & tricks” is a button group for screen readers (aria-pressed). / Der Kategorie-Filter unter „Tipps & Tricks“ ist für Bildschirmleser eine Knopfgruppe (aria-pressed).

## 1.2.0

- New animated icon and a banner for Hostwerk's new extension page, category “ai”. / Neues bewegtes Symbol und ein Banner für die neue Erweiterungsseite, Kategorie „ai“.

## 1.1.0

- Renamed to "AI Connect" (KI-Anbindung): it is no longer about Claude only.
- New tab Memory: every AI provider in the AI assistant (local or online) gets your thought net – choose the areas, the attached project's area, a knowledge graph excerpt, a size limit and which providers; preview exactly what an AI gets. Needs Hostwerk 2.9 with the memory-share API.

## 1.0.0

- First release: the Claude area of Hostwerk as an extension – Get going (new), Connect, Save tokens (chart, tools, comparison), Tips & tricks (new, searchable), Log. / Erste Fassung: der Claude-Bereich als Erweiterung.
