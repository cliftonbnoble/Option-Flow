import React from 'react';
import TopMovers from '../components/Market/TopMovers';
import LongDatedOptions from '../components/Market/LongDatedOptions';

function Market() {
  console.log('Rendering Market component'); // Debug log
  return (
    <div className="space-y-6">
      <TopMovers />
      <LongDatedOptions />
      {/* Other market components */}
    </div>
  );
}

export default Market;
