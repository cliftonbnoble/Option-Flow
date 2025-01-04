const app = require('./app');
const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Test endpoint: http://localhost:${port}/test`);
  console.log(`Screener endpoint: http://localhost:${port}/api/screener/screen`);
}); 