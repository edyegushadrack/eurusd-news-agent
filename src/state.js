import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_PATH = new URL('../data/processed_state.json', import.meta.url);

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { alerted: [], pending: [], processed: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    return {
      alerted: parsed.alerted || [],
      pending: parsed.pending || [],
      processed: parsed.processed || [],
    };
  } catch {
    return { alerted: [], pending: [], processed: [] };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function eventKey(event) {
  return `${event.event}-${event.time}`;
}

// --- Pre-alert tracking (upcoming event reminders) ---

export function isAlerted(event) {
  return loadState().alerted.includes(eventKey(event));
}

export function markAlerted(event) {
  const state = loadState();
  const key = eventKey(event);
  if (!state.alerted.includes(key)) {
    state.alerted.push(key);
  }
  if (state.alerted.length > 500) state.alerted = state.alerted.slice(-500);
  saveState(state);
}

// --- Pending tracking (actual logged, waiting for 15-min reaction window) ---

export function markPending(releasedEvent) {
  const state = loadState();
  const key = eventKey(releasedEvent);
  if (!state.pending.some(p => p.key === key)) {
    state.pending.push({
      key,
      releasedEvent,
      loggedAt: new Date().toISOString(),
    });
  }
  saveState(state);
}

export function getPending() {
  return loadState().pending;
}

export function markProcessed(releasedEvent) {
  const state = loadState();
  const key = eventKey(releasedEvent);
  state.processed.push(key);
  state.pending = state.pending.filter(p => p.key !== key);
  if (state.processed.length > 500) state.processed = state.processed.slice(-500);
  saveState(state);
}
