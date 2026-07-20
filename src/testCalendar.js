import { getUpcomingEvents } from './calendar.js';

try {
  const events = await getUpcomingEvents();
  console.log(`Found ${events.length} high-impact USD/EUR events this week:\n`);
  events.forEach(e => {
    console.log(`- ${e.event} (${e.country}) at ${e.time} | forecast: ${e.forecast}, previous: ${e.previous}`);
  });
} catch (err) {
  console.error('Calendar test failed:', err.message);
}
