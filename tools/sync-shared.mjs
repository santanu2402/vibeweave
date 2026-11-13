#!/usr/bin/env node
// Copy shared helper files from their canonical skill into the skills that reuse them.
// Usage: node tools/sync-shared.mjs
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHARED } from "./shared-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const { from, to } of SHARED) {
  for (const dest of to) {
    mkdirSync(dirname(join(root, dest)), { recursive: true });
    copyFileSync(join(root, from), join(root, dest));
    console.log(`synced ${from} → ${dest}`);
  }
}
