/**
 * @module routes/restrictedRoutes
 * @description Route definitions for Restricted Visitor Management
 * (SRS 3.1.7). Mounted at `/api/restricted` in server/app.js. Maps each
 * HTTP endpoint to its handler in controllers/restrictedController.js.
 *
 * TEMPORARY (parallel-development bypass): `authenticate` and `authorize`
 * are wired up below but commented out, since Member 6's login system
 * isn't merged into main yet and there is no real `req.user` to check.
 * This means every endpoint here is currently OPEN — anyone can call
 * them without a token. That's expected for local development only.
 * SEARCH FOR THE STRING "TEMPORARY" BEFORE OPENING YOUR PR — every
 * commented-out line below must be restored once auth is available.
 */

/* eslint-disable no-unused-vars */
const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  addRestricted,
  getRestricted,
  getRestrictedById,
  updateRestricted,
  removeRestricted,
  checkRestricted,
  createException,
  getPendingExceptions,
  updateException,
} = require('../controllers/restrictedController');

// TEMPORARY: real auth is disabled for local testing — uncomment before PR.
// router.use(authenticate);

/**
 * @route POST /api/restricted
 * @description Add a new restricted visitor (FR-7.1).
 * @access Security Officer, Admin (once auth is restored)
 */
router.post(
  '/',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  addRestricted
);

/**
 * @route GET /api/restricted
 * @description List restricted visitors with optional status/search/pagination.
 * @access Security Officer, Admin (once auth is restored)
 */
router.get(
  '/',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  getRestricted
);

/**
 * @route GET /api/restricted/:id
 * @description Fetch a single restricted-visitor record by id.
 * @access Security Officer, Admin (once auth is restored)
 */
router.get(
  '/:id',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  getRestrictedById
);

/**
 * @route PUT /api/restricted/:id
 * @description Update a restricted-visitor record.
 * @access Security Officer, Admin (once auth is restored)
 */
router.put(
  '/:id',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  updateRestricted
);

/**
 * @route DELETE /api/restricted/:id
 * @description Deactivate (soft-remove) a restricted-visitor record.
 * @access Security Officer, Admin (once auth is restored)
 */
router.delete(
  '/:id',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  removeRestricted
);

/**
 * @route GET /api/restricted/check/:identity_number
 * @description Check whether a person is currently restricted (FR-7.3).
 *   Called by Register Visitor / Campus Entry & Exit before granting access.
 * @access Gate Operator, Security Officer, Admin (once auth is restored)
 */
router.get(
  '/check/:identity_number',
  // TEMPORARY: authorize(['Gate Operator', 'Security Officer', 'Admin']),
  checkRestricted
);

/**
 * @route POST /api/restricted/exception
 * @description Create an exceptional-entry request for a restricted visitor (FR-7.4).
 * @access Gate Operator, Security Officer, Admin (once auth is restored)
 */
router.post(
  '/exception',
  // TEMPORARY: authorize(['Gate Operator', 'Security Officer', 'Admin']),
  createException
);

/**
 * @route GET /api/restricted/exception/pending
 * @description List exception requests awaiting review (FR-7.5).
 * @access Security Officer, Admin (once auth is restored)
 */
router.get(
  '/exception/pending',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  getPendingExceptions
);

/**
 * @route PUT /api/restricted/exception/:id
 * @description Approve or reject a pending exception request (FR-7.5).
 * @access Security Officer, Admin (once auth is restored)
 */
router.put(
  '/exception/:id',
  // TEMPORARY: authorize(['Security Officer', 'Admin']),
  updateException
);

module.exports = router;