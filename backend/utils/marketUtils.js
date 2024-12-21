const isMarketOpen = () => {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();
  
  if (day === 0 || day === 6) return false;
  const marketOpen = hour >= 9 && (hour > 9 || minutes >= 30);
  const marketClose = hour < 16;
  
  return marketOpen && marketClose;
};

module.exports = { isMarketOpen }; 