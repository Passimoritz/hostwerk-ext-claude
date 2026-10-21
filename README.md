![AI Connect](banner.svg)

# AI Connect

Connect your AIs with Hostwerk: what every AI knows about you and your projects (memory), Claude Desktop and Claude Code connected, get going right in your project, save tokens, tips & tricks.

[Deutsch](README.de.md) · An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension. Extension id: `claude` (the name it had at first). The engine stays inside Hostwerk; this extension is its interface plus a small server part for the token limit.

## Tabs

- **Memory:** what every AI (Claude, OpenAI, Gemini, local …) gets from your thought network – topics, project, graph, size – with a preview per provider.
- **Get going:** pick a project, describe the task (or use a template such as *Fix a bug* or *Write tests*, or your own templates). Hostwerk opens Claude Code in the project folder and types the command into the Hostwerk terminal. You start it with Enter. Install Claude Code, Claude Desktop or Claude in the browser from the same page.
- **Connect:**
  - connect Claude Desktop and Claude Code to your thought network (MCP);
  - write the context into the files other AI tools read (`CLAUDE.md`, `.cursorrules`, …);
  - open the knowledge graph, or copy the context for claude.ai.
- **Save tokens:**
  - usage per day as a chart, with the trend, and a daily limit;
  - token-saving tools from the online catalog, installed in one click and kept up to date, with pros and cons and a comparison;
  - new projects discovered on GitHub.
- **Tips & tricks:** searchable cards in four categories (keep the context small, good requests, keys & commands, with Hostwerk). Copy commands with one click.
- **Log:** what a connected Claude read and remembered.

## In Hostwerk

- Tab **Get going with AI** in the Projects area
- **Ctrl+Alt+C** (changeable under Settings → General → Shortcuts), the quick search and the “New” menu: *Start Claude in a project*
- Button **Ask Claude with the graph** on the page of the knowledge graph extension
- **Daily token limit** (Settings → Notifications): at 80 % and when it is reached Hostwerk tells you through your notifications – once per day each
- **Own templates** for tasks: saved for everyone who uses this Hostwerk, shared with the team as a short text (*Share templates* / *Paste templates*)

## Permissions

| Permission | Why |
|---|---|
| `read:claude` | Claude status, projects, memory context, tools and usage |
| `change:claude` | write context files, install/remove tools (Hostwerk asks first) |
| `run:terminal` | type `claude …` into the Hostwerk terminal (you press Enter) |
| `read:knowledge` | number of projects with a graph |
| `connect:claude` | connect/disconnect Claude Desktop (asks first) |
| `storage` | remembers the chosen project and your templates |
| `native` | small server part: checks the daily token limit and sends the notification |
| `extend:extensions` | the button on the knowledge graph page (its author allows it) |

## Development

```
node --test tests/*.test.js
node path/to/sdk/check.js . --strict
```

Logic without a page in `page/lib.js` (tested), server part in `server/`.

## License

MIT
