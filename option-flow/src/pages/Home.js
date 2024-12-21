import TopMovers from '../components/Market/TopMovers';
import SummaryStats from '../components/Market/SummaryStats';

function Home() {
  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            View Options Chain
          </button>
        </div>
      </div>

      {/* Top Movers Section */}
      <div className="mb-8 overflow-hidden">
        <TopMovers />
      </div>

      {/* Summary Stats */}
      <div className="mb-8">
        <SummaryStats />
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-500/20 text-blue-500 rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Large SPY Put Buy</div>
                  <div className="text-sm text-gray-400">2 minutes ago</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">1,000 contracts</div>
                <div className="text-sm text-gray-400">$450 Strike</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
