import api from './api';

/**
 * Visitor service for all visitor-related API calls
 */
export const visitorService = {
  // ============================================
  // SPRINT 1: Register Visitor (SRS 3.1.5)
  // ============================================

  /**
   * Register a new visitor
   * @param {Object} data - Visitor data
   * @param {string} data.category - Visitor category
   * @param {string} data.name - Visitor name
   * @param {string} data.identity_number - NID or equivalent
   * @param {string} data.phone - Contact number
   * @param {string} [data.purpose] - Purpose of visit
   * @param {string} [data.host_name] - Host name
   * @param {string} [data.host_department] - Host department
   * @param {string} [data.student_name] - Student name (for Guardian/Parent)
   * @param {string} [data.student_hall] - Student hall
   * @param {string} [data.company_name] - Company name
   * @param {string} [data.project_code] - Project code
   * @param {string} [data.work_site] - Work site location
   * @param {string} [data.vehicle_plate] - Vehicle plate number
   * @param {string} [data.event_name] - Event name
   * @param {string} [data.event_pass] - Event pass number
   * @returns {Promise<Object>} { visitor, pass }
   */
  register: async (data) => {
    const response = await api.post('/visitors', data);
    return response.data;
  },

  /**
   * Search visitors by query
   * @param {string} query - Search term
   * @returns {Promise<Array>} Matching visitors
   */
  search: async (query) => {
    const response = await api.get('/visitors/search', { params: { q: query } });
    return response.data;
  },

  /**
   * Get visitor by ID
   * @param {number|string} id - Visitor database ID
   * @returns {Promise<Object>} Visitor details
   */
  getById: async (id) => {
    const response = await api.get(`/visitors/${id}`);
    return response.data;
  },

  /**
   * Get visitor categories with field configurations
   * @returns {Promise<Object>} Category configurations
   */
  getCategories: async () => {
    const response = await api.get('/visitors/categories');
    return response.data;
  },

  /**
   * Check if visitor is restricted
   * @param {string} identityNumber - NID or equivalent
   * @returns {Promise<Object>} { restricted: boolean, reason?, name? }
   */
  checkRestricted: async (identityNumber) => {
    const response = await api.get('/visitors/check-restricted', {
      params: { identity_number: identityNumber },
    });
    return response.data;
  },

  /**
   * Get active visitors (currently inside campus)
   * @returns {Promise<Array>} Active visitors
   */
  getActive: async () => {
    const response = await api.get('/visitors/active');
    return response.data;
  },

  /**
   * Get today's visitor history
   * @returns {Promise<Array>} Today's visitors
   */
  getTodayHistory: async () => {
    const response = await api.get('/visitors/today');
    return response.data;
  },

  /**
   * Get current operator's registrations
   * @returns {Promise<Array>} Visitors registered by current operator
   */
  getMyRegistrations: async () => {
    const response = await api.get('/visitors/my-registrations');
    return response.data;
  },

  /**
   * Get visitor statistics
   * @returns {Promise<Object>} Statistics
   */
  getStats: async () => {
    const response = await api.get('/visitors/stats');
    return response.data;
  },

  // ============================================
  // SPRINT 2: Campus Entry & Exit (SRS 3.1.6)
  // ============================================

  /**
   * Process a visitor's campus entry
   * @param {number} visitorId - Visitor database ID
   * @returns {Promise<Object>} Updated visitor record
   */
  processEntry: async (visitorId) => {
    const response = await api.put(`/visitors/${visitorId}/entry`);
    return response.data;
  },

  /**
   * Process a visitor's campus exit
   * @param {number} visitorId - Visitor database ID
   * @returns {Promise<Object>} Updated visitor record
   */
  processExit: async (visitorId) => {
    const response = await api.put(`/visitors/${visitorId}/exit`);
    return response.data;
  },

  /**
   * Get entry/exit history with optional filters
   * @param {Object} [params={}] - date_from, date_to, category
   * @returns {Promise<Array>} History records
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/visitors/history', { params });
    return response.data;
  },
};

export default visitorService;