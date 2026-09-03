require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const restrictedRoutes = require('./routes/restrictedRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/restricted', restrictedRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/assignments', assignmentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;