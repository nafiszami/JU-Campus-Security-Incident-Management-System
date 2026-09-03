/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Only JPG, PNG, and PDF')) {
    return res.status(400).json({ error: err.message });
  }
  
  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry. Record already exists.' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = { errorHandler };