import { readFileSync, writeFileSync, existsSync } from 'fs';

const LOG_PATH = new URL('../data/event_log.json', import.meta.url);

export function logEvent(record) {
  let history = [];
  if (existsSync(LOG_PATH)) {
    try {
      history = JSON.parse(readFileSync(LOG_PATH, 'utf-8'));
    } catch {
      history = [];
    }
  }
  history.push({ ...record, loggedAt: new Date().toISOString() });
  writeFileSync(LOG_PATH, JSON.stringify(history, null, 2));
}
