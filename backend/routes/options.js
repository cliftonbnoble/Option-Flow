const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const router = express.Router();
const cache = require('../utils/cache');
const { isMarketOpen } = require('../utils/marketUtils');

// Track last known market status
let lastKnownMarketStatus = null;

// Add rate limiting with different cooldowns per endpoint
let lastFetchTime = {
  topMovers: 0,
  summaryStats: 0,
  optionsChain: 0
};

const FETCH_COOLDOWNS = {
  topMovers: 300000,    // 5 minutes
  summaryStats: 900000, // 15 minutes
  optionsChain: 300000  // 5 minutes
};

// Summary Stats Endpoint
router.get('/summary-stats', async (req, res) => {
  try {
    const currentMarketStatus = isMarketOpen();
    const cachedData = cache.get('summaryStats');
    
    if (cachedData && 
        (!currentMarketStatus || 
         Date.now() - lastFetchTime.summaryStats < FETCH_COOLDOWNS.summaryStats)) {
      console.log('Returning cached summary stats');
      return res.json(cachedData);
    }

    lastKnownMarketStatus = currentMarketStatus;
    lastFetchTime.summaryStats = Date.now();
    
    const symbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'MSFT', 'META', 'NVDA', 'AMD'];
    let totalVolume = 0;
    let totalCalls = 0;
    let totalPuts = 0;
    let mostActiveSymbol = { symbol: '', volume: 0 };

    // Process symbols in batches
    const batchSize = 2;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const options = await yahooFinance.options(symbol);
          const calls = options.options[0].calls;
          const puts = options.options[0].puts;
          
          const symbolVolume = [...calls, ...puts].reduce((acc, contract) => acc + (contract.volume || 0), 0);
          
          return {
            symbol,
            volume: symbolVolume,
            calls: calls.reduce((acc, call) => acc + (call.volume || 0), 0),
            puts: puts.reduce((acc, put) => acc + (put.volume || 0), 0)
          };
        } catch (error) {
          console.error(`Error fetching ${symbol} options:`, error);
          return { symbol, volume: 0, calls: 0, puts: 0 };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        totalVolume += result.volume;
        totalCalls += result.calls;
        totalPuts += result.puts;
        if (result.volume > mostActiveSymbol.volume) {
          mostActiveSymbol = { symbol: result.symbol, volume: result.volume };
        }
      });

      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const responseData = {
      totalVolume,
      putCallRatio: totalPuts / totalCalls,
      mostActive: mostActiveSymbol,
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString()
    };

    // Cache the results
    cache.set('summaryStats', responseData, currentMarketStatus);

    res.json(responseData);

  } catch (error) {
    console.error('Error calculating summary stats:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// Options Chain Endpoint
router.get('/chain/:symbol', async (req, res) => {
  try {
    const currentMarketStatus = isMarketOpen();
    const { symbol } = req.params;
    const cacheKey = `optionsChain_${symbol}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && 
        (!currentMarketStatus || 
         Date.now() - lastFetchTime.optionsChain < FETCH_COOLDOWNS.optionsChain)) {
      console.log(`Returning cached options chain for ${symbol}`);
      return res.json(cachedData);
    }

    lastKnownMarketStatus = currentMarketStatus;
    lastFetchTime.optionsChain = Date.now();
    
    const [options, quote] = await Promise.all([
      yahooFinance.options(symbol),
      yahooFinance.quote(symbol)
    ]);

    const responseData = {
      symbol,
      underlying: quote,
      expirations: options.expirationDates,
      calls: options.options[0].calls,
      puts: options.options[0].puts,
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString()
    };

    // Cache the results
    cache.set(cacheKey, responseData, currentMarketStatus);

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching options chain:', error);
    res.status(500).json({ error: 'Failed to fetch options chain' });
  }
});

// Get specific option details
router.get('/details/:symbol/:optionSymbol', async (req, res) => {
  try {
    const { symbol, optionSymbol } = req.params;
    const quote = await yahooFinance.quote(optionSymbol);
    res.json(quote);
  } catch (error) {
    console.error(`Error fetching option details for ${req.params.optionSymbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch option details' });
  }
});

// Get available expirations for a symbol
router.get('/expirations/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const options = await yahooFinance.options(symbol);
    const expirations = await yahooFinance.optionsExpirations(symbol);
    res.json(expirations);
  } catch (error) {
    console.error(`Error fetching expirations for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch expirations' });
  }
});

// Add more symbols to cast a wider net
const COMMON_OPTION_SYMBOLS = [
  // Major ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV', 'XLP', 'XLI',
  // Tech
  'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'TSLA', 'AMZN', 'NFLX',
  // Financial
  'GS', 'JPM', 'BAC', 'WFC', 'C', 'MS', 'V', 'MA',
  // Other Active
  'BA', 'DIS', 'COIN', 'GME', 'AMC', 'PLTR', 'UBER', 'ABNB',
  // VIX and Leveraged
  'UVXY', 'TQQQ', 'SQQQ', 'TLT', 'HYG', 'EEM'
];

async function processOptionsForSymbol(symbol) {
  try {
    const [options, quote] = await Promise.all([
      yahooFinance.options(symbol),
      yahooFinance.quote(symbol)
    ]);

    if (!options.options || !options.options[0]) return [];

    const allContracts = [...options.options[0].calls, ...options.options[0].puts];
    
    // Calculate the total value (premium * volume * 100) for each contract
    return allContracts
      .filter(contract => 
        contract.volume > 50 && // Minimum volume threshold
        contract.lastPrice > 0 && // Valid price
        contract.openInterest > 0 // Has open interest
      )
      .map(contract => {
        const totalValue = contract.lastPrice * contract.volume * 100;
        return {
          ticker: symbol,
          underlying_price: quote.regularMarketPrice,
          strike: contract.strike,
          expiration: new Date(contract.expiration).toLocaleDateString(),
          type: contract.contractSymbol.includes('C') ? 'CALL' : 'PUT',
          volume: contract.volume,
          openInterest: contract.openInterest || 0,
          price: contract.lastPrice,
          totalPremium: totalValue,
          action: contract.volume > (contract.openInterest || 0) ? 'BOUGHT' : 'SOLD',
          meta: {
            impliedVolatility: contract.impliedVolatility || 0,
            percentChange: contract.percentChange || 0,
            inTheMoney: contract.inTheMoney || false,
            volumeToOI: contract.openInterest ? (contract.volume / contract.openInterest) : 0,
            unusualVolume: contract.volume > (contract.openInterest * 0.1) // Flag if volume > 10% of OI
          }
        };
      });
  } catch (error) {
    console.error(`Error processing options for ${symbol}:`, error);
    return [];
  }
}

router.get('/top-movers', async (req, res) => {
  try {
    const currentMarketStatus = isMarketOpen();
    const cachedData = cache.get('topMovers');
    
    if (cachedData) {
      console.log('Returning cached top movers data');
      return res.json(cachedData);
    }

    console.log('Fetching fresh options data...');
    let allOptions = [];
    const batchSize = 5;

    // Process symbols in batches
    for (let i = 0; i < COMMON_OPTION_SYMBOLS.length; i += batchSize) {
      const batch = COMMON_OPTION_SYMBOLS.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(COMMON_OPTION_SYMBOLS.length/batchSize)}`);

      const batchResults = await Promise.all(batch.map(processOptionsForSymbol));
      const batchOptions = batchResults.flat();
      
      // Sort by total premium value and keep only the top ones from each batch
      const topFromBatch = batchOptions
        .sort((a, b) => b.totalPremium - a.totalPremium)
        .slice(0, 10);

      allOptions = [...allOptions, ...topFromBatch];

      // Add delay between batches
      if (i + batchSize < COMMON_OPTION_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final sort of all options by total premium value
    const topMovers = allOptions
      .sort((a, b) => b.totalPremium - a.totalPremium)
      .slice(0, 20);

    console.log(`Found ${topMovers.length} top options by value`);
    if (topMovers.length > 0) {
      console.log('Largest trade:', {
        ticker: topMovers[0].ticker,
        type: topMovers[0].type,
        value: `$${(topMovers[0].totalPremium/1000000).toFixed(2)}M`
      });
    }

    const responseData = {
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString(),
      data: topMovers
    };

    cache.set('topMovers', responseData, currentMarketStatus);
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching top movers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch top movers',
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString(),
      data: []
    });
  }
});

module.exports = router; 