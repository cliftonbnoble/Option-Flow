const axios = require('axios');

async function testTopMovers() {
  try {
    console.log('Testing Top Movers Endpoint...');
    const response = await axios.get('http://localhost:5000/api/options/top-movers');
    
    console.log('\nTop 5 Most Expensive Options Trades:');
    response.data.slice(0, 5).forEach((opt, index) => {
      console.log(`\n${index + 1}. ${opt.ticker} ${opt.type} ${opt.strike} ${opt.expiration}`);
      console.log(`   Action: ${opt.action}`);
      console.log(`   Volume: ${opt.volume.toLocaleString()} contracts`);
      console.log(`   Price: $${opt.price.toFixed(2)}`);
      console.log(`   Total Premium: $${(opt.totalPremium).toLocaleString()}`);
      console.log(`   Open Interest: ${opt.openInterest.toLocaleString()}`);
      console.log('\n   Additional Info:');
      console.log(`   - IV: ${(opt.meta.impliedVolatility * 100).toFixed(2)}%`);
      console.log(`   - Change: ${opt.meta.percentChange.toFixed(2)}%`);
      console.log(`   - ITM: ${opt.meta.inTheMoney ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('Error testing top movers:', error);
  }
}

testTopMovers(); 