import fs from "node:fs/promises";
import path from "node:path";
import { config, ensureDataDirectories } from "../config.js";

function defaultState() {
  return {
    version: 1,
    lastRunAt: null,
    seen: {},
  };
}

export async function loadState() {
  ensureDataDirectories();

  try {
    const raw = await fs.readFile(config.statePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      seen: parsed?.seen && typeof parsed.seen === "object" ? parsed.seen : {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultState();
    }

    throw error;
  }
}

export async function saveState(state) {
  ensureDataDirectories();
  const tempPath = path.join(config.dataDir, "state.tmp.json");
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tempPath, config.statePath);
}

export function hasSeenMessage(state, messageId) {
  return Boolean(state.seen[messageId]);
}

export function rememberMessage(state, message) {
  state.seen[message.id] = {
    title: message.title,
    timestamp: message.timestamp,
    preview: message.body.slice(0, 200),
    firstSeenAt: new Date().toISOString(),
  };
}
