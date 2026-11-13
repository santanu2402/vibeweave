#!/usr/bin/env node
// Vibeweave usage report — a Claude Code Stop hook. When Claude finishes a reply it reads the session
// transcript and shows, in the chat, how long the run took and how many tokens it used (input, cache
// read/write, output), including work delegated to subagents, plus session totals. Each run is also
// appended to <project>/.vibeweave/usage.jsonl so usage can be tracked over time.
// Zero dependencies, local only (reads the transcript, never sends anything). Never blocks: any problem → silent exit 0.
//   VIBEWEAVE_USAGE=off    disable · VIBEWEAVE_USAGE=quiet  log to file only, no chat message
// Manual mode (when a company policy such as allowManagedHooksOnly blocks project hooks):
//   node usage-report.mjs --last [project-dir]   (or: npx vibeweave usage)  report the latest run there
import { readFileSync, existsSync, readdirSync, mkdirSync, appendFileSync, statSync, realpathSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { homedir } from "node:os";

const cli = process.argv.slice(2), manual = cli[0] === "--last";
const mode = (process.env.VIBEWEAVE_USAGE || "on").toLowerCase();
if (mode === "off" && !manual) process.exit(0);

/** Newest transcript for a project folder. Claude Code stores them in
 *  ~/.claude/projects/<project path with every non-alphanumeric → "-">/<session>.jsonl (long paths are truncated). */
function latestTranscript(dir) {
  const projects = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects");
  let real = dir; try { real = realpathSync.native(dir); } catch {}
  const key = real.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  if (!existsSync(projects)) return null;
  const dirs = readdirSync(projects).filter((d) => d.toLowerCase() === key || (key.length > 180 && d.toLowerCase().startsWith(key.slice(0, 180))));
  const files = dirs.flatMap((d) => { try { return readdirSync(join(projects, d)).filter((f) => f.endsWith(".jsonl")).map((f) => join(projects, d, f)); } catch { return []; } });
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || null;
}

let input = {};
if (manual) {
  const cwd = resolve(cli[1] || process.cwd());
  input = { cwd, transcript_path: latestTranscript(cwd) };
  if (!input.transcript_path) { console.error(`No Claude Code session found for ${cwd}`); process.exit(1); }
} else {
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }
}
const transcript = input.transcript_path;
if (typeof transcript !== "string" || !transcript.endsWith(".jsonl") || !existsSync(transcript)) process.exit(0);

const fmtN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));
const fmtT = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`; };
const zero = () => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0, calls: 0 });

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

/** Parse a transcript: usage per unique API message (a response is split across several lines that share
 *  message.id — count it once), and the timestamp of every real user prompt (not tool results). Bad lines are skipped. */
function parse(file, since = 0) {
  const total = zero(), afterSince = zero(), prompts = [], seen = new Set();
  let first = Infinity, last = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.includes('"type":"assistant"') && !line.includes('"type":"user"')) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e || typeof e !== "object") continue;
    const t = Date.parse(e.timestamp || "") || 0;
    if (t) { first = Math.min(first, t); last = Math.max(last, t); }
    if (e.type === "user" && !e.isSidechain && !e.isMeta) {
      const c = e.message?.content;
      const isPrompt = typeof c === "string" ? !c.startsWith("<") : Array.isArray(c) && c.some((b) => b.type === "text") && !c.some((b) => b.type === "tool_result");
      if (isPrompt && t) prompts.push(t);
      continue;
    }
    if (e.type !== "assistant") continue;
    const u = e.message?.usage, id = e.message?.id || e.requestId || e.uuid;
    if (!u || seen.has(id)) continue;
    seen.add(id);
    for (const bucket of t >= since ? [total, afterSince] : [total]) {
      bucket.input += num(u.input_tokens); bucket.cacheRead += num(u.cache_read_input_tokens);
      bucket.cacheWrite += num(u.cache_creation_input_tokens); bucket.output += num(u.output_tokens); bucket.calls++;
    }
  }
  return { total, afterSince, prompts, first, last };
}

try {
  const main = parse(transcript);
  const turnStart = main.prompts.length ? main.prompts[main.prompts.length - 1] : main.first;
  const turn = parse(transcript, turnStart).afterSince;
  const now = manual ? main.last : Date.now(); // manual: the run already ended at its last message

  // Subagents: <session>/subagents/agent-*.jsonl next to the main transcript.
  const subDir = join(dirname(transcript), basename(transcript, ".jsonl"), "subagents");
  const subTurn = zero(), subTotal = zero(); let subCount = 0;
  if (existsSync(subDir) && statSync(subDir).isDirectory()) for (const f of readdirSync(subDir).filter((f) => f.endsWith(".jsonl"))) {
    const s = parse(join(subDir, f), turnStart);
    for (const k of Object.keys(subTotal)) { subTotal[k] += s.total[k]; subTurn[k] += s.afterSince[k]; }
    if (s.afterSince.calls) subCount++;
  }
  const add = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + b[k]]));
  const run = add(turn, subTurn), session = add(main.total, subTotal);
  const runIn = run.input + run.cacheRead + run.cacheWrite;

  const msg = [
    `Vibeweave · run ${fmtT(now - turnStart)} · input ${fmtN(runIn)} (new ${fmtN(run.input + run.cacheWrite)}, cached ${fmtN(run.cacheRead)}) · output ${fmtN(run.output)} · ${run.calls} calls`
      + (subCount ? ` · ${subCount} subagent${subCount > 1 ? "s" : ""}` : ""),
    `Session · ${fmtT(now - main.first)} · input ${fmtN(session.input + session.cacheRead + session.cacheWrite)} · output ${fmtN(session.output)}`,
  ].join("\n");

  if (manual) { console.log(msg); process.exit(0); } // print only; the run was not logged by a hook
  try {
    const dir = join(input.cwd || process.cwd(), ".vibeweave");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "usage.jsonl"), JSON.stringify({ at: new Date(now).toISOString(), session: input.session_id,
      durationMs: now - turnStart, run, subagents: subCount, sessionTotals: session }) + "\n");
  } catch {}

  if (mode !== "quiet") process.stdout.write(JSON.stringify({ systemMessage: msg }));
} catch { /* never break the user's session */ }
process.exit(0);
