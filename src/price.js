const TD_KEY = process.env.TWELVEDATA_API_KEY;
const TD_BASE = 'https://api.twelvedata.com';

/**
 * Get the latest real-time EUR/USD quote.
 */
export async function getLivePrice() {
  if (!TD_KEY) {
    throw new Error('TWELVEDATA_API_KEY missing. Copy .env.example to .env and add your key.');
  }

  const url = `${TD_BASE}/price?symbol=EUR/USD&apikey=${TD_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data price request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.code) {
    // Twelve Data returns {code, message} on error even with 200 status sometimes
    throw new Error(`Twelve Data error: ${data.message}`);
  }

  return {
    price: parseFloat(data.price),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get 1-minute candles for EUR/USD, used to snapshot price reaction
 * around a news release. Pulls the most recent `outputsize` candles.
 */
export async function getRecentCandles(outputsize = 30) {
  if (!TD_KEY) {
    throw new Error('TWELVEDATA_API_KEY missing. Copy .env.example to .env and add your key.');
  }

  const url = `${TD_BASE}/time_series?symbol=EUR/USD&interval=1min&outputsize=${outputsize}&apikey=${TD_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data time_series request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(`Twelve Data error: ${data.message}`);
  }

  // values come newest-first; reverse so they're chronological
  return (data.values || [])
    .map(v => ({
      time: v.datetime,
      close: parseFloat(v.close),
    }))
    .reverse();
}

/**
 * Given a release timestamp, find the closest price snapshots at
 * roughly -1min, +1min, +5min, +15min around it.
 */
export function snapshotAroundRelease(candles, releaseTime) {
  const releaseMs = new Date(releaseTime).getTime();
  const offsets = { before1m: -1, after1m: 1, after5m: 5, after15m: 15 };
  const result = {};

  for (const [label, minutesOffset] of Object.entries(offsets)) {
    const targetMs = releaseMs + minutesOffset * 60000;
    let closest = null;
    let closestDiff = Infinity;

    for (const candle of candles) {
      const diff = Math.abs(new Date(candle.time).getTime() - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = candle;
      }
    }
    result[label] = closest ? closest.close : null;
  }

  return result;
}
