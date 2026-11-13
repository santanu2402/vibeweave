# Integration Recipes

Versions checked November 2026. Pin versions in projects; re-check majors before upgrading.

## Contents
1. API client + typed errors (RFC 9457)
2. Types from OpenAPI
3. Server state: TanStack Query v5 / SWR
4. Forms: React Hook Form + zod, React 19 actions, others
5. Mapping server errors to fields
6. Mocking: mock-api.mjs, MSW 3, Playwright routes/HAR, other mock servers
7. Mock data with faker
8. Auth, retries, offline
9. Contract tests

## 1. API client + typed errors
```ts
// src/lib/api.ts — the only place that calls fetch
export type Problem = { type?: string; title: string; status: number; detail?: string;
  errors?: { pointer?: string; field?: string; detail?: string; message?: string }[] };
export class ApiError extends Error { constructor(public problem: Problem) { super(problem.title); } }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? import.meta.env?.VITE_API_URL ?? "/api";

export async function api<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const { json, timeoutMs = 15000, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { accept: "application/json", ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    credentials: "include",
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.title ? body : { title: res.statusText || "Request failed", status: res.status });
  return body as T;
}
```
Errors follow **RFC 9457** (`application/problem+json`; obsoletes RFC 7807): `type`, `title`, `status`,
`detail`, `instance` + extensions. The spec's validation example uses `errors: [{ detail, pointer: "#/age" }]`.

## 2. Types from OpenAPI (never hand-write what a spec can generate)
| Tool | Version | Use |
|---|---|---|
| openapi-typescript + openapi-fetch | 7.13 / 0.17 · MIT | most used; types only + tiny typed fetch: `npx openapi-typescript api.yaml -o src/api/schema.d.ts`, then `createClient<paths>({ baseUrl })` and `const { data, error } = await client.GET("/posts/{id}", { params: { path: { id } } })` |
| @hey-api/openapi-ts | 0.99 (0.x — pin exactly: `npm i -D -E`) · MIT | plugin-based SDK + TanStack Query + zod generation |
| Orval | 8.x · MIT | ESM, Node ≥ 22.18; zod v4 default; also generates MSW mocks |
| Kubb | 5.x · MIT | plugin ecosystem (check v5 config shape) |
Validate at runtime too when the backend isn't yours: **zod 4.6** (`import * as z from "zod"`, `schema.safeParse(x)`,
`z.flattenError(err).fieldErrors`) or **valibot 1.5** (`v.safeParse(schema, x)`).

