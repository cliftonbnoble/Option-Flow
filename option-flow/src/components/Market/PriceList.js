import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Home from './pages/Home';
import Market from './pages/Market';
import OptionsFlow from './pages/OptionsFlow';

function App() {
  return (
    <Router>
      <div className="flex bg-gray-900 text-white min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/market" element={<Market />} />
            <Route path="/options" element={<OptionsFlow />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
