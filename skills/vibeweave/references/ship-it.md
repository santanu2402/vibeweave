# H. Ship it — production-ready, then on GitHub

Starts when the owner says **"ship it"**, "finalize", "publish", "push it to GitHub" or "make it production ready" —
after the last feedback round, never before the ship gates pass. Tool: `vibeweave/scripts/ship.mjs`
(`check` · `prepare` · `gh` · `install` · `publish`). Safe steps (checks, builds, the scan, `prepare`) run without
asking; installing software and publishing wait for the approved ship plan.

## 1. Ship plan — one approval for everything outward-facing
Before touching anything, show one short plan and wait for "yes" (the No rule applies):

```
Ship plan
- Clean up: remove debug logs, dead code, unused files/deps and dev-only comments; keep meaningful comments.
- Verify: production build + npx vibeweave check <url> must PASS (and audit --strict, seo.mjs).
- GitHub copy: <project>-github/ — leaves out node_modules, build output, .env, keys, .design-review/, .vibeweave/,
  MEMORY.md, BUILDLOG.md (contracts REQUIREMENTS/PLAN/TASKS go to docs/ only if you want them).
- Repo: <owner>/<name> · public or private? · licence (MIT?) · description: "<one line>"
- GitHub CLI: installed / will install with <command> · login: done / you'll log in once in your browser
Go?
```
Ask only what you can't infer: repo name, visibility, licence, owner name for the licence. Never publish, install
software or create a repo without this "yes".

## 2. Clean the codebase (in the project itself)
1. **Debug and dead code.** `ship.mjs check .` lists console.log/debugger/TODO/localhost leftovers per file. Remove
   debug output (keep real error handling), unreachable code, commented-out blocks, unused components, styles,
   assets and dependencies (search for each import before deleting; never guess).
2. **Comments.** Delete dev chatter ("fix later", "trying this"); keep and improve comments that explain *why*; add a
   one-line header to files whose purpose isn't obvious. No placeholder text, no lorem ipsum (`audit.mjs --strict`).
3. **Configuration.** Secrets only in environment variables; commit `.env.example` with names and no values. Public
   build-time keys (analytics IDs, EmailJS public keys) are fine — say so in the README.
4. **Production build.** Run the real build. Fix warnings that matter (chunk size, missing assets). Security headers
   for the host if there's a static host (`_headers`, `vercel.json`, `netlify.toml`) — a strict CSP, HSTS, nosniff.
5. **Re-verify — quality gate.** `npx vibeweave check <production-preview-url> --pages …` must be **PASS**
   (INCOMPLETE is not PASS), plus `audit.mjs --strict` and `seo.mjs` for public sites. A failing gate stops the ship:
   report it and offer a fix round instead.

## 3. GitHub-ready folder
```bash
node ship.mjs prepare . --out ../<name>-github --license mit --owner "Full Name"   # add --include-contracts to keep the specs
```
Then write what `prepare` can't:
- **README.md** — name and one-line pitch · screenshot or live link · features · tech stack · setup
  (`npm install`, `.env.example`) · scripts · deploy steps · project structure · licence · author/contact. Facts only,
  from REQUIREMENTS.md, the build and the measured evidence table (no invented numbers).
- **Optional, when they fit:** `SECURITY.md` (how to report a vulnerability), `CONTRIBUTING.md`, and a CI workflow
  `.github/workflows/ci.yml` that installs and builds on push (pin actions to commit SHAs, `permissions: contents: read`).

Re-run `node ship.mjs check ../<name>-github` until **0 errors**. Secrets are errors: remove them, and tell the owner
to rotate any key that was ever committed or shared.

## 4. GitHub CLI and login
```bash
node ship.mjs gh                 # exit 0 ready · 2 no git · 3 no GitHub CLI · 4 not logged in
node ship.mjs install git --yes  # only after the user said yes (the ship plan names it)
node ship.mjs install gh --yes
```
- **Not installed (git or gh):** install it yourself — `install` picks the machine's package manager (winget or
  choco on Windows, Homebrew or Apple's command-line tools on macOS, apt/dnf/pacman/zypper on Linux) and finds the
  new binary at its default path even before the terminal's PATH refreshes. Without `--yes` it only prints what it
  would run. If Linux `sudo` needs a password, ask the user to run the printed command in their own terminal.
- **Not logged in:** the owner runs `gh auth login --web --git-protocol https` in their own terminal (in Claude Code:
  `! gh auth login --web`) and finishes in the browser. Never ask for, type or paste tokens or passwords.
- Re-run `ship.mjs gh` until it says "Ready to publish."

## 5. Publish
```bash
node ship.mjs publish ../<name>-github --repo <name> --public --description "<one line>" --yes
```
`--yes` records the owner's approval from step 1. `publish` re-checks for secrets and refuses if any remain,
initialises git on `main`, commits (using the owner's git identity, or their GitHub noreply address), creates the
repository with `gh repo create --source --push` and prints the URL. If the name is taken, ask for another.

## 6. Summary — the last message
```
Shipped ✔  https://github.com/<owner>/<name>  (public · MIT)
- Cleaned: <n> debug logs, <n> unused files, <n> dependencies; comments tidied
- Verified: vibeweave check PASS · LCP <x> s · CLS <x> · TBT <x> ms · audit <x>/50 · 0 secrets
- Repo contents: README, LICENSE, .gitignore, <SECURITY.md, CI> · <n> files
- Next: connect the repo to your host for automatic deploys · add topics and a social preview image on GitHub
```
Then log it in `BUILDLOG.md` (what shipped, the URL, the evidence) and note the repo in `MEMORY.md`.
