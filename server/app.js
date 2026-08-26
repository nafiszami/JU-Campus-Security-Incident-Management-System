const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
// const incidentRoutes = require('./routes/incidentRoutes'); // TODO: uncomment when Member 1 finishes
// const visitorRoutes = require('./routes/visitorRoutes'); // TODO: uncomment when Member 3 finishes
// const restrictedRoutes = require('./routes/restrictedRoutes'); // TODO: uncomment when Member 4 finishes
// const scheduleRoutes = require('./routes/scheduleRoutes'); // TODO: uncomment when Member 5 finishes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/incidents', incidentRoutes);
// app.use('/api/visitors', visitorRoutes);
// app.use('/api/restricted', restrictedRoutes);
// app.use('/api/schedules', scheduleRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;