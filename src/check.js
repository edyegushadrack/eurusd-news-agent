import { getUpcomingEvents } from './calendar.js';
import { getRecentCandles, snapshotAroundRelease } from './price.js';
import { calculateSurprise } from './surprise.js';
import { generateSummary } from './summarize.js';
import { logEvent } from './logger.js';
import { sendTelegramAlert } from './telegram.js';
import { isAlerted, markAlerted, markPending, getPending, markProcessed } from './state.js';

const PREALERT_WINDOW_MS = 60 * 60 * 1000; // alert for events within the next 60 min
const REACTION_WAIT_MS = 15 * 60 * 1000; // wait 15 min after logging before pulling price reaction
const PENDING_TIMEOUT_MS = 2 * 60 * 60 * 1000; // give up on a pending event after 2 hours

async function handleManualLog() {
  const eventName = process.env.MANUAL_EVENT;
  const actual = process.env.MANUAL_ACTUAL;

  if (!eventName || !actual) return; // not a manual trigger, or missing required fields

  const releasedEvent = {
    event: eventName,
    country: process.env.MANUAL_COUNTRY || 'USD',
    time: new Date().toISOString(), // assume you're logging it right as it happens
    actual,
    forecast: process.env.MANUAL_FORECAST || null,
    previous: process.env.MANUAL_PREVIOUS || null,
  };

  console.log(`Manual log received: ${releasedEvent.event} (${releasedEvent.country}) actual=${actual}`);
  markPending(releasedEvent);
  console.log('Queued for reaction analysis in ~15 minutes (next scheduled runs will pick it up).');
}

async function handleUpcomingAlerts() {
  let events;
  try {
    events = await getUpcomingEvents();
  } catch (err) {
    console.error('Calendar fetch failed:', err.message);
    return;
  }

  const now = Date.now();
  const upcoming = events.filter(e => {
    const t = new Date(e.time).getTime();
    return t > now && t - now <= PREALERT_WINDOW_MS;
  });

  for (const event of upcoming) {
    if (isAlerted(event)) continue;

    const minutesAway = Math.round((new Date(event.time).getTime() - now) / 60000);
    const msg =
      `*Upcoming: ${event.event}* (${event.country})\n` +
      `In ~${minutesAway} min\n` +
      `Forecast: ${event.forecast ?? 'n/a'} | Previous: ${event.previous ?? 'n/a'}\n\n` +
      `When it drops, trigger the workflow manually with the actual value to get the reaction analysis.`;

    console.log(`Pre-alerting: ${event.event} (${event.country}) in ${minutesAway} min`);
    await sendTelegramAlert(msg);
    markAlerted(event);
  }
}

async function handlePendingEvents() {
  const pending = getPending();
  const now = Date.now();

  for (const p of pending) {
    const loggedAt = new Date(p.loggedAt).getTime();
    const age = now - loggedAt;

    if (age < REACTION_WAIT_MS) continue; // not enough time has passed yet

    if (age > PENDING_TIMEOUT_MS) {
      console.log(`Giving up on ${p.key} — too old.`);
      markProcessed(p.releasedEvent);
      continue;
    }

    console.log(`Processing pending event: ${p.key}`);

    const surprise = calculateSurprise(p.releasedEvent);
    if (!surprise) {
      console.log('  Could not compute surprise, skipping.');
      markProcessed(p.releasedEvent);
      continue;
    }

    let priceSnapshot;
    try {
      const candles = await getRecentCandles(30);
      priceSnapshot = snapshotAroundRelease(candles, p.loggedAt);
    } catch (err) {
      console.error('  Price fetch failed:', err.message, '- will retry next run.');
      continue;
    }

    const summary = await generateSummary({ event: p.releasedEvent, surprise, priceSnapshot });
    console.log('  Summary:', summary);

    await sendTelegramAlert(`*${p.releasedEvent.event}* (${p.releasedEvent.country}) — reaction\n\n${summary}`);

    logEvent({ event: p.releasedEvent, surprise, priceSnapshot, summary });
    markProcessed(p.releasedEvent);
  }
}

async function main() {
  console.log(`\n[${new Date().toISOString()}] Running check...`);

  try {
    await handleManualLog();
    await handleUpcomingAlerts();
    await handlePendingEvents();
  } catch (err) {
    console.error('Error during check:', err.message);
    process.exitCode = 1;
  }

  console.log('Check complete.\n');
}

main();
