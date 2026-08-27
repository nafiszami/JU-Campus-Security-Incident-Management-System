import { useState, useEffect, useCallback } from "react";
import { scheduleService } from "../../services/scheduleService";

const SHIFTS = ["Morning", "Day", "Night"];

/**
 * Displays today's checkpoint-by-shift coverage roster and highlights
 * any unassigned slots so a Security Officer can act on them.
 *
 * @returns {JSX.Element} The rendered daily roster table.
 */
const DailyRoster = () => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetches today's roster from the API and updates component state.
   *
   * @returns {Promise<void>} Resolves once the roster has been loaded.
   */
  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await scheduleService.getTodayRoster();
      setRoster(data);
    } catch (err) {
      setError("Failed to load today's roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  if (loading) {
    return <div className="loading-spinner">Loading roster...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (roster.length === 0) {
    return <div className="empty-state">No active checkpoints found.</div>;
  }

  return (
    <div className="daily-roster">
      <div className="roster-header">
        <h2>Today&apos;s Guard Roster</h2>
        <button type="button" onClick={loadRoster}>
          Refresh
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Checkpoint</th>
            <th>Location</th>
            {SHIFTS.map((shift) => (
              <th key={shift}>{shift}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((row) => (
            <tr key={row.checkpoint_id}>
              <td>{row.checkpoint_name}</td>
              <td>{row.location}</td>
              {SHIFTS.map((shift) => {
                const coverage = row.coverage[shift];
                return (
                  <td
                    key={shift}
                    className={coverage.assigned ? "covered" : "unassigned"}
                  >
                    {coverage.assigned ? coverage.guard : "Unassigned"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DailyRoster;