## 3. Server state
**TanStack Query** (`@tanstack/react-query` 5.107 — still v5; no v6 for React):
```tsx
const studios = useQuery({ queryKey: ["studios", { city }], queryFn: () => api<Studio[]>(`/studios?city=${city}`), staleTime: 60_000 });
// studios.isPending → skeleton · studios.isError → error state with retry: studios.refetch() · data.length === 0 → empty state

const book = useMutation({
  mutationFn: (b: NewBooking) => api<Booking>("/bookings", { method: "POST", json: b }),
  onMutate: async (b, context) => {                       // v5: 2nd arg is the mutation context (context.client = QueryClient)
    await context.client.cancelQueries({ queryKey: ["bookings"] });
    const previous = context.client.getQueryData<Booking[]>(["bookings"]);
    context.client.setQueryData<Booking[]>(["bookings"], (old = []) => [...old, { ...b, id: "temp", status: "pending" }]);
    return { previous };                                   // becomes `onMutateResult` below
  },
  onError: (_err, _b, onMutateResult, context) => context.client.setQueryData(["bookings"], onMutateResult?.previous),
  onSettled: (_d, _e, _b, _r, context) => context.client.invalidateQueries({ queryKey: ["bookings"] }),
});
```
(Older guides call the 3rd callback argument "context" — in current v5 it's `onMutateResult` and the 4th is the context.)
Simpler optimistic UI: render from `book.isPending` + `book.variables`. **SWR** 2.5 (MIT) is fine for read-heavy apps.
Next.js / Remix / SvelteKit / Nuxt loaders and server components can replace client caching for page data.

## 4. Forms
**React Hook Form 7.91 + zod** (RHF v8 is in beta — `watch` callback → `subscribe`):
```tsx
const schema = z.object({ email: z.email("Enter a valid email address"), date: z.string().min(1, "Pick a date") });
type Values = z.infer<typeof schema>;
const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });   // @hookform/resolvers 7 (zod ^3.25 || ^4)
const onSubmit = form.handleSubmit(async (values) => {
  try { await api("/bookings", { method: "POST", json: values }); toast.success("Booked — check your email"); }
  catch (e) { if (e instanceof ApiError) applyServerErrors(e.problem, form.setError); else throw e; }
});
// <input {...form.register("email")} type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} aria-describedby="email-error" />
// {form.formState.errors.email && <p id="email-error" role="alert">{form.formState.errors.email.message}</p>}
// <button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Booking…" : "Book session"}</button>
```
**React 19 + Next 16 server actions** (no client form library):
```tsx
// actions.ts
"use server";
export async function bookAction(_prev: State, formData: FormData): Promise<State> {
  const values = Object.fromEntries(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  /* save… */ return { ok: true, values: {} };
}
// form.tsx (client) — React resets uncontrolled fields after an action: feed values back via defaultValue
const [state, formAction, isPending] = useActionState(bookAction, { values: {} });
// <form action={formAction}> <input name="email" defaultValue={state.values.email} /> … <SubmitButton /> </form>
// SubmitButton uses useFormStatus() from "react-dom" — it must be a child component of the <form>.
```
Others: **TanStack Form 1.x** (Standard Schema validators), **Conform 1.x** (`@conform-to/zod/v4` for zod 4) for
progressive-enhancement forms; Vue: VeeValidate; Svelte: Superforms.

## 5. Mapping server errors to fields
```ts
export function applyServerErrors(p: Problem, setError: (name: any, e: { type: string; message: string }) => void) {
  let mapped = 0;
  for (const e of p.errors ?? []) {
    const name = e.field ?? e.pointer?.replace(/^#\//, "").replaceAll("/", ".");   // "#/address/city" → "address.city"
    const message = e.message ?? e.detail ?? "Invalid value";
    if (name) { setError(name, { type: "server", message }); mapped++; }
  }
  if (!mapped) setError("root.server", { type: "server", message: p.detail ?? p.title });   // form-level message
}
```
Then focus the first invalid field and show a summary above the form for long forms.

## 6. Mocking
- **`scripts/mock-api.mjs`** (this skill, zero deps): collections, 422 schemas, custom routes, OpenAPI examples,
  `x-mock-scenario` header to force error/slow/empty/unauthorized/invalid. Best for "the backend doesn't exist yet".
- **MSW 3.0** (MIT; ESM-only, Node ≥ 22, TS ≥ 5.9) — mocks inside the app and tests:
  ```ts
  import { http, HttpResponse, delay } from "msw";
  export const handlers = [
    http.get("/api/studios/:id", async ({ params }) => { await delay(300); return HttpResponse.json({ id: params.id, name: "Clay Corner" }); }),
    http.post("/api/bookings", () => HttpResponse.json({ title: "Validation failed", status: 422, errors: [{ pointer: "#/email", detail: "Already booked" }] },
      { status: 422, headers: { "Content-Type": "application/problem+json" } })),
    http.get("/api/flaky", () => HttpResponse.error()),               // network failure
  ];
  // browser: npx msw init public/ --save; setupWorker(...handlers) from "msw/browser"; await worker.start() before render
  // Vite dev: import { msw } from "msw/vite"     // node/tests: setupServer from "msw/node"; server.listen({ onUnhandledFrame: "error" })
  ```
  v3 changes from v2: `onUnhandledRequest` → `onUnhandledFrame`; `await worker.stop()`; read cookies from the resolver's
  `cookies` argument; fake timers are yours to advance. Playwright: `@msw/playwright` (`defineNetworkFixture`).
  `@msw/source` generates handlers from OpenAPI or HAR.
- **Playwright** (1.65): `await page.route("**/api/bookings", (r) => r.fulfill({ status: 422, json: problem }))`,
  `r.abort()` for network errors, `page.routeFromHAR("api.har", { url: "**/api/**", update: true })` to record & replay.
- **Other mock servers:** Mockoon CLI 9 (`npx @mockoon/cli start --data openapi.yaml --port 3001`), Stoplight Prism 5
  (`prism mock api.yaml`; needs a recent Node — check engines), json-server (1.0 still beta; 0.17 stable — v1 uses string
  ids, `_per_page`, no `--delay`).

## 7. Mock data with faker
`@faker-js/faker` 10 (MIT, ESM): `faker.person.fullName()`, `faker.location.city()`, `faker.commerce.price()`,
`faker.date.soon()`. Seed for stable screenshots: `faker.seed(42)`. Include edge cases on purpose: very long names,
empty lists, 1 item, 1,000 items, missing images, RTL text, zero prices.

## 8. Auth, retries, offline
- 401 → try one silent refresh (single in-flight promise shared by all requests), else redirect to sign-in with a
  `returnTo` and restore after login. Never store tokens in `localStorage` if an httpOnly cookie session is possible.
- Retries: GETs with exponential backoff + jitter (TanStack Query `retry: 2`); never auto-retry non-idempotent POSTs
  unless the API supports idempotency keys (`Idempotency-Key` header).
- 429: respect `Retry-After`; disable the action and show the wait.
- Offline: `navigator.onLine` + `online`/`offline` events → banner; disable or queue writes; refetch on reconnect
  (TanStack Query does this by default).

## 9. Contract tests
Pact JS 17 (MIT; Node ≥ 22; `PactV4`) for consumer-driven contracts when frontend and backend teams deploy
independently; otherwise validate real responses against the OpenAPI schema in CI (e.g. Prism proxy mode) and keep
`API-CONTRACT.md` as the human-readable agreement.
