import React, { useState } from "react";
import { submitReport } from "../../services/incidentService";

const REPORT_TYPES = [
  "Theft",
  "Harassment",
  "Suspicious Activity",
  "Vandalism",
  "Accident",
  "Gate Violation",
  "Unauthorized Entry",
  "Investigation Report",
];

const PRIORITIES = ["High", "Medium", "Low"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

const INITIAL_FORM_STATE = {
  reportType: "",
  title: "",
  description: "",
  location: "",
  priority: "",
  evidence: null,
};

/**
 * IncidentForm component for submitting campus security and incident reports.
 *
 * @param {Object} props - Component properties.
 * @param {Function} [props.onSuccess] - Optional callback triggered on successful submission.
 * @returns {React.ReactElement} The rendered IncidentForm component.
 */
const IncidentForm = ({ onSuccess = null }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedReport, setSubmittedReport] = useState(null);

  /**
   * Validate all form fields.
   *
   * @returns {boolean} True if form is valid, false otherwise.
   */
  const validateForm = () => {
    const currentErrors = {};

    if (!formData.reportType.trim()) {
      currentErrors.reportType = "Report type is required.";
    } else if (!REPORT_TYPES.includes(formData.reportType)) {
      currentErrors.reportType = "Selected report type is invalid.";
    }

    if (!formData.title.trim()) {
      currentErrors.title = "Title is required.";
    } else if (formData.title.trim().length < 3) {
      currentErrors.title = "Title must be at least 3 characters.";
    }

    if (!formData.description.trim()) {
      currentErrors.description = "Description is required.";
    } else if (formData.description.trim().length < 10) {
      currentErrors.description = "Description must be at least 10 characters.";
    }

    if (!formData.location.trim()) {
      currentErrors.location = "Location is required.";
    }

    if (!formData.priority.trim()) {
      currentErrors.priority = "Priority level is required.";
    } else if (!PRIORITIES.includes(formData.priority)) {
      currentErrors.priority = "Selected priority is invalid.";
    }

    if (formData.evidence) {
      const file = formData.evidence;
      const fileExt = `.${file.name.split(".").pop().toLowerCase()}`;

      if (
        !ALLOWED_EXTENSIONS.includes(fileExt) &&
        !ALLOWED_FILE_TYPES.includes(file.type)
      ) {
        currentErrors.evidence = "Only JPG, PNG, and PDF files are allowed.";
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        currentErrors.evidence = "File size exceeds maximum limit of 5MB.";
      }
    }

    setErrors(currentErrors);
    return Object.keys(currentErrors).length === 0;
  };

  /**
   * Handle text and select input changes.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>} event
   */
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  /**
   * Handle file attachment changes and validate file type/size immediately.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  const handleFileChange = (event) => {
    const file =
      event.target.files && event.target.files[0]
        ? event.target.files[0]
        : null;

    if (!file) {
      setFormData((prev) => ({ ...prev, evidence: null }));
      return;
    }

    const fileExt = `.${file.name.split(".").pop().toLowerCase()}`;
    if (
      !ALLOWED_EXTENSIONS.includes(fileExt) &&
      !ALLOWED_FILE_TYPES.includes(file.type)
    ) {
      setErrors((prev) => ({
        ...prev,
        evidence: "Only JPG, PNG, and PDF files are allowed.",
      }));
      setFormData((prev) => ({ ...prev, evidence: null }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        evidence: "File size exceeds maximum limit of 5MB.",
      }));
      setFormData((prev) => ({ ...prev, evidence: null }));
      event.target.value = "";
      return;
    }

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.evidence;
      return updated;
    });

    setFormData((prev) => ({ ...prev, evidence: file }));
  };

  /**
   * Handle form submission.
   *
   * @param {React.FormEvent<HTMLFormElement>} event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await submitReport(formData);
      const createdIncident = response.data || response;

      setSubmittedReport(createdIncident);
      setFormData(INITIAL_FORM_STATE);
      setErrors({});

      if (onSuccess && typeof onSuccess === "function") {
        onSuccess(createdIncident);
      }
    } catch (err) {
      const apiError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to submit incident report. Please try again.";
      setErrorMessage(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset form and allow submitting a new report after success.
   */
  const handleResetSuccess = () => {
    setSubmittedReport(null);
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setErrorMessage("");
  };

  if (submittedReport) {
    return (
      <div className="incident-form-container success-card">
        <div className="success-header">
          <div className="success-icon" aria-hidden="true">
            ✓
          </div>
          <h2>Incident Report Submitted Successfully</h2>
        </div>
        <p className="success-description">
          Your incident report has been recorded and submitted for security
          review.
        </p>

        <div className="report-summary">
          <div className="summary-row">
            <span className="summary-label">Report ID:</span>
            <strong className="summary-value report-id">
              {submittedReport.report_id ||
                submittedReport.reportId ||
                "Pending"}
            </strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Report Type:</span>
            <span className="summary-value">
              {submittedReport.report_type || submittedReport.reportType}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Title:</span>
            <span className="summary-value">{submittedReport.title}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Priority:</span>
            <span className="summary-value">{submittedReport.priority}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Status:</span>
            <span className="summary-value status-badge">
              {submittedReport.status || "Submitted"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetSuccess}
          className="btn btn-primary submit-another-btn"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="incident-form-container">
      <div className="form-header">
        <h2>Submit Incident Report</h2>
        <p>
          Report security, safety, or policy violations to JU Campus Security.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <span className="alert-message">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="incident-form">
        {/* Report Type & Priority in a responsive row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reportType">
              Report Type <span className="required-star">*</span>
            </label>
            <select
              id="reportType"
              name="reportType"
              value={formData.reportType}
              onChange={handleInputChange}
              className={errors.reportType ? "input-error" : ""}
              disabled={isLoading}
              required
            >
              <option value="">-- Select Report Type --</option>
              {REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.reportType && (
              <span className="error-text">{errors.reportType}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="priority">
              Priority Level <span className="required-star">*</span>
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className={errors.priority ? "input-error" : ""}
              disabled={isLoading}
              required
            >
              <option value="">-- Select Priority --</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {errors.priority && (
              <span className="error-text">{errors.priority}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">
            Incident Title <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Brief summary of the incident (e.g. Stolen bicycle from Library rack)"
            className={errors.title ? "input-error" : ""}
            disabled={isLoading}
            required
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">
            Incident Location <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Specific campus location (e.g. Central Library, 2nd Floor)"
            className={errors.location ? "input-error" : ""}
            disabled={isLoading}
            required
          />
          {errors.location && (
            <span className="error-text">{errors.location}</span>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">
            Detailed Description <span className="required-star">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={5}
            placeholder="Provide all relevant details: what happened, persons involved, specific times, etc."
            className={errors.description ? "input-error" : ""}
            disabled={isLoading}
            required
          />
          {errors.description && (
            <span className="error-text">{errors.description}</span>
          )}
        </div>

        {/* Evidence Upload (Optional) */}
        <div className="form-group">
          <label htmlFor="evidence">
            Supporting Evidence{" "}
            <span className="optional-badge">(Optional)</span>
          </label>
          <input
            type="file"
            id="evidence"
            name="evidence"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className={errors.evidence ? "input-error" : ""}
          />
          <small className="form-help-text">
            Supported formats: JPG, PNG, PDF. Maximum file size: 5MB.
          </small>
          {errors.evidence && (
            <span className="error-text">{errors.evidence}</span>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                Submitting Report...
              </span>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentForm;
