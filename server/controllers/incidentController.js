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

/**
 * Retrieve a paginated, filtered list of incident reports.
 *
 * Enforces role-based visibility:
 *  - Student           → own reports only (reported_by = req.user.id)
 *  - Security Officer  → assigned reports only (assigned_to = req.user.id)
 *    unless is_head_security_officer is TRUE, in which case all reports are visible
 *  - Admin             → all reports
 *
 * Accepts query params: status, priority, report_type, date_from, date_to,
 *                       sort_by, sort_order, page, limit
 *
 * @route   GET /api/incidents
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const getIncidents = async (req, res, next) => {
  try {
    const { role, id: userId, is_head_security_officer: isHeadOfficer } = req.user;

    const {
      status,
      priority,
      report_type: reportType,
      date_from: dateFrom,
      date_to: dateTo,
      sort_by: sortBy,
      sort_order: sortOrder,
    } = req.query;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Build role-based scope
    const filterOptions = {
      status,
      priority,
      reportType,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      limit,
    };

    if (role === 'Student') {
      filterOptions.reportedBy = userId;
    } else if (role === 'Security Officer' && !isHeadOfficer) {
      filterOptions.assignedTo = userId;
    }
    // Head Security Officer and Admin: no additional scope — sees all

    const result = await Incident.findAllWithFilters(filterOptions);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createIncident,
  submitReport: createIncident,
  getIncidents,
};
