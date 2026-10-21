![KI-Anbindung](banner.svg)

# KI-Anbindung

Deine KIs mit Hostwerk verbinden: was jede KI über dich und deine Projekte weiß (Gedächtnis), Claude Desktop und Claude Code angebunden, direkt im Projekt loslegen, Tokens sparen, Tipps & Tricks.

[English](README.md) · Offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung. Kennung: `claude` (so hieß sie anfangs). Der Motor bleibt in Hostwerk, diese Erweiterung ist seine Oberfläche – plus ein kleiner Server-Teil für die Token-Grenze.

## Reiter

- **Gedächtnis:** was jede KI (Claude, OpenAI, Gemini, lokal …) aus deinem Gedankennetz bekommt – Themen, Projekt, Graph, Umfang – mit Vorschau je Anbieter.
- **Loslegen:** Projekt wählen, Auftrag beschreiben (oder Vorlage wie *Fehler beheben*, *Tests schreiben* – oder eigene Vorlagen). Hostwerk öffnet Claude Code im Projektordner und tippt den Befehl ins Hostwerk-Terminal, du startest ihn mit Enter. Claude Code, Claude Desktop und Claude im Browser lassen sich von hier aus installieren.
- **Verbinden:**
  - Claude Desktop und Claude Code mit dem Gedankennetz verbinden (MCP);
  - Kontext in die Dateien anderer KI-Werkzeuge schreiben (`CLAUDE.md`, `.cursorrules` …);
  - Wissensgraph öffnen oder den Kontext für claude.ai kopieren.
- **Token sparen:**
  - Verbrauch je Tag als Diagramm, mit Trend und Tagesgrenze;
  - Spar-Werkzeuge aus dem Online-Katalog, per Klick installiert und aktuell gehalten, mit Vor- und Nachteilen und Vergleich;
  - neu entdeckte Projekte auf GitHub.
- **Tipps & Tricks:** durchsuchbare Karten in vier Bereichen (Kontext klein halten, gute Aufträge, Tasten & Befehle, mit Hostwerk). Befehle lassen sich mit einem Klick kopieren.
- **Protokoll:** was ein verbundenes Claude gelesen und sich gemerkt hat.

## In Hostwerk

- Reiter **Mit KI loslegen** im Bereich Projekte
- **Strg+Alt+C** (änderbar unter Einstellungen → Allgemein → Tastenkürzel), Schnellsuche und „Neu“-Menü: *Claude im Projekt starten*
- Knopf **Claude mit dem Graphen fragen** auf der Seite der Erweiterung Wissensgraph
- **Token-Tagesgrenze** (Einstellungen → Benachrichtigungen): bei 80 % und beim Erreichen meldet sich Hostwerk über deine Benachrichtigungen – je einmal am Tag
- **Eigene Auftrags-Vorlagen:** für alle gespeichert, die dieses Hostwerk nutzen, und als kurzer Text im Team teilbar (*Vorlagen teilen* / *Vorlagen einfügen*)

## Rechte

| Recht | Wofür |
|---|---|
| `read:claude` | Claude-Status, Projekte, Gedächtnis-Kontext, Werkzeuge und Verbrauch |
| `change:claude` | Kontext-Dateien schreiben, Werkzeuge installieren/entfernen (Hostwerk fragt vorher) |
| `run:terminal` | `claude …` ins Hostwerk-Terminal tippen (du drückst Enter) |
| `read:knowledge` | Anzahl der Projekte mit Graph |
| `connect:claude` | Claude Desktop verbinden/trennen (fragt vorher) |
| `storage` | merkt sich das gewählte Projekt und deine Vorlagen |
| `native` | kleiner Server-Teil: prüft die Token-Tagesgrenze und schickt die Benachrichtigung |
| `extend:extensions` | der Knopf auf der Seite des Wissensgraphen (dessen Autor erlaubt es) |

## Entwickeln

```
node --test tests/*.test.js
node pfad/zu/sdk/check.js . --strict
```

Logik ohne Seite in `page/lib.js` (getestet), Server-Teil in `server/`.

## Lizenz

MIT
