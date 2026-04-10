import fs from "node:fs/promises";
import path from "node:path";
import { config, ensureDataDirectories } from "../config.js";

function defaultState() {
  return {
    version: 1,
    lastRunAt: null,
  };
}

export async function loadState() {
  ensureDataDirectories();

  try {
    const raw = await fs.readFile(config.statePath, "utf8");
    // Handle empty or invalid JSON files
    if (!raw || !raw.trim()) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultState();
    }
    // Return default state for invalid JSON instead of throwing
    if (error instanceof SyntaxError) {
      console.warn(
        "State file is corrupted or invalid, starting fresh:",
        error.message,
      );
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

/**
 * Check if a message is new based on its timestamp compared to lastRunAt
 * @param {Object} state - Current state with lastRunAt timestamp
 * @param {Date} messageDate - Parsed date of the message
 * @returns {boolean} true if message is newer than last run
 */
export function isNewMessage(state, messageDate) {
  if (!state.lastRunAt) {
    return false; // During initial sync, no messages are considered "new"
  }
  const lastRun = new Date(state.lastRunAt);
  return messageDate > lastRun;
}
