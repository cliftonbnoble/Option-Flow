const yahooFinance = require('yahoo-finance2').default;

async function testYahooFinance() {
  try {
    // Test basic quote
    console.log('Testing basic quote...');
    const quote = await yahooFinance.quote('SPY');
    console.log('Quote successful:', quote.symbol, quote.regularMarketPrice);

    // Test options chain
    console.log('\nTesting options chain...');
    const options = await yahooFinance.options('SPY');
    console.log('Options chain successful:', 
      `Calls: ${options.options[0].calls.length}`,
      `Puts: ${options.options[0].puts.length}`
    );

    // Test multiple symbols
    console.log('\nTesting multiple symbols...');
    const symbols = ['SPY', 'QQQ', 'AAPL'];
    for (const symbol of symbols) {
      const result = await yahooFinance.quote(symbol);
      console.log(`${symbol}: $${result.regularMarketPrice}`);
    }

  } catch (error) {
    console.error('Error testing Yahoo Finance:', error);
  }
}

testYahooFinance(); 