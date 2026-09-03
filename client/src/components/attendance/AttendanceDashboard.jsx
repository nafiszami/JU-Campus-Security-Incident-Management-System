import { useState, useEffect, useCallback } from "react";
import { getDailySummary } from "../../services/attendanceService";
/**
 * AttendanceDashboard component — Security Officer view of daily guard attendance.
 *
 * @returns {JSX.Element}
 */
const AttendanceDashboard = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState(null);
  const [detailed, setDetailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /**
   * Load attendance data for the selected date.
   *
   * @returns {Promise<void>}
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDailySummary(date);
      setSummary(res.summary || res);
      setDetailed(res.detailed || []);
    } catch {
      setError("Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  return (
    <div className="attendance-dashboard">
      <div className="dashboard-header">
        <h2>Guard Attendance — {date}</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          ⚠ {error}
        </div>
      )}
      {loading && <div className="loading-spinner">Loading…</div>}
      {!loading && summary && (
        <>
          {/* Summary Cards */}
          <div className="stat-cards">
            <div className="stat-card stat-total">
              <span className="stat-value">{summary.total_scheduled || 0}</span>
              <span className="stat-label">Total Scheduled</span>
            </div>
            <div className="stat-card stat-present">
              <span className="stat-value">{summary.present || 0}</span>
              <span className="stat-label">Present</span>
            </div>
            <div className="stat-card stat-late">
              <span className="stat-value">{summary.late || 0}</span>
              <span className="stat-label">Late</span>
            </div>
            <div className="stat-card stat-absent">
              <span className="stat-value">{summary.absent || 0}</span>
              <span className="stat-label">Absent</span>
            </div>
          </div>
          {/* Detailed Table */}
          {detailed.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Guard</th>
                  <th>Shift</th>
                  <th>Checkpoint</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detailed.map((row) => (
                  <tr key={row.id}>
                    <td>{row.guard_name}</td>
                    <td>{row.shift}</td>
                    <td>{row.checkpoint_name}</td>
                    <td>{row.attendance?.check_in_time || "—"}</td>
                    <td>{row.attendance?.check_out_time || "—"}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          row.attendance?.status === "Present"
                            ? "green"
                            : row.attendance?.status === "Late"
                              ? "yellow"
                              : row.attendance?.status === "Absent"
                                ? "red"
                                : "grey"
                        }`}
                      >
                        {row.attendance?.status || "Not Checked In"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};
export default AttendanceDashboard;
