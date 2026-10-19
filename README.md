# Claude

Claude with Hostwerk: connect Claude Desktop and Claude Code, get going right in your project, save tokens, and pick up tips & tricks for better results.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension (SDK 2.5). The engine stays inside Hostwerk; this extension is its interface.

## Tabs

- **Get going:** pick a project, describe the task (or use a template such as *Fix a bug* or *Write tests*). Hostwerk opens Claude Code in the project folder and types the command into the Hostwerk terminal. You start it with Enter. Install Claude Code, Claude Desktop or Claude in the browser from the same page.
- **Connect:**
  - connect Claude Desktop and Claude Code to your thought network (MCP);
  - write the context into the files other AI tools read (`CLAUDE.md`, `.cursorrules`, …);
  - open the knowledge graph, or copy the context for claude.ai.
- **Save tokens:**
  - usage per day as a chart, with the trend;
  - token-saving tools from the online catalog, installed in one click and kept up to date, with pros and cons and a comparison;
  - new projects discovered on GitHub.
- **Tips & tricks:** searchable cards in four categories (keep the context small, good requests, keys & commands, with Hostwerk). Copy commands with one click.
- **Log:** what a connected Claude read and remembered.

## Permissions

| Permission | Why |
|---|---|
| `read:claude` | Claude status, projects, memory context, tools and usage |
| `change:claude` | write context files, install/remove tools (Hostwerk asks first) |
| `run:terminal` | type `claude …` into the Hostwerk terminal (you press Enter) |
| `read:knowledge` | number of projects with a graph |
| `connect:claude` | connect/disconnect Claude Desktop (asks first) |
| `storage` | remembers the chosen project |

## Development

```
node --test tests/*.test.js
node path/to/sdk/check.js . --strict
```
