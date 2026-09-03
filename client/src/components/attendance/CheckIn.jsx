import { useState, useEffect, useCallback } from "react";
import attendanceService, {
  checkIn,
  checkOut,
} from "../../services/attendanceService";
import { scheduleService } from "../../services/scheduleService";
/**
 * CheckIn component — allows Guards to check in/out of their assigned shift.
 *
 * @param {Object} props
 * @param {number} props.guardId - Current guard's user ID.
 * @returns {JSX.Element}
 */
const CheckIn = ({ guardId }) => {
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  /**
   * Load today's schedules for this guard.
   *
   * @returns {Promise<void>}
   */
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const allSchedules = await scheduleService.getByDate(today);

      // Fetch attendance history to populate the attendance field on each schedule
      const history = await attendanceService.getGuardHistory(guardId, {
        date: today,
      });

      const schedulesWithAttendance = allSchedules.map((s) => {
        const attendance = history.find((h) => h.schedule_id === s.id);
        return { ...s, attendance };
      });

      setTodaySchedules(
        schedulesWithAttendance.filter((s) => s.guard_id === guardId),
      );
    } catch {
      setError("Failed to load today's schedule.");
    } finally {
      setLoading(false);
    }
  }, [guardId]);
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);
  /**
   * Handle check-in button click.
   *
   * @param {number} scheduleId
   * @returns {Promise<void>}
   */
  const handleCheckIn = async (scheduleId) => {
    setActionLoading(scheduleId);
    setError("");
    setSuccessMsg("");
    try {
      const res = await checkIn(scheduleId);
      setSuccessMsg(`✓ Checked in — Status: ${res.attendance.status}`);
      loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || "Check-in failed.");
    } finally {
      setActionLoading(null);
    }
  };
  /**
   * Handle check-out button click.
   *
   * @param {number} scheduleId
   * @returns {Promise<void>}
   */
  const handleCheckOut = async (scheduleId) => {
    setActionLoading(scheduleId);
    setError("");
    setSuccessMsg("");
    try {
      const res = await checkOut(scheduleId);
      setSuccessMsg(`✓ Checked out at ${res.attendance.check_out_time}`);
      loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || "Check-out failed.");
    } finally {
      setActionLoading(null);
    }
  };
  if (loading) return <div className="loading-spinner">Loading schedule…</div>;
  return (
    <div className="checkin-container">
      <h2>My Today&apos;s Shifts</h2>
      <p className="date-label">{new Date().toDateString()}</p>
      {error && (
        <div className="alert alert-error" role="alert">
          ⚠ {error}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" role="status">
          {successMsg}
        </div>
      )}
      {todaySchedules.length === 0 && (
        <div className="empty-state">
          You have no shifts scheduled for today.
        </div>
      )}
      <div className="shift-cards">
        {todaySchedules.map((schedule) => (
          <div key={schedule.id} className="shift-card">
            <div className="shift-info">
              <h3>{schedule.shift} Shift</h3>
              <p>
                {schedule.checkpoint_name} — {schedule.checkpoint_location}
              </p>
              <p className="shift-time">
                {schedule.shift_start} → {schedule.shift_end}
              </p>
            </div>
            <div className="shift-actions">
              {!schedule.attendance?.check_in_time && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCheckIn(schedule.id)}
                  disabled={actionLoading === schedule.id}
                >
                  {actionLoading === schedule.id ? "…" : "Check In"}
                </button>
              )}
              {schedule.attendance?.check_in_time &&
                !schedule.attendance?.check_out_time && (
                  <>
                    <span className="badge badge-green">
                      In at {schedule.attendance.check_in_time} (
                      {schedule.attendance.status})
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCheckOut(schedule.id)}
                      disabled={actionLoading === schedule.id}
                    >
                      {actionLoading === schedule.id ? "…" : "Check Out"}
                    </button>
                  </>
                )}
              {schedule.attendance?.check_out_time && (
                <span className="badge badge-grey">
                  Completed — Out at {schedule.attendance.check_out_time}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CheckIn;
