const FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// Only these currencies matter for a EUR/USD-focused agent
const RELEVANT_CURRENCIES = ['USD', 'EUR'];

/**
 * Fetches this week's economic calendar from ForexFactory's free public
 * export (no API key needed). Note: this feed gives schedule, forecast,
 * and previous — it does NOT include the "actual" released value, since
 * that's the part every provider gates behind a paid plan. Actual values
 * get logged manually when you trigger the workflow after seeing a release.
 */
export async function getUpcomingEvents() {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`ForexFactory calendar request failed: ${res.status} ${res.statusText}`);
  }

  const events = await res.json();

  return events
    .filter(e => RELEVANT_CURRENCIES.includes(e.country))
    .filter(e => e.impact === 'High')
    .map(e => ({
      event: e.title,
      country: e.country,
      time: new Date(e.date).toISOString(),
      forecast: e.forecast || null,
      previous: e.previous || null,
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}
