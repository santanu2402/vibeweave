# Recommended MCP servers

The skills work without any MCP server. Connecting these makes them noticeably better: the
agent can pull real component source, read your Figma files, and *look* at what it built.

| Server | Why | Cost |
|---|---|---|
| **shadcn** | search/browse/install components from shadcn/ui and any shadcn-compatible registry (Magic UI, Aceternity, SmoothUI, Skiper UI, Vengeance UI…) | free |
| **Playwright** | drive a real browser: navigate, click, screenshot, read the DOM | free |
| **Chrome DevTools** | performance traces, console, network, Lighthouse-style insights | free (it collects usage statistics by default — every snippet below passes `--no-usage-statistics`) |
| **Figma** | read frames, variables and styles from your design files | Figma account (OAuth) |
| **21st MCP** (formerly Magic) | search the 21st.dev component library (free); get/generate components (paid) | key at https://21st.dev/mcp |
| **Magic UI** | search and fetch Magic UI components | free (`pnpm dlx @magicuidesign/cli@latest install <client>`) |
| **Inspo** | archive of 830+ production websites with captures and DESIGN.md | free, rate-limited |

Prefer the **Playwright CLI** over the MCP for coding agents when token budget matters:
`npm i -g @playwright/cli@latest && playwright-cli install --skills` (also bundled as `npx playwright cli`).
Vibeweave's own browser scripts (`qa.mjs`, `vitals.mjs`, `probe.mjs`, `screenshot.mjs`) need only Playwright
in the project — no MCP required.

Config formats differ per IDE and change over time — if a snippet fails, check your IDE's MCP docs.
Replace `YOUR_21ST_KEY` with your key; never commit real keys (use the IDE's secret/input mechanism
or environment variables where available).

---

## Claude Code
```bash
claude mcp add shadcn -- npx shadcn@latest mcp            # or: npx shadcn@latest mcp init --client claude
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --no-usage-statistics
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport http magic https://21st.dev/api/mcp --header "x-api-key: YOUR_21ST_KEY"
npx -y inspo-mcp install                                  # interactive; --dry-run to preview
```
Add `--scope user` to make a server available in every project, or `--scope project` to write a shared
`.mcp.json`. 21st.dev also offers `npx @21st-dev/cli@latest init --client claude`.

## Cursor — `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global)
```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"] },
    "figma": { "url": "https://mcp.figma.com/mcp" },
    "magic": { "url": "https://21st.dev/api/mcp", "headers": { "x-api-key": "YOUR_21ST_KEY" } }
  }
}
```
Or: `npx @21st-dev/cli@latest init --client cursor`.

## VS Code / GitHub Copilot — `.vscode/mcp.json`
```json
{
  "inputs": [{ "type": "promptString", "id": "magic-key", "description": "21st.dev API key", "password": true }],
  "servers": {
    "shadcn": { "type": "stdio", "command": "npx", "args": ["shadcn@latest", "mcp"] },
    "playwright": { "type": "stdio", "command": "npx", "args": ["@playwright/mcp@latest"] },
    "chrome-devtools": { "type": "stdio", "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"] },
    "figma": { "type": "http", "url": "https://mcp.figma.com/mcp" },
    "magic": { "type": "http", "url": "https://21st.dev/api/mcp", "headers": { "x-api-key": "${input:magic-key}" } }
  }
}
```

## Windsurf — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"] },
    "figma": { "serverUrl": "https://mcp.figma.com/mcp" },
    "magic": { "serverUrl": "https://21st.dev/api/mcp", "headers": { "x-api-key": "YOUR_21ST_KEY" } }
  }
}
```
21st.dev: `npx @21st-dev/cli@latest init --client devin` (`windsurf` is an alias).

## OpenAI Codex — `~/.codex/config.toml`
```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]

[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]

[mcp_servers.chrome-devtools]
command = "npx"
args = ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"]

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.magic]
url = "https://21st.dev/api/mcp"
http_headers = { "x-api-key" = "YOUR_21ST_KEY" }
```
CLI alternative: `codex mcp add playwright -- npx @playwright/mcp@latest`.

## Gemini CLI — `~/.gemini/settings.json` or `.gemini/settings.json`
```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"] },
    "figma": { "httpUrl": "https://mcp.figma.com/mcp" },
    "magic": { "httpUrl": "https://21st.dev/api/mcp", "headers": { "x-api-key": "YOUR_21ST_KEY" } }
  }
}
```

## Google Antigravity
Agent panel → `…` → **MCP Servers** → **Manage MCP Servers** → **View raw config** (`mcp_config.json`).
Use the same `mcpServers` shape as Windsurf above (`command`/`args` for local servers, `serverUrl` for remote).

## Kiro — `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (user)
Same `mcpServers` shape as Cursor (`command`/`args`, or `url` + `headers` for remote servers).

## Other agents (Cline, Roo Code, Continue, Goose, Zed, OpenCode…)
All support MCP with a `command` + `args` (stdio) or `url` (HTTP) entry; paste the values from the
table above into the agent's MCP settings.

---

### Without MCP
The skills fall back to bundled scripts: `scripts/screenshot.mjs` (Playwright screenshots + checks),
`scripts/extract-tokens.mjs` (design-token extraction from a URL) and `npx shadcn@latest add …` for components.
