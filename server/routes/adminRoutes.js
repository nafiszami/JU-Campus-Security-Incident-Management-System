const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { createUser, getUsers, updateRole, deactivateUser, reactivateUser } = require('../controllers/adminController');

// All routes require Admin role
router.use(authenticate, authorize(['Admin']));

router.post('/users', createUser);
router.get('/users', getUsers);
router.put('/users/:id/role', updateRole);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/users/:id/activate', reactivateUser);

module.exports = router;