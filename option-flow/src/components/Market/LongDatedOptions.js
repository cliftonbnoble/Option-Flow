import React, { useState, useCallback, useEffect } from 'react';

const formatLargeNumber = (value) => {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const LongDatedOptions = () => {
  const [longDatedOptions, setLongDatedOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const fetchLongDatedOptions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching long dated options...');
      const response = await fetch('http://localhost:5001/api/options/long-dated');
      const data = await response.json();
      console.log('Received data:', data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid data format:', data);
        setError('Invalid data format received');
        return;
      }

      setLongDatedOptions(data.data);
      setMarketStatus(data.marketStatus);
      setLastUpdate(data.lastUpdate);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLongDatedOptions();
    const interval = setInterval(fetchLongDatedOptions, marketStatus ? 600000 : 1800000);
    return () => clearInterval(interval);
  }, [fetchLongDatedOptions, marketStatus]);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Long-Dated Options (6 Months)</h2>
        </div>
        <div className="relative overflow-hidden">
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-none w-[280px] bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Long-Dated Options (6 Months)</h2>
        </div>
        <div className="bg-red-900/20 border border-red-900/10 rounded-lg p-4 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold">Long-Dated Options (6 Months)</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const container = document.getElementById('long-dated-container');
                if (container) {
                  const cardWidth = container.firstElementChild?.offsetWidth || 0;
                  container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
                }
              }}
              className="p-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                const container = document.getElementById('long-dated-container');
                if (container) {
                  const cardWidth = container.firstElementChild?.offsetWidth || 0;
                  container.scrollBy({ left: cardWidth, behavior: 'smooth' });
                }
              }}
              className="p-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        {lastUpdate && (
          <span className="text-sm text-gray-400">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="relative overflow-hidden">
        <div
          id="long-dated-container"
          className="flex gap-4 overflow-x-hidden scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {longDatedOptions.length === 0 ? (
            <div className="w-full text-center py-8 text-gray-400">
              No long-dated options found
            </div>
          ) : (
            longDatedOptions.map((option, index) => (
              <div
                key={index}
                className="flex-none w-[280px] bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold">{option.ticker}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      option.type === 'CALL' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {option.type}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${option.action === 'BOUGHT' ? 'text-green-500' : 'text-red-500'}`}>
                    {option.action}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(option.totalPremium / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-sm text-gray-400">
                    Strike ${option.strike.toFixed(2)} • {option.expiration}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Vol: {option.volume.toLocaleString()}</span>
                    <span>Price: ${option.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LongDatedOptions; 