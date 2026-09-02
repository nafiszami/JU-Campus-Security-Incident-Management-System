import api from "./api";

/**
 * Submit a new incident report with optional evidence attachment.
 *
 * @param {Object|FormData} incidentData - Incident report data or pre-constructed FormData.
 * @param {string} [incidentData.reportType] - Type of incident.
 * @param {string} [incidentData.title] - Incident title.
 * @param {string} [incidentData.description] - Detailed description of the incident.
 * @param {string} [incidentData.location] - Campus location.
 * @param {string} [incidentData.priority] - Priority level ('High', 'Medium', 'Low').
 * @param {File} [incidentData.evidence] - Optional evidence file.
 * @returns {Promise<Object>} Server response data containing created incident report.
 */
export const createIncident = async (incidentData) => {
  let payload = incidentData;
  let headers = {};

  if (incidentData instanceof FormData) {
    payload = incidentData;
    headers = { "Content-Type": "multipart/form-data" };
  } else if (incidentData && incidentData.evidence instanceof File) {
    const formData = new FormData();
    Object.keys(incidentData).forEach((key) => {
      if (incidentData[key] !== undefined && incidentData[key] !== null) {
        formData.append(key, incidentData[key]);
      }
    });
    payload = formData;
    headers = { "Content-Type": "multipart/form-data" };
  }

  const response = await api.post("/incidents", payload, { headers });
  return response.data;
};

/**
 * Alias for createIncident.
 */
export const submitReport = createIncident;

/**
 * Retrieve a filtered, paginated list of incident reports.
 *
 * @param {Object} [params={}] - Filter and pagination query parameters.
 * @param {string} [params.status] - Filter by status.
 * @param {string} [params.priority] - Filter by priority.
 * @param {string} [params.report_type] - Filter by report type.
 * @param {string} [params.date_from] - Lower date boundary (YYYY-MM-DD).
 * @param {string} [params.date_to] - Upper date boundary (YYYY-MM-DD).
 * @param {string} [params.sort_by] - Column to sort by.
 * @param {string} [params.sort_order] - Sort direction ('asc' or 'desc').
 * @param {number} [params.page=1] - Page number.
 * @param {number} [params.limit=20] - Number of items per page.
 * @returns {Promise<Object>} API response object containing incident data and pagination.
 */
export const getIncidents = async (params = {}) => {
  const response = await api.get("/incidents", { params });
  return response.data;
};

/**
 * Retrieve full details for a single incident report.
 *
 * @param {number|string} id - Primary key ID of the incident.
 * @returns {Promise<Object>} API response object with report details.
 */
export const getIncidentById = async (id) => {
  const response = await api.get(`/incidents/${id}`);
  return response.data;
};

/**
 * Retrieve status history timeline for a single incident report.
 *
 * @param {number|string} id - Primary key ID of the incident.
 * @returns {Promise<Object>} API response object with timeline history array.
 */
export const getIncidentTimeline = async (id) => {
  const response = await api.get(`/incidents/${id}/timeline`);
  return response.data;
};

/**
 * Export filtered incident reports as a downloadable CSV blob.
 *
 * @param {Object} [params={}] - Filter parameters for export.
 * @returns {Promise<Blob>} CSV Blob response.
 */
export const exportIncidents = async (params = {}) => {
  const response = await api.get("/incidents/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};

export default {
  createIncident,
  submitReport,
  getIncidents,
  getIncidentById,
  getIncidentTimeline,
  exportIncidents,
};
