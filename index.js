const express = require('express');
const cors = require('cors');
const app = express();
const { inject } = require("@vercel/analytics");
const path = require('path');
require('dotenv').config();

// Import routes
const originalRoute = require("./src/router/route");
const dbRoute = require("./src/router/db.router");

// Import database and scheduler
const { testConnection } = require('./src/config/database');
const scheduler = require('./src/services/schedular');

// Initialize analytics
inject();

// Middleware
app.use(cors());
app.use(express.json());

// Use routes
app.use(dbRoute); // New database-backed routes
app.use(originalRoute); // Original routes for backward compatibility

// Set up a static folder for documentation
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Root route redirect to documentation if available
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Get port from environment variables or use default
const port = process.env.PORT || 8000;

// Start the server
const server = app.listen(port, async () => {
  try {
    console.log(`Server running on http://localhost:${port}`);
    
    // Test database connection
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      // Initialize the scheduler if auto-scraping is enabled
      if (process.env.ENABLE_AUTO_SCRAPE === 'true') {
        await scheduler.init();
        console.log('Auto-scraping scheduler initialized');
      } else {
        console.log('Auto-scraping is disabled');
      }
    } else {
      console.error('Server started, but database connection failed.');
    }
  } catch (error) {
    console.error('Error starting server:', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing server and stopping scheduler.');
  scheduler.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing server and stopping scheduler.');
  scheduler.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});