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

export default {
  createIncident,
  submitReport,
};
