const Visitor = require('../models/Visitor');

/**
 * Generate a unique visitor ID
 * @returns {string} Visitor ID in format V-YYYY-XXX
 */
function generateVisitorId() {
  const now = new Date();
  const year = now.getFullYear();
  const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `V-${year}-${count}`;
}

/**
 * Register a new visitor
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.category - Visitor category
 * @param {string} req.body.name - Visitor's full name
 * @param {string} req.body.identity_number - National ID or equivalent
 * @param {string} req.body.phone - Contact number
 * @param {string} [req.body.purpose] - Purpose of visit
 * @param {string} [req.body.host_name] - Host name (for one-time visitors)
 * @param {string} [req.body.host_department] - Host department
 * @param {string} [req.body.student_name] - Student name (for Guardian/Parent)
 * @param {string} [req.body.student_hall] - Student hall (for Guardian/Parent)
 * @param {string} [req.body.company_name] - Company name (for contractors/vendors)
 * @param {string} [req.body.project_code] - Project code (for construction)
 * @param {string} [req.body.work_site] - Work site location
 * @param {string} [req.body.vehicle_plate] - Vehicle plate number
 * @param {string} [req.body.event_name] - Event name
 * @param {string} [req.body.event_pass] - Event pass number
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with visitor data and pass
 */
async function registerVisitor(req, res) {
  try {
    const data = req.body;
    const categories = [
      'Guardian/Parent', 'Guest Visitor', 'Alumni', 'Event Participant',
      'Delivery Personnel', 'Construction Worker', 'Contractor',
      'Local Resident', 'Vendor/Shop Owner',
    ];

    // Validate category
    if (!categories.includes(data.category)) {
      return res.status(400).json({ error: 'Invalid visitor category' });
    }

    // Validate required common fields
    if (!data.name || !data.identity_number || !data.phone) {
      return res.status(400).json({ error: 'Name, identity number, and phone are required' });
    }

    // Category-specific validation
    if (data.category === 'Guardian/Parent' && !data.student_name) {
      return res.status(400).json({ error: 'Student name is required for Guardian/Parent' });
    }
    if (data.category === 'Construction Worker' && !data.project_code) {
      return res.status(400).json({ error: 'Project code is required for Construction Worker' });
    }
    if (data.category === 'Contractor' && !data.company_name) {
      return res.status(400).json({ error: 'Company name is required for Contractor' });
    }

    // Check for duplicate active registration
    const existing = await Visitor.findActiveByIdentity(data.identity_number);
    if (existing) {
      return res.status(409).json({
        error: 'Visitor already has an active registration',
        visitor_id: existing.visitor_id,
        status: existing.status,
      });
    }

    // Generate visitor ID and pass validity
    const visitorId = generateVisitorId();
    const passValidUntil = new Date();
    passValidUntil.setHours(passValidUntil.getHours() + 8);

    // Create visitor
    const visitor = await Visitor.create({
      visitor_id: visitorId,
      category: data.category,
      name: data.name,
      identity_number: data.identity_number,
      phone: data.phone,
      purpose: data.purpose,
      host_name: data.host_name,
      host_department: data.host_department,
      student_name: data.student_name,
      student_hall: data.student_hall,
      company_name: data.company_name,
      project_code: data.project_code,
      work_site: data.work_site,
      vehicle_plate: data.vehicle_plate,
      event_name: data.event_name,
      event_pass: data.event_pass,
      registered_by: 1, // TEMPORARY BYPASS: Hardcode user ID 1
      pass_valid_until: passValidUntil.toISOString().slice(0, 19).replace('T', ' '),
    });

    // Return response
    res.status(201).json({
      visitor,
      pass: {
        visitor_id: visitorId,
        name: data.name,
        category: data.category,
        host_name: data.host_name,
        issued_at: new Date().toISOString(),
        valid_until: passValidUntil.toISOString(),
      },
    });
  } catch (error) {
    console.error('Register visitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Search visitors by query
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.q - Search query string
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with search results
 */
async function searchVisitors(req, res) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await Visitor.search(q);
    res.json(results);
  } catch (error) {
    console.error('Search visitors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get visitor by ID
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Visitor database ID
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with visitor data
 */
async function getVisitorById(req, res) {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    res.json(visitor);
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all active visitors (currently inside campus)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with active visitors
 */
async function getActiveVisitors(req, res) {
  try {
    const visitors = await Visitor.getActive();
    res.json(visitors);
  } catch (error) {
    console.error('Get active visitors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get today's visitor history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with today's visitors
 */
async function getTodayHistory(req, res) {
  try {
    const visitors = await Visitor.getTodayHistory();
    res.json(visitors);
  } catch (error) {
    console.error('Get today history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get visitors registered by current operator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with operator's registrations
 */
async function getMyRegistrations(req, res) {
  try {
    const visitors = await Visitor.findByOperator(1); // TEMPORARY BYPASS
    res.json(visitors);
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if a visitor is restricted
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.identity_number - Identity number to check
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with restriction status
 */
async function checkRestricted(req, res) {
  try {
    const { identity_number } = req.query;
    if (!identity_number) {
      return res.status(400).json({ error: 'Identity number is required' });
    }

    // TEMPORARY BYPASS: Always return false
    res.json({ restricted: false });
  } catch (error) {
    console.error('Check restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get visitor categories with required fields
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with category configurations
 */
async function getCategories(req, res) {
  const categories = {
    'Guardian/Parent': {
      fields: ['name', 'identity_number', 'phone', 'student_name', 'student_hall', 'purpose'],
      required: ['name', 'identity_number', 'phone', 'student_name'],
    },
    'Guest Visitor': {
      fields: ['name', 'identity_number', 'phone', 'host_name', 'host_department', 'purpose'],
      required: ['name', 'identity_number', 'phone', 'host_name'],
    },
    'Alumni': {
      fields: ['name', 'identity_number', 'phone', 'host_name', 'purpose'],
      required: ['name', 'identity_number', 'phone'],
    },
    'Event Participant': {
      fields: ['name', 'identity_number', 'phone', 'event_name', 'event_pass'],
      required: ['name', 'identity_number', 'phone'],
    },
    'Delivery Personnel': {
      fields: ['name', 'identity_number', 'phone', 'host_name', 'vehicle_plate', 'purpose'],
      required: ['name', 'identity_number', 'phone', 'host_name'],
    },
    'Construction Worker': {
      fields: ['name', 'identity_number', 'phone', 'project_code', 'work_site', 'company_name'],
      required: ['name', 'identity_number', 'phone', 'project_code'],
    },
    'Contractor': {
      fields: ['name', 'identity_number', 'phone', 'company_name', 'project_code', 'work_site'],
      required: ['name', 'identity_number', 'phone', 'company_name'],
    },
    'Local Resident': {
      fields: ['name', 'identity_number', 'phone', 'purpose'],
      required: ['name', 'identity_number', 'phone'],
    },
    'Vendor/Shop Owner': {
      fields: ['name', 'identity_number', 'phone', 'company_name', 'purpose'],
      required: ['name', 'identity_number', 'phone'],
    },
  };
  res.json(categories);
}

/**
 * Get visitor statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with statistics
 */
async function getStats(req, res) {
  try {
    const stats = await Visitor.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  registerVisitor,
  searchVisitors,
  getVisitorById,
  getActiveVisitors,
  getTodayHistory,
  getMyRegistrations,
  checkRestricted,
  getCategories,
  getStats,
};