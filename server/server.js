const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Test database connection
async function startServer() {
  try {
    await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();