const express = require('express');
const cors = require('cors');
const optionsRouter = require('./routes/options');

const app = express();
const port = process.env.PORT || 5001;

// More permissive CORS setup
app.use(cors());  // This allows all origins

// Add CORS headers explicitly as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.json());
app.use('/api/options', optionsRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 