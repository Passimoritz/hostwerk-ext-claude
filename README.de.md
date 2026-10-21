![KI-Anbindung](banner.svg)

# KI-Anbindung

Jede KI mit Hostwerk verbinden – Claude, ChatGPT/Codex, Gemini, lokale Modelle: was jede KI über dich und deine Projekte weiß (Gedächtnis), deine KI-Werkzeuge daran angebunden, direkt im Projekt loslegen, Tokens sparen, Tipps & Tricks.

[English](README.md) · Offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung. Kennung: `claude` (so hieß sie anfangs – bleibt, damit Updates weiter funktionieren). Der Motor bleibt in Hostwerk, diese Erweiterung ist seine Oberfläche – plus ein kleiner Server-Teil für die Token-Grenze.

Was nur mit Claude funktioniert, steht auf der Seite und hier als **für Claude** dabei.

## Reiter

- **Gedächtnis:** was jede KI (Claude, OpenAI, Gemini, lokal …) aus deinem Gedankennetz bekommt – Themen, Projekt, Graph, Umfang – mit Vorschau je Anbieter.
- **Loslegen:** Projekt und KI-Werkzeug wählen (Claude Code, Codex CLI oder Gemini CLI), Auftrag beschreiben (oder Vorlage wie *Fehler beheben*, *Tests schreiben* – oder eigene Vorlagen). Hostwerk öffnet das Werkzeug im Projektordner und tippt den Befehl ins Hostwerk-Terminal, du startest ihn mit Enter. Die Werkzeuge lassen sich von hier aus installieren; claude.ai, ChatGPT und Gemini öffnen sich im Browser.
- **Verbinden:**
  - Claude Desktop und Claude Code (**für Claude**) über MCP mit dem Gedankennetz;
  - Codex CLI und Gemini CLI über ihren offiziellen Befehl `mcp add`;
  - jede andere MCP-fähige App (Cursor, VS Code, Windsurf, LM Studio …): MCP-Einstellungen kopieren und dort einfügen;
  - Kontext in die Anweisungsdatei jeder KI schreiben (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Copilot, Cursor);
  - Wissensgraph öffnen oder den Kontext für claude.ai, ChatGPT oder Gemini im Browser kopieren.
- **Token sparen (Claude Code):**
  - Verbrauch je Tag als Diagramm, mit Trend und Tagesgrenze;
  - Spar-Werkzeuge aus dem Online-Katalog, per Klick installiert und aktuell gehalten, mit Vor- und Nachteilen und Vergleich;
  - neu entdeckte Projekte auf GitHub.
  - Den Verbrauch aller KIs im KI-Helfer zeigt Hostwerk unter KI → Kontingente.
- **Tipps & Tricks:** durchsuchbare Karten in vier Bereichen (Kontext klein halten, gute Aufträge, Tasten & Befehle, mit Hostwerk). Tipps, die nur für Claude Code gelten, sind gekennzeichnet; alle anderen helfen mit jeder KI. Befehle lassen sich mit einem Klick kopieren.
- **Protokoll:** was eine verbundene KI gelesen und sich gemerkt hat.

## In Hostwerk

- Reiter **Mit KI loslegen** im Bereich Projekte
- **Strg+Alt+C** (änderbar unter Einstellungen → Allgemein → Tastenkürzel), Schnellsuche und „Neu“-Menü: *KI im Projekt starten*
- Knopf **KI mit dem Graphen fragen** auf der Seite der Erweiterung Wissensgraph
- **Token-Tagesgrenze für Claude Code** (Einstellungen → Benachrichtigungen): bei 80 % und beim Erreichen meldet sich Hostwerk über deine Benachrichtigungen – je einmal am Tag
- **Eigene Auftrags-Vorlagen:** für alle gespeichert, die dieses Hostwerk nutzen, und als kurzer Text im Team teilbar (*Vorlagen teilen* / *Vorlagen einfügen*)

## Rechte

Die Rechte heißen aus Kompatibilitätsgründen weiter `…:claude`; sie gelten für jede KI.

| Recht | Wofür |
|---|---|
| `read:claude` | welche KI-Werkzeuge installiert und verbunden sind, Projekte, Gedächtnis-Kontext, Werkzeuge und Verbrauch |
| `change:claude` | Anweisungsdateien schreiben, Werkzeuge installieren/entfernen (Hostwerk fragt vorher) |
| `run:terminal` | `claude …`, `codex …`, `gemini …` oder einen Installations-/Verbindungsbefehl ins Hostwerk-Terminal tippen (du drückst Enter) |
| `read:knowledge` | Anzahl der Projekte mit Graph |
| `connect:claude` | Claude Desktop verbinden/trennen (fragt vorher) |
| `storage` | merkt sich das gewählte Projekt, das gewählte KI-Werkzeug und deine Vorlagen |
| `native` | kleiner Server-Teil: prüft die Token-Tagesgrenze von Claude Code und schickt die Benachrichtigung |
| `extend:extensions` | der Knopf auf der Seite des Wissensgraphen (dessen Autor erlaubt es) |

Die Liste der KI-Werkzeuge, die Anbindung von Codex/Gemini CLI und `GEMINI.md` brauchen Hostwerk 3.0 oder neuer; mit älteren Versionen zeigt die Seite nur die Claude-Teile.

## Entwickeln

```
node --test tests/*.test.js
node pfad/zu/sdk/check.js . --strict
```

Logik ohne Seite in `page/lib.js` (getestet), Server-Teil in `server/`.

## Lizenz

MIT
