const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Generate a short plain-English trading read from the event + surprise + price reaction.
 * Tries OpenRouter (free Llama 3.3-70B) first, falls back to Anthropic if configured,
 * falls back to a template-based summary if both are unavailable or fail.
 */
export async function generateSummary({ event, surprise, priceSnapshot }) {
  const prompt = buildPrompt({ event, surprise, priceSnapshot });

  if (OPENROUTER_KEY) {
    const result = await tryOpenRouter(prompt);
    if (result) return result;
  }

  if (ANTHROPIC_KEY) {
    const result = await tryAnthropic(prompt);
    if (result) return result;
  }

  return templateSummary({ event, surprise, priceSnapshot });
}

function buildPrompt({ event, surprise, priceSnapshot }) {
  return `You are a terse forex trading assistant. Given this economic release and EUR/USD price reaction, write a 2-3 sentence trading-relevant read. Be direct, no fluff, no disclaimers.

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
}

async function tryOpenRouter(prompt) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned no content');
    return text.trim();
  } catch (err) {
    console.error('OpenRouter summary generation failed, falling back:', err.message);
    return null;
  }
}

async function tryAnthropic(prompt) {
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
    if (!text) throw new Error('Anthropic returned no content');
    return text;
  } catch (err) {
    console.error('Anthropic summary generation failed, falling back to template:', err.message);
    return null;
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
