import { useState, useEffect } from 'react';
import { FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

function OptionsFlow() {
  const [optionsFlow, setOptionsFlow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'calls', 'puts'
    action: 'all', // 'all', 'bought', 'sold'
    minVolume: 0,
  });

  const fetchOptionsFlow = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/options/top-movers');
      const data = await response.json();
      setOptionsFlow(data.data || []);
      setMarketStatus(data.marketStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching options flow:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionsFlow();
    // Poll every 10 minutes during market hours, 30 minutes otherwise
    const interval = setInterval(fetchOptionsFlow, marketStatus ? 600000 : 1800000);
    return () => clearInterval(interval);
  }, [marketStatus]);

  const filteredFlow = optionsFlow.filter(option => {
    if (filters.type !== 'all' && option.type.toLowerCase() !== filters.type) return false;
    if (filters.action !== 'all' && option.action.toLowerCase() !== filters.action) return false;
    if (option.volume < filters.minVolume) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Options Flow</h1>
        <button 
          onClick={fetchOptionsFlow}
          className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          <ArrowPathIcon className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400">Filters</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <select 
            className="bg-gray-900 rounded-lg px-4 py-2"
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All Types</option>
            <option value="calls">Calls Only</option>
            <option value="puts">Puts Only</option>
          </select>
          <select 
            className="bg-gray-900 rounded-lg px-4 py-2"
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          >
            <option value="all">All Actions</option>
            <option value="bought">Bought</option>
            <option value="sold">Sold</option>
          </select>
          <input 
            type="number"
            placeholder="Min Volume"
            className="bg-gray-900 rounded-lg px-4 py-2"
            value={filters.minVolume}
            onChange={(e) => setFilters(prev => ({ ...prev, minVolume: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Options Flow Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-4">Time</th>
              <th className="text-left">Ticker</th>
              <th className="text-right">Strike</th>
              <th className="text-right">Expiry</th>
              <th className="text-center">Type</th>
              <th className="text-right">Premium</th>
              <th className="text-right">Volume</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-8">Loading...</td>
              </tr>
            ) : filteredFlow.map((option, index) => (
              <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/50">
                <td className="p-4 text-gray-400">
                  {new Date().toLocaleTimeString()}
                </td>
                <td className="font-medium">{option.ticker}</td>
                <td className="text-right">${option.strike}</td>
                <td className="text-right">{option.expiration}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded ${
                    option.type === 'CALL' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {option.type}
                  </span>
                </td>
                <td className="text-right">${(option.totalPremium / 1000).toFixed(1)}K</td>
                <td className="text-right">{option.volume.toLocaleString()}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded ${
                    option.action === 'BOUGHT' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {option.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OptionsFlow;
