---
name: ui-integrate
description: Connect UI to a backend: forms with validation and server field errors, buttons and actions with pending and optimistic states, navigation, data fetching and caching, every response state (401/403/404/409/422/429/5xx, offline), plus a mock API, endpoint inventory and API contract to test before the backend exists. Use for API integration, forms, error handling, mocking or backend alignment.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UI Integrate — forms, actions, data and the backend contract

A screen isn't done when it looks right; it's done when every control does the right thing for
every response the server can give. Work contract-first: agree on the API shape, mock it, build
the UI against the mock with all states, then swap in the real backend.

`<skill-dir>` = the folder containing this SKILL.md. Recipes with library versions:
[references/integration-recipes.md](references/integration-recipes.md).

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Workflow

### 1. Inventory — what does the UI need from the backend?
```bash
node <skill-dir>/scripts/endpoints.mjs src                                   # every fetch/axios/SWR/useFetch call, local API routes, server actions
node <skill-dir>/scripts/endpoints.mjs src --contract API-CONTRACT.md --mocks-out mocks.json
```
- For a new build, derive endpoints from `REQUIREMENTS.md` features and flows instead (each flow
  step that reads or writes data = one endpoint). Write them into `API-CONTRACT.md`.
- If the backend publishes OpenAPI, use it as the contract and generate types from it
  (see recipes) — never hand-write types that a spec can generate.

### 2. Contract — agree before building
For each endpoint in `API-CONTRACT.md`: method + path, auth, params/query (filters, sort,
pagination), request body + validation rules, success status + shape, every error status the UI
must handle, and which UI states it drives. Errors should follow RFC 9457 problem details
(`{ type, title, status, detail, errors: [{ field, message }] }`). Share it with the user (and the
backend team) — a contract change later is a requirements change (vibeweave No rule).

### 3. Mock — build and test without waiting for the backend
```bash
node <skill-dir>/scripts/mock-api.mjs --init                 # starter mocks.json (collections, schemas, routes)
node <skill-dir>/scripts/mock-api.mjs mocks.json --port 4010 --delay 200-900
node <skill-dir>/scripts/mock-api.mjs --openapi openapi.json # serve examples straight from the backend's spec
```
- Collections get full REST (filter, search, sort, paginate, CRUD); `schemas` return 422 field
  errors for form testing; `routes` cover anything custom (path params, templated bodies, per-input variants).
- Force any UI state from the client with the header `x-mock-scenario: error | slow | empty |
  unauthorized | forbidden | notfound | invalid` (or `?__scenario=`) — that's how QA verifies
  every loading, empty and error state deterministically.
- Point the app at it with an env var (`NEXT_PUBLIC_API_URL=http://localhost:4010/api`), never by
  editing call sites. In-app mocking (MSW) and test-time mocking (Playwright `page.route`) are in the recipes.
- Mock data must look real (names, prices, dates, long and short strings, 0/1/many items) and must
  never leak into production builds.

### 4. Build the data layer
- One API client module: base URL from env, JSON + auth headers, timeout (AbortController), parse
  problem details into a typed error, map 401 → sign-in flow. Components never call `fetch` directly.
- Server state through a cache library (TanStack Query, SWR, framework loaders/server components) —
  not `useEffect` + `useState` copies. Define keys, stale times and invalidation per resource.
- Validate responses at the boundary (zod/valibot schemas or generated types) so a backend change
  fails loudly in dev, not silently in the UI.

### 5. Wire every control — the state matrix
Patterns and copy rules for each state: `frontend-forge/references/feedback-states.md` (+ toast, loading-bar,
progress, skeleton patterns). For every **data view**: loading (skeleton matching the layout), empty (explain + first action),
error (plain-language message + retry), partial/stale, success. For every **action** (button,
form, toggle): idle → pending (disable + spinner/label change, prevent double submit) → success
(confirm in place, update the cache or redirect) → error (keep input, show the server's message,
focus it). Optimistic updates only with rollback on failure.

**Forms:** visible labels, correct `type`/`autocomplete`/`inputmode`, client validation that mirrors
the server's rules, server field errors (422) mapped onto the matching inputs, an error summary
with focus on the first error, the submit button stating the action, no data loss on failure.

**Navigation:** real links for navigation (`<a href>` / framework `Link`), buttons for actions;
URLs reflect state worth sharing (filters, tabs, pagination); Back works; protected routes redirect
to sign-in and back; 404 and error boundaries per route; active nav state; scroll and focus reset
on route change.

**Response handling map:**
| Status | UI |
|---|---|
| 400 | "Something's wrong with the request" + log; usually a bug |
| 401 | refresh token once, else go to sign-in and return afterwards |
| 403 | explain the missing permission; hide or disable the action |
| 404 | not-found state for that resource (not a blank page) |
| 409 | conflict: show the current version / ask to retry or merge |
| 422 | field errors on the inputs + summary |
| 429 | "Too many attempts — try again in Ns" (respect `Retry-After`) |
| 5xx / network / timeout | friendly error + retry (backoff for GETs; never auto-retry non-idempotent POSTs) |
| offline | banner, queue or disable writes, retry on reconnect |

### 6. Verify
- Run the app against the mock and force each scenario; check every view and action shows the right
  state. `ui-test`'s `wiring.mjs` confirms every page/link/button is connected; `qa.mjs` checks a11y.
- `node <skill-dir>/scripts/endpoints.mjs src --mocks mocks.json` → every endpoint the UI uses is mocked.
- Write Playwright tests that route API calls to fixtures for the critical flows (success, 422, 500).
- When the real backend arrives: point the env var at it, run the same tests, diff responses against the
  contract, and log mismatches as `FUNC-` findings for whoever owns the change.

## Report
Endpoints (count, implemented vs mocked vs missing), contract path, state-matrix coverage per screen,
forms and their error mapping, what was verified against the mock vs the real backend, open
contract questions. End with `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/endpoints.mjs [src] [--contract API-CONTRACT.md] [--mocks-out mocks.json] [--mocks mocks.json] [--json]` | inventory API calls (fetch/axios/ky/ofetch/SWR/useFetch), local API routes, server actions, base-URL env vars; draft the contract and a starter mock file; find unmocked endpoints |
| `scripts/mock-api.mjs [mocks.json] [--init] [--port 4010] [--delay 300\|200-900] [--fail 0.05] [--openapi spec.json]` | zero-dependency mock backend: REST collections, 422 validation, custom routes with params/templates, OpenAPI examples, latency/failure injection, forced UI scenarios, RFC 9457 errors, CORS |
