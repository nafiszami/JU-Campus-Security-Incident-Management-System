import api from "./api";
/**
 * Record guard check-in for a schedule.
 *
 * @param {number} scheduleId - Guard schedule ID.
 * @returns {Promise<Object>} Attendance record.
 */
export const checkIn = async (scheduleId) => {
  const response = await api.post("/attendance/checkin", {
    schedule_id: scheduleId,
  });
  return response.data;
};
/**
 * Record guard check-out for a schedule.
 *
 * @param {number} scheduleId - Guard schedule ID.
 * @returns {Promise<Object>} Attendance record.
 */
export const checkOut = async (scheduleId) => {
  const response = await api.post("/attendance/checkout", {
    schedule_id: scheduleId,
  });
  return response.data;
};
/**
 * Get daily attendance summary (Security Officer / Admin).
 *
 * @param {string} [date] - Date string (YYYY-MM-DD). Defaults to today.
 * @returns {Promise<Object>} Summary stats and detailed list.
 */
export const getDailySummary = async (date) => {
  const response = await api.get("/attendance/daily", {
    params: date ? { date } : {},
  });
  return response.data;
};
/**
 * Get attendance history for a specific guard.
 *
 * @param {number} guardId - Guard user ID.
 * @param {Object} [params={}] - date_from, date_to filter params.
 * @returns {Promise<Array>} Attendance records.
 */
export const getGuardHistory = async (guardId, params = {}) => {
  const response = await api.get(`/attendance/guard/${guardId}`, { params });
  return response.data;
};
export default { checkIn, checkOut, getDailySummary, getGuardHistory };
