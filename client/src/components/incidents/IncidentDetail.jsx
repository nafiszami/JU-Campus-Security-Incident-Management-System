import React, { useState, useEffect, useCallback } from "react";
import {
  getIncidentById,
  getIncidentTimeline,
} from "../../services/incidentService";

/**
 * Format ISO date string into human-readable date.
 *
 * @param {string} dateString - ISO timestamp.
 * @returns {string} Formatted date.
 */
const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (err) {
    return dateString;
  }
};

/**
 * Format ISO date string into human-readable date and time.
 *
 * @param {string} dateString - ISO timestamp.
 * @returns {string} Formatted date and time.
 */
const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return dateString;
  }
};

/**
 * Component for viewing comprehensive incident report details, evidence, and status timeline.
 *
 * @param {Object} props - Component properties.
 * @param {number|string} [props.incidentId] - Primary key of the incident report.
 * @param {number|string} [props.id] - Fallback primary key if incidentId is omitted.
 * @param {Object} [props.initialIncident] - Optional pre-loaded incident record.
 * @param {Function} [props.onBack] - Callback function invoked when Back button is clicked.
 * @param {Object} [props.currentUser] - Authenticated user details.
 * @returns {React.ReactElement} Rendered IncidentDetail component.
 */
const IncidentDetail = ({
  incidentId,
  id,
  initialIncident = null,
  onBack = null,
  currentUser = null,
}) => {
  const targetId = incidentId || id || initialIncident?.id;

  const [incident, setIncident] = useState(initialIncident);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(!initialIncident);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Fetch complete incident details and status history timeline.
   */
  const loadIncidentData = useCallback(async () => {
    if (!targetId) {
      setErrorMessage("No incident ID provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const [incidentRes, timelineRes] = await Promise.allSettled([
        getIncidentById(targetId),
        getIncidentTimeline(targetId),
      ]);

      if (incidentRes.status === "fulfilled" && incidentRes.value?.data) {
        setIncident(incidentRes.value.data);
      } else {
        const err = incidentRes.reason;
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load incident report details.";
        setErrorMessage(msg);
      }

      if (timelineRes.status === "fulfilled" && timelineRes.value?.data) {
        setTimeline(timelineRes.value.data);
      } else {
        setTimeline([]);
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred while loading details.");
    } finally {
      setIsLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    loadIncidentData();
  }, [loadIncidentData]);

  if (isLoading) {
    return (
      <div className="incident-detail-container">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading incident details...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="incident-detail-container">
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <div className="alert-content">
            <p className="alert-title">{errorMessage}</p>
          </div>
        </div>
        <div className="detail-actions">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-back"
              onClick={onBack}
            >
              ← Back to Reports
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="incident-detail-container">
        <div className="empty-state">
          <h3>Incident Report Not Found</h3>
          <p>The requested report details could not be located.</p>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-back"
              onClick={onBack}
            >
              ← Back to Reports
            </button>
          )}
        </div>
      </div>
    );
  }

  const priorityClass = `badge badge-priority badge-priority-${(
    incident.priority || "low"
  ).toLowerCase()}`;

  const statusClass = `badge badge-status badge-status-${(incident.status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  return (
    <div className="incident-detail-container">
      {/* Detail Navigation Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-back"
              onClick={onBack}
            >
              ← Back to Reports
            </button>
          )}
          <div className="detail-title-group">
            <span className="report-id-badge">{incident.report_id}</span>
            <h2 className="detail-title">{incident.title}</h2>
          </div>
        </div>
        <div className="detail-header-badges">
          <span className={statusClass}>{incident.status}</span>
          <span className={priorityClass}>{incident.priority}</span>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="detail-content-grid">
        {/* Left Column: Report Information */}
        <div className="detail-card detail-info-card">
          <h3 className="card-section-title">Report Information</h3>
          <div className="detail-meta-list">
            <div className="detail-meta-item">
              <span className="meta-label">Report ID</span>
              <span className="meta-value report-id-text">
                {incident.report_id}
              </span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Incident Type</span>
              <span className="meta-value">{incident.report_type}</span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Priority Level</span>
              <span className="meta-value">
                <span className={priorityClass}>{incident.priority}</span>
              </span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Current Status</span>
              <span className="meta-value">
                <span className={statusClass}>{incident.status}</span>
              </span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Location</span>
              <span className="meta-value">{incident.location}</span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Reported By</span>
              <span className="meta-value">
                {incident.reporter_name ||
                  incident.reporter_email ||
                  `User #${incident.reported_by}`}
              </span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Assigned Officer</span>
              <span className="meta-value">
                {incident.assigned_officer_name ||
                  (incident.assigned_to
                    ? incident.assigned_officer_email ||
                      `Officer #${incident.assigned_to}`
                    : "Unassigned")}
              </span>
            </div>

            <div className="detail-meta-item">
              <span className="meta-label">Date Submitted</span>
              <span className="meta-value">
                {formatDateTime(incident.created_at)}
              </span>
            </div>

            {incident.resolved_at && (
              <div className="detail-meta-item detail-resolved-date">
                <span className="meta-label">Date Resolved</span>
                <span className="meta-value">
                  {formatDateTime(incident.resolved_at)}
                </span>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="detail-section">
            <h4 className="section-subtitle">Description</h4>
            <p className="detail-text-block">{incident.description}</p>
          </div>

          {/* Investigation Notes Section */}
          {incident.investigation_notes && (
            <div className="detail-section detail-investigation-section">
              <h4 className="section-subtitle">Investigation Notes</h4>
              <p className="detail-text-block notes-block">
                {incident.investigation_notes}
              </p>
            </div>
          )}

          {/* Evidence Section */}
          <div className="detail-section detail-evidence-section">
            <h4 className="section-subtitle">Evidence Attachment</h4>
            {incident.evidence_url ? (
              <div className="evidence-attachment">
                <span className="evidence-icon">📎</span>
                <a
                  href={incident.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                >
                  View Attached Evidence
                </a>
              </div>
            ) : (
              <p className="no-evidence-text">No evidence attached.</p>
            )}
          </div>
        </div>

        {/* Right Column: Status Timeline */}
        <div className="detail-card detail-timeline-card">
          <h3 className="card-section-title">Status History Timeline</h3>

          {timeline && timeline.length > 0 ? (
            <div className="timeline-container">
              {timeline.map((entry, index) => (
                <div key={entry.id || index} className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-header">
                      <span className="timeline-status-badge">
                        {entry.new_status}
                      </span>
                      <span className="timeline-timestamp">
                        {formatDateTime(entry.changed_at)}
                      </span>
                    </div>
                    <div className="timeline-actor">
                      Changed by{" "}
                      <strong>
                        {entry.changed_by_name ||
                          entry.changed_by_role ||
                          `User #${entry.changed_by}`}
                      </strong>
                    </div>
                    {entry.notes && (
                      <div className="timeline-notes">{entry.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="timeline-empty">
              <span className="empty-icon">ℹ</span>
              <p>No status history available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
