import { getLivePrice, getRecentCandles } from './price.js';

try {
  const live = await getLivePrice();
  console.log(`Live EUR/USD price: ${live.price} (as of ${live.timestamp})\n`);

  const candles = await getRecentCandles(5);
  console.log('Last 5 one-minute candles:');
  candles.forEach(c => console.log(`  ${c.time} -> ${c.close}`));
} catch (err) {
  console.error('Price test failed:', err.message);
}
