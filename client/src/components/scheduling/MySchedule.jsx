import { useState, useEffect, useCallback } from "react";
import { scheduleService } from "../../services/scheduleService";
import { useAuth } from "../../hooks/useAuth";

/**
 * Shows the logged-in guard's duty assignment for today plus their
 * upcoming schedule. Displays a fallback message when no duty is
 * assigned for the current day.
 *
 * @returns {JSX.Element} The rendered "my schedule" view.
 */
const MySchedule = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetches the current guard's schedule entries from the API.
   *
   * @returns {Promise<void>} Resolves once the schedule has been loaded.
   */
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await scheduleService.getGuardSchedules("me");
      setSchedules(data);
    } catch (err) {
      setError("Failed to load your schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  if (loading) {
    return <div className="loading-spinner">Loading your schedule...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const today = new Date().toISOString().split("T")[0];
  const todaySchedule = schedules.find((schedule) => schedule.date === today);
  const upcoming = schedules.filter((schedule) => schedule.date >= today);

  return (
    <div className="my-schedule">
      <h2>{`My Schedule${user?.name ? ` — ${user.name}` : ""}`}</h2>

      <div className="today-duty">
        <h3>Today</h3>
        {todaySchedule ? (
          <p>
            <strong>{todaySchedule.checkpoint_name}</strong>
            {` (${todaySchedule.checkpoint_location}) — ${todaySchedule.shift} shift`}
          </p>
        ) : (
          <p className="empty-state">No duty assigned for today</p>
        )}
      </div>

      <div className="upcoming-duty">
        <h3>Upcoming Assignments</h3>
        {upcoming.length === 0 ? (
          <p className="empty-state">No upcoming assignments.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Checkpoint</th>
                <th>Shift</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.date}</td>
                  <td>{`${schedule.checkpoint_name} (${schedule.checkpoint_location})`}</td>
                  <td>{schedule.shift}</td>
                  <td>{schedule.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MySchedule;
