const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const router = express.Router();
const cache = require('../utils/cache');
const { isMarketOpen } = require('../utils/marketUtils');
const COMMON_OPTION_SYMBOLS = require('../utils/symbols');

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

router.get('/long-dated', async (req, res) => {
  try {
    const currentMarketStatus = isMarketOpen();
    const cachedData = cache.get('longDatedOptions');
    
    if (cachedData) {
      console.log('Returning cached long-dated options data');
      return res.json(cachedData);
    }

    console.log('Fetching fresh long-dated options data...');
    let allOptions = [];
    const batchSize = 5;

    // Process symbols in batches
    for (let i = 0; i < COMMON_OPTION_SYMBOLS.length; i += batchSize) {
      const batch = COMMON_OPTION_SYMBOLS.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(COMMON_OPTION_SYMBOLS.length/batchSize)}`);
      console.log('Symbols in batch:', batch);

      const batchResults = await Promise.all(batch.map(async (symbol) => {
        try {
          console.log(`\nProcessing symbol: ${symbol}`);
          const options = await yahooFinance.options(symbol);
          
          if (!options || !options.options || !options.options[0]) {
            console.log(`No options data found for ${symbol}`);
            return [];
          }

          // Get first available expiration's calls and puts
          const firstExpCalls = options.options[0].calls || [];
          const firstExpPuts = options.options[0].puts || [];
          
          console.log(`${symbol} first expiration has ${firstExpCalls.length} calls and ${firstExpPuts.length} puts`);
          
          // Sample the first contract to verify data structure
          if (firstExpCalls.length > 0) {
            console.log(`Sample ${symbol} call:`, {
              strike: firstExpCalls[0].strike,
              volume: firstExpCalls[0].volume,
              expiration: new Date(firstExpCalls[0].expiration * 1000).toLocaleDateString()
            });
          }

          const currentDate = new Date();
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(currentDate.getMonth() + 6);

          // Get all expiration dates
          const expirationDates = options.options[0].expirationDates || [];
          console.log(`Found ${expirationDates.length} expiration dates for ${symbol}`);
          
          // Filter for dates within 6 months
          const validExpirations = expirationDates.filter(exp => {
            const expDate = new Date(exp * 1000);
            return expDate <= sixMonthsFromNow && expDate > currentDate;
          });
          
          console.log(`${validExpirations.length} expirations within 6 months for ${symbol}`);
          console.log('Valid expiration dates:', validExpirations.map(exp => new Date(exp * 1000).toLocaleDateString()));

          // Fetch options for each valid expiration date
          const allContracts = await Promise.all(
            validExpirations.map(async (expiration) => {
              try {
                const chainData = await yahooFinance.options(symbol, { expiration });
                if (!chainData || !chainData.options || !chainData.options[0]) return [];
                
                const contracts = [...chainData.options[0].calls, ...chainData.options[0].puts];
                const activeContracts = contracts.filter(contract => {
                  // Lower the volume threshold and log the values
                  const hasVolume = contract.volume > 10; // Reduced from 50 to 10
                  if (contract.volume > 0) {
                    console.log(`${symbol} contract: Strike=${contract.strike}, Volume=${contract.volume}, Exp=${new Date(contract.expiration * 1000).toLocaleDateString()}`);
                  }
                  return hasVolume;
                });
                
                console.log(`Found ${activeContracts.length} active contracts out of ${contracts.length} total for ${symbol} exp ${new Date(expiration * 1000).toLocaleDateString()}`);
                return activeContracts;
              } catch (err) {
                console.error(`Error fetching chain for ${symbol} exp ${expiration}:`, err);
                return [];
              }
            })
          );

          // Flatten and process contracts
          const flattenedContracts = allContracts.flat();
          console.log(`Total active contracts for ${symbol}: ${flattenedContracts.length}`);
          
          return flattenedContracts.map(contract => ({
            ticker: symbol,
            strike: contract.strike,
            expiration: new Date(contract.expiration * 1000).toLocaleDateString(),
            type: contract.contractSymbol.includes('C') ? 'CALL' : 'PUT',
            volume: contract.volume,
            openInterest: contract.openInterest || 0,
            price: contract.lastPrice,
            totalPremium: contract.lastPrice * contract.volume * 100,
            action: contract.volume > (contract.openInterest || 0) ? 'BOUGHT' : 'SOLD',
            meta: {
              impliedVolatility: contract.impliedVolatility || 0,
              percentChange: contract.percentChange || 0,
              inTheMoney: contract.inTheMoney || false
            }
          }));

        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          return [];
        }
      }));

      const batchOptions = batchResults.flat();
      console.log(`Batch yielded ${batchOptions.length} total options`);
      
      if (batchOptions.length > 0) {
        console.log('Sample option from batch:', batchOptions[0]);
      }

      // Sort by total premium value and keep only the top ones from each batch
      const topFromBatch = batchOptions
        .sort((a, b) => b.totalPremium - a.totalPremium)
        .slice(0, 10);

      allOptions = [...allOptions, ...topFromBatch];
      console.log(`Running total of options: ${allOptions.length}`);

      // Add delay between batches
      if (i + batchSize < COMMON_OPTION_SYMBOLS.length) {
        console.log('Adding delay between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final sort of all options by total premium value
    const longDatedOptions = allOptions
      .sort((a, b) => b.totalPremium - a.totalPremium)
      .slice(0, 20);

    console.log(`Final results: ${longDatedOptions.length} long-dated options`);
    if (longDatedOptions.length > 0) {
      console.log('Top 3 trades:', longDatedOptions.slice(0, 3).map(opt => ({
        ticker: opt.ticker,
        type: opt.type,
        strike: opt.strike,
        expiration: opt.expiration,
        volume: opt.volume,
        value: `$${(opt.totalPremium/1000000).toFixed(2)}M`
      })));
    } else {
      console.log('No trades met the criteria');
    }

    const responseData = {
      data: longDatedOptions,
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString()
    };

    // Cache the results
    cache.set('longDatedOptions', responseData, currentMarketStatus);

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching long-dated options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch long-dated options data',
      marketStatus: currentMarketStatus,
      lastUpdate: new Date().toISOString(),
      data: []
    });
  }
});

module.exports = router; 