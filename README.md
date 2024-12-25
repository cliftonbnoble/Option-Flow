# Option Flow Monitor

A real-time options flow monitoring application built with React and Node.js. This application tracks and displays options trading activity, including top movers, long-dated options, and market statistics.

## Features

- Real-time options flow monitoring
- Top options movers by value
- Long-dated options tracking
- Market summary statistics
- Put/Call ratio monitoring
- Responsive design with Tailwind CSS
- Automatic market hours detection
- Smart caching system

## Tech Stack

### Frontend
- React
- React Router
- Tailwind CSS
- Heroicons
- Recharts

### Backend
- Node.js
- Express
- Yahoo Finance API
- Node Cache
- Cors
- Rate Limiting

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

bash
git clone <repository-url>
cd option-flow


2. Install backend dependencies:

bash
cd backend
npm install


3. Install frontend dependencies:

bash
cd ../option-flow
npm install


## Configuration

The backend server runs on port 5001 by default, and the frontend development server runs on port 3000.

### Backend Configuration
The backend uses environment variables for configuration. Create a `.env` file in the `backend` directory:

env
PORT=5001
NODE_ENV=development


## Running the Application

1. Start the backend server:

bash
cd backend
npm run dev


2. Start the frontend development server:

bash
cd option-flow
npm start


The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## API Endpoints

The backend provides several API endpoints:

- `GET /api/options/summary-stats` - Get market summary statistics
- `GET /api/options/top-movers` - Get top options by value
- `GET /api/options/long-dated` - Get long-dated options activity
- `GET /api/options/chain/:symbol` - Get options chain for a specific symbol

## Development

The application uses a development proxy to forward API requests to the backend server. This is configured in the frontend's package.json.

### Testing

To run the backend tests:

bash
cd backend
npm test


To run the frontend tests:

bash
cd option-flow
npm test


## Caching

The application implements a smart caching system that:
- Caches data differently during market hours vs. off-hours
- Automatically invalidates cache based on market conditions
- Implements different cache durations for different types of data

## Market Hours

The application automatically detects market hours (9:30 AM - 4:00 PM ET, Monday-Friday) and adjusts its behavior accordingly:
- More frequent updates during market hours
- Extended cache duration during off-hours
- Different polling intervals based on market status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.
