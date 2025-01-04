const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;
const cache = require('../utils/cache');
const { isMarketOpen } = require('../utils/marketUtils');
const COMMON_OPTION_SYMBOLS = require('../utils/symbols');

// GET endpoint with detailed logging
router.get('/screen', async (req, res) => {
  console.log('Received GET request for screener');
  
  try {
    // Parse and log query parameters
    const params = {
      symbols: req.query.symbols ? req.query.symbols.split(',') : ['SPY', 'QQQ'],
      minVolume: parseInt(req.query.minVolume) || 50,
      optionType: req.query.optionType || 'all',
      daysToExpiration: {
        min: parseInt(req.query.minDays) || 0,
        max: parseInt(req.query.maxDays) || 30
      }
    };
    
    console.log('Processing with parameters:', params);

    let allOptions = [];
    const currentDate = new Date();

    // Process each symbol
    for (const symbol of params.symbols) {
      console.log(`\nProcessing symbol: ${symbol}`);
      
      try {
        // Fetch options chain
        console.log(`Fetching options data for ${symbol}...`);
        const options = await yahooFinance.options(symbol);
        
        if (!options || !options.options || !options.options[0]) {
          console.log(`No options data available for ${symbol}`);
          continue;
        }

        console.log(`Found ${options.options[0].calls.length} calls and ${options.options[0].puts.length} puts for ${symbol}`);

        // Fetch current stock price
        const quote = await yahooFinance.quote(symbol);
        const stockPrice = quote.regularMarketPrice;
        console.log(`Current stock price for ${symbol}: $${stockPrice}`);

        // Process contracts
        let validContracts = [];
        const contracts = [];

        if (params.optionType !== 'puts') {
          contracts.push(...options.options[0].calls);
        }
        if (params.optionType !== 'calls') {
          contracts.push(...options.options[0].puts);
        }

        // Filter and map contracts
        validContracts = contracts
          .filter(contract => {
            const volume = contract.volume || 0;
            const meetsVolumeReq = volume >= params.minVolume;
            
            if (meetsVolumeReq) {
              console.log(`Found valid contract: ${contract.contractSymbol} with volume ${volume}`);
            }
            
            return meetsVolumeReq;
          })
          .map(contract => ({
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
            percentageChange: contract.percentChange
          }));

        console.log(`Found ${validContracts.length} valid contracts for ${symbol}`);
        allOptions = [...allOptions, ...validContracts];

      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }

      // Add small delay between symbols
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Prepare response
    const responseData = {
      count: allOptions.length,
      results: allOptions,
      timestamp: new Date().toISOString(),
      marketStatus: isMarketOpen()
    };

    console.log(`\nScreening completed. Found ${responseData.count} total options`);
    
    // Send response
    res.json(responseData);

  } catch (error) {
    console.error('Screener error:', error);
    res.status(500).json({ 
      error: 'Failed to screen options',
      details: error.message
    });
  }
});

// Long-dated large options endpoint with fixed date handling
router.get('/long-dated-large', async (req, res) => {
  console.log('\nFetching long-dated large options transactions...');
  
  try {
    const cacheKey = 'long_dated_large';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('Returning cached long-dated large options data');
      return res.json(cachedData);
    }

    const currentDate = new Date();
    const sixMonthsFromNow = new Date();
    const oneYearFromNow = new Date();
    sixMonthsFromNow.setMonth(currentDate.getMonth() + 6);
    oneYearFromNow.setMonth(currentDate.getMonth() + 12);

    console.log('Date ranges:');
    console.log('Current:', currentDate.toISOString());
    console.log('6 months out:', sixMonthsFromNow.toISOString());
    console.log('1 year out:', oneYearFromNow.toISOString());

    let allLargeTrades = [];

    // Use a smaller set of liquid symbols for testing
    const testSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA'];
    console.log('\nProcessing symbols:', testSymbols);

    for (const symbol of testSymbols) {
      try {
        console.log(`\nFetching data for ${symbol}...`);
        const options = await yahooFinance.options(symbol);
        
        if (!options || !options.options || !options.options[0]) {
          console.log(`No options data available for ${symbol}`);
          continue;
        }

        // Get current stock price
        const quote = await yahooFinance.quote(symbol);
        const stockPrice = quote.regularMarketPrice;
        console.log(`Current stock price for ${symbol}: $${stockPrice}`);

        let validTrades = [];

        // Process each expiration date
        for (const expDate of options.expirationDates) {
            // Convert timestamp to Date object
            const expirationDate = new Date(expDate * 1000);
            
            // Log the actual date being processed
            console.log(`\nChecking expiration: ${expirationDate.toISOString()}`);
            
            // Check if expiration is within our target range
            if (expirationDate >= sixMonthsFromNow && expirationDate <= oneYearFromNow) {
                console.log(`Processing ${symbol} expiration: ${expirationDate.toISOString()} (in range)`);
                
                const chain = await yahooFinance.options(symbol, { expiration: expDate });
                if (!chain || !chain.options || !chain.options[0]) {
                    console.log('No chain data available for this expiration');
                    continue;
                }

                const calls = chain.options[0].calls || [];
                const puts = chain.options[0].puts || [];
                console.log(`Found ${calls.length} calls and ${puts.length} puts`);

                const allContracts = [...calls, ...puts];
                
                // Log contract details before filtering
                allContracts.forEach(contract => {
                    if (contract.volume > 0) {
                        console.log(`Contract: ${contract.contractSymbol}`, {
                            strike: contract.strike,
                            volume: contract.volume,
                            lastPrice: contract.lastPrice,
                            totalValue: contract.lastPrice * contract.volume * 100
                        });
                    }
                });

                const trades = allContracts
                    .filter(contract => {
                        const volume = contract.volume || 0;
                        const price = contract.lastPrice || 0;
                        const totalValue = volume * price * 100;
                        
                        // Reduced thresholds for testing
                        return volume >= 5 && // Minimum 5 contracts
                               price > 0 &&   // Must have a price
                               totalValue >= 10000; // Minimum $10,000 total value
                    })
                    .map(contract => {
                        const totalValue = contract.lastPrice * contract.volume * 100;
                        return {
                            symbol,
                            contractSymbol: contract.contractSymbol,
                            type: contract.contractSymbol.includes('C') ? 'CALL' : 'PUT',
                            strike: contract.strike,
                            expiration: expirationDate.toISOString().split('T')[0],
                            daysToExpiration: Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24)),
                            lastPrice: contract.lastPrice,
                            volume: contract.volume,
                            openInterest: contract.openInterest || 0,
                            totalValue,
                            impliedVolatility: contract.impliedVolatility,
                            stockPrice,
                            inTheMoney: contract.inTheMoney,
                            percentageChange: contract.percentChange,
                            action: contract.volume > (contract.openInterest || 0) ? 'BOUGHT' : 'SOLD',
                            distanceFromPrice: ((Math.abs(contract.strike - stockPrice) / stockPrice) * 100).toFixed(2) + '%'
                        };
                    });

                if (trades.length > 0) {
                    console.log(`Found ${trades.length} qualifying trades for this expiration`);
                    trades.forEach(trade => {
                        console.log(`Qualifying trade:`, {
                            symbol: trade.symbol,
                            type: trade.type,
                            strike: trade.strike,
                            volume: trade.volume,
                            value: `$${(trade.totalValue / 1000).toFixed(2)}K`
                        });
                    });
                }

                validTrades = [...validTrades, ...trades];
            } else {
                console.log(`Expiration ${expirationDate.toISOString()} outside target range`);
            }
        }

        console.log(`Total valid trades for ${symbol}: ${validTrades.length}`);
        allLargeTrades = [...allLargeTrades, ...validTrades];

        // Add small delay between symbols
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
    }

    // Sort by total value and get top 20
    const topTrades = allLargeTrades
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 20);

    console.log(`\nFound ${topTrades.length} large long-dated trades`);
    if (topTrades.length > 0) {
      console.log('Top trades:');
      topTrades.forEach(trade => {
        console.log({
          symbol: trade.symbol,
          type: trade.type,
          strike: trade.strike,
          expiration: trade.expiration,
          volume: trade.volume,
          value: `$${(trade.totalValue / 1000).toFixed(2)}K`
        });
      });
    }

    const responseData = {
      count: topTrades.length,
      totalValue: topTrades.reduce((sum, trade) => sum + trade.totalValue, 0),
      marketStatus: isMarketOpen(),
      lastUpdate: new Date().toISOString(),
      data: topTrades.map(trade => ({
        ...trade,
        totalValue: `$${(trade.totalValue / 1000).toFixed(2)}K`,
        notional: `$${((trade.strike * trade.volume * 100) / 1000).toFixed(2)}K`
      }))
    };

    // Cache the results
    cache.set(cacheKey, responseData, isMarketOpen());

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching long-dated large options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch long-dated large options',
      details: error.message 
    });
  }
});

module.exports = router; 