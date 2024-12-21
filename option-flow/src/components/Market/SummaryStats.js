import { useState, useEffect, useCallback } from 'react';

function SummaryStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousStats, setPreviousStats] = useState(null);
  const [marketStatus, setMarketStatus] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/options/summary-stats');
      const data = await response.json();
      
      // Store previous stats for comparison
      setPreviousStats(stats);
      setStats(data);
      setMarketStatus(data.marketStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    fetchStats();
    // Poll every 10 minutes during market hours, 30 minutes otherwise
    const interval = setInterval(fetchStats, marketStatus ? 600000 : 1800000);
    return () => clearInterval(interval);
  }, [fetchStats, marketStatus]);

  const calculateChange = (current, previous, isRatio = false) => {
    if (!previous) return null;
    const change = isRatio 
      ? current - previous 
      : ((current - previous) / previous) * 100;
    return change;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-gray-400 mb-2">Total Volume</h3>
        <div className="text-2xl font-bold">
          {stats?.totalVolume?.toLocaleString()} contracts
        </div>
        {previousStats && (
          <div className={`text-sm ${
            calculateChange(stats?.totalVolume, previousStats?.totalVolume) > 0 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {calculateChange(stats?.totalVolume, previousStats?.totalVolume) > 0 ? '+' : ''}
            {calculateChange(stats?.totalVolume, previousStats?.totalVolume)?.toFixed(1)}% from last update
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-gray-400 mb-2">Put/Call Ratio</h3>
        <div className="text-2xl font-bold">{stats?.putCallRatio}</div>
        {previousStats && (
          <div className={`text-sm ${
            calculateChange(parseFloat(stats?.putCallRatio), parseFloat(previousStats?.putCallRatio), true) < 0 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {calculateChange(parseFloat(stats?.putCallRatio), parseFloat(previousStats?.putCallRatio), true) > 0 ? '+' : ''}
            {calculateChange(parseFloat(stats?.putCallRatio), parseFloat(previousStats?.putCallRatio), true)?.toFixed(2)} from last update
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-gray-400 mb-2">Most Active</h3>
        <div className="text-2xl font-bold">{stats?.mostActive?.symbol}</div>
        <div className="text-gray-400 text-sm">
          {stats?.mostActive?.volume?.toLocaleString()} contracts
        </div>
      </div>
    </div>
  );
}

export default SummaryStats; 