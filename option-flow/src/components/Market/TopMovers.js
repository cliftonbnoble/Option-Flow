import { useState, useCallback, useEffect } from 'react';

function formatLargeNumber(value) {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function TopMovers() {
  const [topMovers, setTopMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const fetchTopMovers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/options/top-movers');
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        setError('Invalid data format received');
        return;
      }

      setTopMovers(data.data);
      setMarketStatus(data.marketStatus);
      setLastUpdate(data.lastUpdate);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopMovers();
    const interval = setInterval(fetchTopMovers, marketStatus ? 600000 : 1800000);
    return () => clearInterval(interval);
  }, [fetchTopMovers, marketStatus]);

  const scrollLeft = () => {
    const container = document.getElementById('movers-container');
    if (container) {
      const cardWidth = container.firstElementChild?.offsetWidth || 0;
      container.scrollBy({
        left: -cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('movers-container');
    if (container) {
      const cardWidth = container.firstElementChild?.offsetWidth || 0;
      container.scrollBy({
        left: cardWidth,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Top Options by Value</h2>
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
          <h2 className="text-xl font-bold">Top Options by Value</h2>
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
          <h2 className="text-xl font-bold">Top Options by Value</h2>
          <div className="flex space-x-2">
            <button
              onClick={scrollLeft}
              className="p-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={scrollRight}
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
          id="movers-container"
          className="flex gap-4 overflow-x-hidden scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {topMovers.map((mover, index) => (
            <div
              key={index}
              className="flex-none w-[280px] bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold">{mover.ticker}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    mover.type === 'CALL' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {mover.type}
                  </span>
                </div>
                <span className={`text-sm font-medium ${mover.action === 'BOUGHT' ? 'text-green-500' : 'text-red-500'}`}>
                  {mover.action}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {formatLargeNumber(mover.totalPremium)}
                </div>
                <div className="text-sm text-gray-400">
                  Strike ${mover.strike.toFixed(2)} • {mover.expiration}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Vol: {mover.volume.toLocaleString()}</span>
                  <span>Price: ${mover.price.toFixed(2)}</span>
                </div>
                {mover.meta && (
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>IV: {(mover.meta.impliedVolatility * 100).toFixed(0)}%</span>
                    <span className={mover.meta.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {mover.meta.percentChange >= 0 ? '+' : ''}{mover.meta.percentChange.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

if (!document.querySelector('#no-scrollbar-style')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'no-scrollbar-style';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default TopMovers;
