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

/**
 * Retrieve full details of a specific incident report with RBAC.
 *
 * RBAC Rules:
 *  - Student: only allowed if reported_by === req.user.id
 *  - Security Officer: only allowed if assigned_to === req.user.id (or is_head_security_officer === true)
 *  - Head Security Officer / Admin: allowed for all reports
 *  - Other roles: 403 Forbidden
 *
 * @route   GET /api/incidents/:id
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId, is_head_security_officer: isHeadOfficer } = req.user;

    const incidentId = parseInt(id, 10) || id;
    const incident = await Incident.findById(incidentId);

    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    // Role-based access control
    if (role === 'Student') {
      if (incident.reported_by !== userId) {
        return res.status(403).json({
          error: 'Access denied. You can only view your own incident reports.',
        });
      }
    } else if (role === 'Security Officer') {
      if (!isHeadOfficer && incident.assigned_to !== userId) {
        return res.status(403).json({
          error: 'Access denied. You can only view incident reports assigned to you.',
        });
      }
    } else if (role !== 'Admin') {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions to view incident reports.',
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Export filtered incident reports to a CSV file.
 * Authorized for Security Officers and Admins only.
 *
 * @route   GET /api/incidents/export
 * @access  Private (Officer/Admin only)
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const exportIncidents = async (req, res, next) => {
  try {
    const { role, id: userId, is_head_security_officer: isHeadOfficer } = req.user;

    if (role !== 'Admin' && role !== 'Security Officer') {
      return res.status(403).json({
        error: 'Access denied. Only officers and administrators can export reports.',
      });
    }

    const {
      status,
      priority,
      report_type: reportType,
      date_from: dateFrom,
      date_to: dateTo,
      sort_by: sortBy,
      sort_order: sortOrder,
    } = req.query;

    const filterOptions = {
      status,
      priority,
      reportType,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page: 1,
      limit: 10000,
    };

    if (role === 'Security Officer' && !isHeadOfficer) {
      filterOptions.assignedTo = userId;
    }

    const result = await Incident.findAllWithFilters(filterOptions);
    const incidents = result.data || [];

    // Helper to escape CSV values
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Report ID',
      'Title',
      'Report Type',
      'Priority',
      'Status',
      'Reported By',
      'Assigned To',
      'Location',
      'Created At',
    ];

    const rows = incidents.map((inc) => [
      escapeCsv(inc.report_id),
      escapeCsv(inc.title),
      escapeCsv(inc.report_type),
      escapeCsv(inc.priority),
      escapeCsv(inc.status),
      escapeCsv(inc.reported_by),
      escapeCsv(inc.assigned_to || 'Unassigned'),
      escapeCsv(inc.location),
      escapeCsv(inc.created_at ? new Date(inc.created_at).toISOString() : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="incidents-export-${Date.now()}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieve status history timeline for an incident report with RBAC.
 *
 * @route   GET /api/incidents/:id/timeline
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const getIncidentTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId, is_head_security_officer: isHeadOfficer } = req.user;

    const incidentId = parseInt(id, 10) || id;
    const incident = await Incident.findById(incidentId);

    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    // Role-based access control
    if (role === 'Student') {
      if (incident.reported_by !== userId) {
        return res.status(403).json({
          error: 'Access denied. You can only view the timeline of your own reports.',
        });
      }
    } else if (role === 'Security Officer') {
      if (!isHeadOfficer && incident.assigned_to !== userId) {
        return res.status(403).json({
          error: 'Access denied. You can only view the timeline of reports assigned to you.',
        });
      }
    } else if (role !== 'Admin') {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
      });
    }

    const timeline = await Incident.getTimeline(incidentId);

    return res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createIncident,
  submitReport: createIncident,
  getIncidents,
  getIncidentById,
  exportIncidents,
  getIncidentTimeline,
};
