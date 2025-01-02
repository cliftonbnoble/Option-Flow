const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;
const cache = require('../utils/cache');
const { isMarketOpen } = require('../utils/marketUtils');
const COMMON_OPTION_SYMBOLS = require('../utils/symbols');

// Screener endpoint with filtering capabilities
router.post('/screen', async (req, res) => {
  try {
    const {
      minVolume = 10,
      minOpenInterest = 10,
      minIV = 0,
      maxIV = 500,
      minDelta = -1,
      maxDelta = 1,
      minPrice = 0,
      maxPrice = 100000,
      daysToExpiration = { min: 0, max: 365 },
      optionType = 'all', // 'all', 'calls', 'puts'
      inTheMoney = 'all', // 'all', 'itm', 'otm'
      symbols = COMMON_OPTION_SYMBOLS.slice(0, 5) // Default to first 5 symbols
    } = req.body;

    const cacheKey = `screener_${JSON.stringify(req.body)}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    let allOptions = [];
    const currentDate = new Date();

    // Process symbols in batches
    const batchSize = 2;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const options = await yahooFinance.options(symbol);
          const quote = await yahooFinance.quote(symbol);
          const stockPrice = quote.regularMarketPrice;

          let validContracts = [];

          for (const expDate of options.expirationDates) {
            const expirationDate = new Date(expDate * 1000);
            const daysUntilExp = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));

            if (daysUntilExp < daysToExpiration.min || daysUntilExp > daysToExpiration.max) {
              continue;
            }

            const chain = await yahooFinance.options(symbol, { expiration: expDate });
            const contracts = [];

            if (optionType !== 'puts') {
              contracts.push(...chain.options[0].calls);
            }
            if (optionType !== 'calls') {
              contracts.push(...chain.options[0].puts);
            }

            validContracts.push(...contracts.filter(contract => {
              const isCall = contract.contractSymbol.includes('C');
              const isITM = isCall ? 
                (stockPrice > contract.strike) : 
                (stockPrice < contract.strike);

              if (inTheMoney !== 'all') {
                if (inTheMoney === 'itm' && !isITM) return false;
                if (inTheMoney === 'otm' && isITM) return false;
              }

              return (
                contract.volume >= minVolume &&
                (contract.openInterest || 0) >= minOpenInterest &&
                contract.impliedVolatility >= minIV &&
                contract.impliedVolatility <= maxIV &&
                contract.lastPrice >= minPrice &&
                contract.lastPrice <= maxPrice
                // Add delta check when available
              );
            }));
          }

          return validContracts.map(contract => ({
            symbol,
            contractSymbol: contract.contractSymbol,
            strike: contract.strike,
            expiration: new Date(contract.expiration * 1000).toLocaleDateString(),
            type: contract.contractSymbol.includes('C') ? 'CALL' : 'PUT',
            lastPrice: contract.lastPrice,
            bid: contract.bid,
            ask: contract.ask,
            volume: contract.volume,
            openInterest: contract.openInterest || 0,
            impliedVolatility: contract.impliedVolatility,
            inTheMoney: contract.inTheMoney,
            stockPrice,
            percentageChange: contract.percentChange,
            daysToExpiration: Math.ceil((new Date(contract.expiration * 1000) - currentDate) / (1000 * 60 * 60 * 24))
          }));

        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allOptions = [...allOptions, ...batchResults.flat()];

      // Add delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const responseData = {
      count: allOptions.length,
      results: allOptions,
      timestamp: new Date().toISOString(),
      marketStatus: isMarketOpen()
    };

    // Cache the results
    cache.set(cacheKey, responseData, isMarketOpen());

    res.json(responseData);

  } catch (error) {
    console.error('Screener error:', error);
    res.status(500).json({ error: 'Failed to screen options' });
  }
});

module.exports = router; 