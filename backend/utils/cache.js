const NodeCache = require('node-cache');

// Create different TTLs for market hours and off-hours
const MARKET_HOURS_TTL = 600; // 10 minutes during market hours
const OFF_HOURS_TTL = 24 * 60 * 60; // 24 hours when market is closed

const cache = new NodeCache({ 
  stdTTL: MARKET_HOURS_TTL,
  checkperiod: 60
});

const cacheMiddleware = {
  get: (key) => cache.get(key),
  set: (key, data, isMarketOpen) => {
    const ttl = isMarketOpen ? MARKET_HOURS_TTL : OFF_HOURS_TTL;
    return cache.set(key, data, ttl);
  },
  has: (key) => cache.has(key)
};

module.exports = cacheMiddleware; 