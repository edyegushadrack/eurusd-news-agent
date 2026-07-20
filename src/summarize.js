const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Generate a short plain-English trading read from the event + surprise + price reaction.
 * Falls back to a template-based summary if no Anthropic key is set.
 */
export async function generateSummary({ event, surprise, priceSnapshot }) {
  if (!ANTHROPIC_KEY) {
    return templateSummary({ event, surprise, priceSnapshot });
  }

  const prompt = `You are a terse forex trading assistant. Given this economic release and EUR/USD price reaction, write a 2-3 sentence trading-relevant read. Be direct, no fluff, no disclaimers.

Event: ${event.event} (${event.country})
Actual: ${event.actual}
Forecast: ${event.forecast ?? 'n/a'}
Previous: ${event.previous ?? 'n/a'}
Surprise: ${surprise.directionalSurprise ?? 'n/a'} (${surprise.magnitude}, bullish for ${surprise.bullishFor || 'neither'})

EUR/USD price reaction:
1 min before: ${priceSnapshot.before1m}
1 min after: ${priceSnapshot.after1m}
5 min after: ${priceSnapshot.after5m}
15 min after: ${priceSnapshot.after15m}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text;
    return text || templateSummary({ event, surprise, priceSnapshot });
  } catch (err) {
    console.error('Summary generation failed, falling back to template:', err.message);
    return templateSummary({ event, surprise, priceSnapshot });
  }
}

function templateSummary({ event, surprise, priceSnapshot }) {
  const move1m = priceSnapshot.after1m && priceSnapshot.before1m
    ? ((priceSnapshot.after1m - priceSnapshot.before1m) * 10000).toFixed(1)
    : 'n/a';
  const move15m = priceSnapshot.after15m && priceSnapshot.before1m
    ? ((priceSnapshot.after15m - priceSnapshot.before1m) * 10000).toFixed(1)
    : 'n/a';

  const surpriseText = surprise.directionalSurprise !== null
    ? `${surprise.magnitude} ${surprise.directionalSurprise > 0 ? 'beat' : 'miss'} vs forecast`
    : 'no forecast available to compare';

  return `${event.event}: actual ${event.actual} (${surpriseText}). ` +
    `EUR/USD moved ${move1m} pips in first minute, ${move15m} pips over 15 min.`;
}
