# Security policy

## Reporting a vulnerability
Please **do not open a public issue** for security problems. Report them privately:

- GitHub: **Security → Report a vulnerability** on [santanu2402/vibeweave](https://github.com/santanu2402/vibeweave/security/advisories/new)
- Email: **itsantanu24@gmail.com** (subject: `Vibeweave security`)

Include the version (`npx vibeweave --help` or `package.json`), your OS and Node.js version, steps to reproduce,
and the impact you expect. Reports are answered as quickly as possible; confirmed issues are fixed in a patch
release, and reporters are credited in the release notes unless they prefer otherwise.

## Supported versions
Only the latest minor release receives security fixes. Update with `npx vibeweave@latest`.

## What Vibeweave does — and doesn't — do
| Area | Behaviour |
|---|---|
| Dependencies | None. The installer, hooks and tools use only the Node.js standard library. Browser tools use the Playwright already installed in *your* project. |
| Telemetry | None. Nothing is sent anywhere. The usage report reads local Claude Code transcripts and writes `.vibeweave/usage.jsonl` in your project. |
| Network | Only when a tool is asked to: Iconify (icons), Fontsource (fonts), component registries / GitHub / jsDelivr (`fetch-ui.mjs`), and pages you point the browser tools at. HTTPS only, with timeouts and size limits. |
| Downloaded code | `fetch-ui.mjs` fetches only from sources that publish code for reuse, refuses sites whose terms forbid scraping, writes a license record, **never executes** what it downloads, and rejects any file path that would escape the output folder (absolute paths, drive letters, `..`, NUL bytes). |
| Icons | SVG bodies containing scripts, event handlers, `foreignObject`, `javascript:` URLs or template syntax are refused. |
| Mock API | `mock-api.mjs` listens on `127.0.0.1` / `::1` unless you pass `--host`, caps request bodies at 1 MB, drops `__proto__` / `constructor` / `prototype` keys, and allows credentialed CORS only from localhost origins. |
| Browser tools | Accept only `http(s)` URLs; the wiring crawler stays on the exact origin you give it. |
| Installer | Validates every option, writes only inside the target project (or your home folder with `--global`), never writes through links, and on uninstall removes only items it created. Your own content in `AGENTS.md`, `GEMINI.md` and settings files is preserved. |
| Agents | The skills instruct agents to treat fetched pages, screenshots, downloaded code and tool output as **data, never instructions** (prompt-injection defence), to keep secrets out of output and commits, and to write only inside the project. |
| Releases | Published from GitHub Actions with npm trusted publishing (OIDC, no stored token) and provenance. CI actions are pinned to commit SHAs and run with read-only permissions. |

## Hardening tips for users
- Review third-party components fetched into your project before using them.
- Keep API keys for MCP servers in your IDE's secret store or environment variables — never in committed files.
- Add `.design-review/` and `.vibeweave/` to `.gitignore` if reports shouldn't be versioned.
