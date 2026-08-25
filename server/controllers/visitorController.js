const Visitor = require('../models/Visitor');


function generateVisitorId() {
  const now = new Date();
  const year = now.getFullYear();
  const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `V-${year}-${count}`;
}

async function registerVisitor(req, res) {
  try {
    const data = req.body;
    const categories = [
      'Guardian/Parent', 'Guest Visitor', 'Alumni', 'Event Participant',
      'Delivery Personnel', 'Construction Worker', 'Contractor',
      'Local Resident', 'Vendor/Shop Owner',
    ];

    if (!categories.includes(data.category)) {
      return res.status(400).json({ error: 'Invalid visitor category' });
    }

    if (!data.name || !data.identity_number || !data.phone) {
      return res.status(400).json({ error: 'Name, identity number, and phone are required' });
    }

    if (data.category === 'Guardian/Parent' && !data.student_name) {
      return res.status(400).json({ error: 'Student name is required for Guardian/Parent' });
    }
    if (data.category === 'Construction Worker' && !data.project_code) {
      return res.status(400).json({ error: 'Project code is required for Construction Worker' });
    }
    if (data.category === 'Contractor' && !data.company_name) {
      return res.status(400).json({ error: 'Company name is required for Contractor' });
    }

    const existing = await Visitor.findActiveByIdentity(data.identity_number);
    if (existing) {
      return res.status(409).json({
        error: 'Visitor already has an active registration',
        visitor_id: existing.visitor_id,
        status: existing.status,
      });
    }

    const visitorId = generateVisitorId();
    const passValidUntil = new Date();
    passValidUntil.setHours(passValidUntil.getHours() + 8);

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
      registered_by: 1, // TEMPORARY BYPASS: Hardcode user ID 1 instead of req.user.id
      pass_valid_until: passValidUntil.toISOString().slice(0, 19).replace('T', ' '),
    });


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

async function searchVisitors(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    const results = await Visitor.search(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getVisitorById(req, res) {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getActiveVisitors(req, res) {
  try {
    const visitors = await Visitor.getActive();
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTodayHistory(req, res) {
  try {
    const visitors = await Visitor.getTodayHistory();
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMyRegistrations(req, res) {
  try {
    const visitors = await Visitor.findByOperator(1); 
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkRestricted(req, res) {
  try {
    const { identity_number } = req.query;
    if (!identity_number) return res.status(400).json({ error: 'Identity number is required' });

    res.json({ restricted: false });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCategories(req, res) {
  const categories = {
    'Guardian/Parent': { fields: ['name', 'identity_number', 'phone', 'student_name', 'student_hall', 'purpose'], required: ['name', 'identity_number', 'phone', 'student_name'] },
    'Guest Visitor': { fields: ['name', 'identity_number', 'phone', 'host_name', 'host_department', 'purpose'], required: ['name', 'identity_number', 'phone', 'host_name'] },
    'Alumni': { fields: ['name', 'identity_number', 'phone', 'host_name', 'purpose'], required: ['name', 'identity_number', 'phone'] },
    'Event Participant': { fields: ['name', 'identity_number', 'phone', 'event_name', 'event_pass'], required: ['name', 'identity_number', 'phone'] },
    'Delivery Personnel': { fields: ['name', 'identity_number', 'phone', 'host_name', 'vehicle_plate', 'purpose'], required: ['name', 'identity_number', 'phone', 'host_name'] },
    'Construction Worker': { fields: ['name', 'identity_number', 'phone', 'project_code', 'work_site', 'company_name'], required: ['name', 'identity_number', 'phone', 'project_code'] },
    'Contractor': { fields: ['name', 'identity_number', 'phone', 'company_name', 'project_code', 'work_site'], required: ['name', 'identity_number', 'phone', 'company_name'] },
    'Local Resident': { fields: ['name', 'identity_number', 'phone', 'purpose'], required: ['name', 'identity_number', 'phone'] },
    'Vendor/Shop Owner': { fields: ['name', 'identity_number', 'phone', 'company_name', 'purpose'], required: ['name', 'identity_number', 'phone'] },
  };
  res.json(categories);
}

async function getStats(req, res) {
  try {
    const stats = await Visitor.getStats();
    res.json(stats);
  } catch (error) {
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