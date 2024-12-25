const axios = require('axios');

async function testLongDated() {
  try {
    console.log('Testing Long-Dated Options Endpoint...');
    const response = await axios.get('http://localhost:5001/api/options/long-dated');
    
    console.log('\nResponse:', response.data);
    
    if (response.data.data.length === 0) {
      console.log('No options found - check server logs for filtering details');
    } else {
      console.log('\nTop 5 Long-Dated Options:');
      response.data.data.slice(0, 5).forEach((opt, index) => {
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
    }

  } catch (error) {
    console.error('Error testing long-dated options:', error);
  }
}

testLongDated(); 