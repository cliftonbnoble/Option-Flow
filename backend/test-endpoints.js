const yahooFinance = require('yahoo-finance2').default;

async function testOptionsEndpoints() {
  try {
    console.log('\n1. Testing SPY Options Activity:');
    const spyOptions = await yahooFinance.options('SPY');
    
    // Analyze Calls
    console.log('\nCALL Options Analysis:');
    const sampleCall = spyOptions.options[0].calls[0];
    console.log({
      type: 'CALL',
      strike: sampleCall.strike,
      contractSymbol: sampleCall.contractSymbol,
      lastPrice: sampleCall.lastPrice,
      volume: sampleCall.volume,
      openInterest: sampleCall.openInterest,
      impliedVolatility: sampleCall.impliedVolatility,
      // Buying pressure indicator
      volumeToOI: sampleCall.volume / sampleCall.openInterest,
      inTheMoney: sampleCall.inTheMoney
    });

    // Analyze Puts
    console.log('\nPUT Options Analysis:');
    const samplePut = spyOptions.options[0].puts[0];
    console.log({
      type: 'PUT',
      strike: samplePut.strike,
      contractSymbol: samplePut.contractSymbol,
      lastPrice: samplePut.lastPrice,
      volume: samplePut.volume,
      openInterest: samplePut.openInterest,
      impliedVolatility: samplePut.impliedVolatility,
      // Buying pressure indicator
      volumeToOI: samplePut.volume / samplePut.openInterest,
      inTheMoney: samplePut.inTheMoney
    });

    // Find unusual activity
    console.log('\nUnusual Options Activity:');
    const allOptions = [...spyOptions.options[0].calls, ...spyOptions.options[0].puts];
    const unusualActivity = allOptions
      .filter(opt => opt.volume > opt.openInterest * 0.1) // Volume > 10% of OI
      .map(opt => ({
        type: opt.contractSymbol.includes('C') ? 'CALL' : 'PUT',
        strike: opt.strike,
        volume: opt.volume,
        openInterest: opt.openInterest,
        volumeToOI: opt.volume / opt.openInterest,
        potentialBuyingSelling: opt.volume > opt.openInterest ? 'Heavy Buying' : 'Normal Activity'
      }))
      .sort((a, b) => b.volumeToOI - a.volumeToOI)
      .slice(0, 5);

    console.log('Top 5 Unusual Activity:', unusualActivity);

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testOptionsEndpoints(); 