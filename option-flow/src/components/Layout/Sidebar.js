import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

function Sidebar() {
  const location = useLocation();
  
  const navigation = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Market', path: '/market', icon: ChartBarIcon },
    { name: 'Options Flow', path: '/options', icon: ArrowTrendingUpIcon },
  ];

  return (
    <div className="w-64 bg-gray-800 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Option Flow</h1>
      </div>
      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar; 