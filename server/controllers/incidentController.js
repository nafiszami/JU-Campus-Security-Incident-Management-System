const { Incident, REPORT_TYPES, PRIORITIES } = require('../models/Incident');

/**
 * Controller to handle incident report submission
 * @route   POST /api/incidents
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const createIncident = async (req, res, next) => {
  try {
    const { reportType, title, description, location, priority } = req.body;
    const reportedBy = req.user && req.user.id;

    if (!reportedBy) {
      return res.status(401).json({ error: 'User authentication required.' });
    }

    if (!reportType || !title || !description || !location || !priority) {
      return res.status(400).json({
        error:
          'Missing required fields: reportType, title, description, location, and priority are required.',
      });
    }

    if (!REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        error: `Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`,
      });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}`,
      });
    }

    let evidencePath = null;
    if (req.file) {
      evidencePath = `uploads/${req.file.filename}`;
    }

    const incident = await Incident.create({
      reportedBy,
      reportType,
      title,
      description,
      location,
      priority,
      evidencePath,
    });

    return res.status(201).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createIncident,
  submitReport: createIncident,
};
