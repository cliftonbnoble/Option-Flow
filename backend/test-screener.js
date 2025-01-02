const axios = require('axios');

async function testScreener() {
  try {
    console.log('\nTesting Options Screener API...');
    
    // Test Case 1: Basic Screening
    console.log('\n1. Testing basic screening with default parameters...');
    const basicResponse = await axios.post('http://localhost:5001/api/screener/screen', {
      symbols: ['SPY', 'AAPL'], // Limiting to 2 symbols for faster testing
      minVolume: 100,
      minOpenInterest: 50
    });
    
    console.log(`Found ${basicResponse.data.count} options matching basic criteria`);
    if (basicResponse.data.results.length > 0) {
      console.log('Sample result:', basicResponse.data.results[0]);
    }

    // Test Case 2: ITM Calls Only
    console.log('\n2. Testing ITM calls screening...');
    const itmCallsResponse = await axios.post('http://localhost:5001/api/screener/screen', {
      symbols: ['SPY'],
      optionType: 'calls',
      inTheMoney: 'itm',
      minVolume: 50
    });
    
    console.log(`Found ${itmCallsResponse.data.count} ITM calls`);
    if (itmCallsResponse.data.results.length > 0) {
      const sampleCall = itmCallsResponse.data.results[0];
      console.log('Sample ITM call:', {
        symbol: sampleCall.symbol,
        strike: sampleCall.strike,
        stockPrice: sampleCall.stockPrice,
        volume: sampleCall.volume,
        impliedVolatility: sampleCall.impliedVolatility
      });
    }

    // Test Case 3: Near-term OTM Puts
    console.log('\n3. Testing near-term OTM puts screening...');
    const otmPutsResponse = await axios.post('http://localhost:5001/api/screener/screen', {
      symbols: ['SPY'],
      optionType: 'puts',
      inTheMoney: 'otm',
      daysToExpiration: {
        min: 1,
        max: 30
      },
      minVolume: 50
    });
    
    console.log(`Found ${otmPutsResponse.data.count} near-term OTM puts`);
    if (otmPutsResponse.data.results.length > 0) {
      const samplePut = otmPutsResponse.data.results[0];
      console.log('Sample OTM put:', {
        symbol: samplePut.symbol,
        strike: samplePut.strike,
        daysToExpiration: samplePut.daysToExpiration,
        volume: samplePut.volume,
        impliedVolatility: samplePut.impliedVolatility
      });
    }

    // Test Case 4: High IV Options
    console.log('\n4. Testing high IV options screening...');
    const highIVResponse = await axios.post('http://localhost:5001/api/screener/screen', {
      symbols: ['AAPL'],
      minIV: 0.5, // 50% IV
      minVolume: 10
    });
    
    console.log(`Found ${highIVResponse.data.count} high IV options`);
    if (highIVResponse.data.results.length > 0) {
      console.log('High IV options found:', highIVResponse.data.results
        .slice(0, 3)
        .map(opt => ({
          symbol: opt.symbol,
          type: opt.type,
          strike: opt.strike,
          iv: (opt.impliedVolatility * 100).toFixed(1) + '%',
          volume: opt.volume
        }))
      );
    }

  } catch (error) {
    console.error('Error testing screener:', error.response?.data || error.message);
  }
}

// Run the tests
testScreener(); 