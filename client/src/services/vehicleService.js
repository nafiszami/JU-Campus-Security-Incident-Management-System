import api from './api';

/**
 * Vehicle service for all vehicle entry and exit API calls (SRS Feature 8)
 */
export const vehicleService = {
  /**
   * Register a new vehicle entry at campus checkpoint
   * @param {Object} data - Vehicle entry information
   * @returns {Promise<Object>} { message, vehicle }
   */
  registerEntry: async (data) => {
    const response = await api.post('/vehicles/entry', data);
    return response.data;
  },

  /**
   * Record a vehicle exit from campus
   * @param {number|string} id - Vehicle database ID
   * @param {Object} [data] - { exit_gate, remarks }
   * @returns {Promise<Object>} { message, vehicle }
   */
  processExit: async (id, data = {}) => {
    const response = await api.put(`/vehicles/${id}/exit`, data);
    return response.data;
  },

  /**
   * Get all vehicles currently inside campus
   * @returns {Promise<Array>} List of inside vehicles
   */
  getActive: async () => {
    const response = await api.get('/vehicles/active');
    return response.data;
  },

  /**
   * Get vehicle entry/exit movement history with filters
   * @param {Object} [params={}] - search, date_from, date_to, category, vehicle_type, status
   * @returns {Promise<Array>} List of historical movement records
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/vehicles/history', { params });
    return response.data;
  },

  /**
   * Check whether a vehicle plate is blacklisted
   * @param {string} plateNumber - Plate number to check
   * @returns {Promise<Object>} { restricted: boolean, reason?, plate_number }
   */
  checkRestricted: async (plateNumber) => {
    const response = await api.get(`/vehicles/check-restricted/${plateNumber}`);
    return response.data;
  },

  /**
   * Add a vehicle to the restricted list
   * @param {Object} data - { plate_number, reason, restriction_type }
   * @returns {Promise<Object>} { message, restrictedVehicle }
   */
  addRestricted: async (data) => {
    const response = await api.post('/vehicles/restricted', data);
    return response.data;
  },

  /**
   * Get vehicle movement statistics
   * @returns {Promise<Object>} Statistics counts
   */
  getStats: async () => {
    const response = await api.get('/vehicles/stats');
    return response.data;
  },

  /**
   * Get a single vehicle record by ID
   * @param {number|string} id - Vehicle database ID
   * @returns {Promise<Object>} Vehicle record
   */
  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },
};

export default vehicleService;
