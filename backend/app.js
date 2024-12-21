const express = require('express');
const cors = require('cors');
const optionsRouter = require('./routes/options');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000', // Your React app's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use('/api/options', optionsRouter);

// ... rest of your server setup ... 