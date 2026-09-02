import React, { useState, useEffect, useCallback } from "react";
import { getIncidents, exportIncidents } from "../../services/incidentService";

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

const STATUSES = [
  "Submitted",
  "Assigned",
  "Under Investigation",
  "Resolved",
  "Closed",
  "Revision Required",
  "Deleted",
];

const INITIAL_FILTERS = {
  status: "",
  priority: "",
  report_type: "",
  date_from: "",
  date_to: "",
  sort_by: "created_at",
  sort_order: "desc",
};

/**
 * Format ISO date string into human-readable date.
 *
 * @param {string} dateString - ISO timestamp.
 * @returns {string} Formatted date string.
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
 * Component for viewing, filtering, sorting, and exporting campus security incidents.
 *
 * @param {Object} props - Component properties.
 * @param {Object} [props.currentUser] - Authenticated user details.
 * @param {Function} [props.onView] - Callback invoked with incident report object when View is clicked.
 * @returns {React.ReactElement} Rendered IncidentList component.
 */
const IncidentList = ({ currentUser = null, onView = null }) => {
  // Determine effective user role for role-based features
  const user =
    currentUser ||
    (() => {
      try {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();

  const canExport = user?.role === "Security Officer" || user?.role === "Admin";

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Fetch incident reports from server with active filters and pagination.
   */
  const fetchReports = useCallback(
    async (pageToLoad = 1, currentActiveFilters = activeFilters) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = {
          page: pageToLoad,
          limit: pagination.limit,
          ...currentActiveFilters,
        };

        // Strip empty strings from query parameters
        Object.keys(params).forEach((key) => {
          if (params[key] === "" || params[key] === undefined) {
            delete params[key];
          }
        });

        const response = await getIncidents(params);

        if (response && response.data) {
          setReports(response.data);
          if (response.pagination) {
            setPagination(response.pagination);
          }
        } else {
          setReports([]);
        }
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.message ||
          "Failed to load incident reports.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilters, pagination.limit]
  );

  // Initial data load
  useEffect(() => {
    fetchReports(1, activeFilters);
  }, [fetchReports, activeFilters]);

  /**
   * Handle changes in filter input fields.
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Apply current filter inputs and trigger re-fetch on page 1.
   */
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setActiveFilters(filters);
    fetchReports(1, filters);
  };

  /**
   * Reset all filter inputs to defaults and re-fetch.
   */
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setActiveFilters(INITIAL_FILTERS);
    fetchReports(1, INITIAL_FILTERS);
  };

  /**
   * Change pagination page.
   */
  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    const maxPage = Math.ceil((pagination.total || 0) / pagination.limit) || 1;
    if (newPage > maxPage) return;
    fetchReports(newPage, activeFilters);
  };

  /**
   * Export filtered reports to CSV and trigger browser download.
   */
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const exportParams = { ...activeFilters };
      Object.keys(exportParams).forEach((key) => {
        if (exportParams[key] === "") delete exportParams[key];
      });

      const blob = await exportIncidents(exportParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export incidents to CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil((pagination.total || 0) / pagination.limit) || 1;
  const currentPage = pagination.page || 1;

  return (
    <div className="incident-list-container">
      {/* Page Header */}
      <div className="incident-list-header">
        <div>
          <h2>Incident Reports</h2>
          <p>View, filter, and track campus security reports</p>
        </div>
        {canExport && (
          <button
            type="button"
            className="btn btn-secondary btn-export-csv"
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="filter-card">
        <form onSubmit={handleApplyFilters}>
          <div className="filter-grid">
            <div className="filter-group">
              <label htmlFor="filter-status">Status</label>
              <select
                id="filter-status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-priority">Priority</label>
              <select
                id="filter-priority"
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-report-type">Report Type</label>
              <select
                id="filter-report-type"
                name="report_type"
                value={filters.report_type}
                onChange={handleFilterChange}
              >
                <option value="">All Types</option>
                {REPORT_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-date-from">From Date</label>
              <input
                type="date"
                id="filter-date-from"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-date-to">To Date</label>
              <input
                type="date"
                id="filter-date-to"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="sort-by">Sort By</label>
              <select
                id="sort-by"
                name="sort_by"
                value={filters.sort_by}
                onChange={handleFilterChange}
              >
                <option value="created_at">Date Created</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="report_type">Report Type</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-order">Order</label>
              <select
                id="sort-order"
                name="sort_order"
                value={filters.sort_order}
                onChange={handleFilterChange}
              >
                <option value="desc">Newest / High First</option>
                <option value="asc">Oldest / Low First</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button
              type="submit"
              className="btn btn-primary btn-apply-filters"
              disabled={isLoading}
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-reset-filters"
              onClick={handleResetFilters}
              disabled={isLoading}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="alert alert-error">
          <span className="alert-icon">!</span>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-secondary btn-retry"
            onClick={() => fetchReports(currentPage, activeFilters)}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              fontSize: "0.85rem",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div
            className="spinner"
            style={{ borderColor: "#1e40af", borderTopColor: "transparent" }}
          />
          <span>Loading incident reports...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && reports.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No incident reports found</h3>
          <p>Try adjusting your search criteria or filter options.</p>
        </div>
      )}

      {/* Reports Table */}
      {!isLoading && !errorMessage && reports.length > 0 && (
        <div className="incident-table-wrapper">
          <table className="incident-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Location</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id || report.report_id}>
                  <td className="cell-report-id">{report.report_id}</td>
                  <td className="cell-title">{report.title}</td>
                  <td>{report.report_type}</td>
                  <td>
                    <span
                      className={`badge badge-priority badge-priority-${(
                        report.priority || ""
                      ).toLowerCase()}`}
                    >
                      {report.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-status badge-status-${(
                        report.status || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td>{report.location}</td>
                  <td>{formatDate(report.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-view-report"
                      onClick={() => onView && onView(report)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing page {currentPage} of {totalPages} (
              {pagination.total || reports.length} total)
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-page-prev"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-page-next"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentList;
