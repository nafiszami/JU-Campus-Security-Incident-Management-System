import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { scheduleService } from "../../services/scheduleService";
import api from "../../services/api";

const SHIFTS = ["Morning", "Day", "Night"];

const INITIAL_FORM_STATE = {
  guard_id: "",
  checkpoint_id: "",
  date: new Date().toISOString().split("T")[0],
  shift: "Morning",
  notes: "",
};

/**
 * Form that lets a Security Officer assign a guard to a checkpoint,
 * date, and shift. Loads active checkpoints and active guards on mount,
 * then submits the assignment via scheduleService.assignGuard.
 *
 * @param {object} props - Component props.
 * @param {Function} [props.onAssigned] - Callback invoked with the created
 *   schedule record after a successful assignment.
 * @returns {JSX.Element} The rendered schedule assignment form.
 */
const ScheduleForm = ({ onAssigned }) => {
  const [checkpoints, setCheckpoints] = useState([]);
  const [guards, setGuards] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /**
   * Loads active checkpoints and active guards used to populate the
   * form's select inputs.
   *
   * @returns {Promise<void>} Resolves once both lists have been fetched.
   */
  const loadOptions = useCallback(async () => {
    try {
      const [checkpointList, guardResponse] = await Promise.all([
        scheduleService.getCheckpoints(true),
        api.get("/users", { params: { role: "Guard", is_active: true } }),
      ]);
      setCheckpoints(checkpointList);
      setGuards(guardResponse.data);
    } catch (err) {
      setError("Failed to load checkpoints or guards.");
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  /**
   * Updates local form state as the user edits an input.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>} event
   *   The change event fired by the edited field.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Validates the form and submits the guard assignment to the API.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submit event.
   * @returns {Promise<void>} Resolves once the submission attempt completes.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.guard_id || !form.checkpoint_id || !form.date || !form.shift) {
      setError("Guard, checkpoint, date, and shift are all required.");
      return;
    }

    setLoading(true);
    try {
      const created = await scheduleService.assignGuard(form);
      setSuccess("Guard assigned successfully.");
      setForm((prev) => ({ ...prev, notes: "" }));
      if (onAssigned) {
        onAssigned(created);
      }
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to assign guard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Assign Guard Duty</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="guard_id">Guard</label>
        <select
          id="guard_id"
          name="guard_id"
          value={form.guard_id}
          onChange={handleChange}
          required
        >
          <option value="">Select a guard</option>
          {guards.map((guard) => (
            <option key={guard.id} value={guard.id}>
              {guard.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="checkpoint_id">Checkpoint</label>
        <select
          id="checkpoint_id"
          name="checkpoint_id"
          value={form.checkpoint_id}
          onChange={handleChange}
          required
        >
          <option value="">Select a checkpoint</option>
          {checkpoints.map((checkpoint) => (
            <option key={checkpoint.id} value={checkpoint.id}>
              {`${checkpoint.name} (${checkpoint.location})`}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="date">Date</label>
        <input
          type="date"
          id="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="shift">Shift</label>
        <select
          id="shift"
          name="shift"
          value={form.shift}
          onChange={handleChange}
          required
        >
          {SHIFTS.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Assigning..." : "Assign Guard"}
      </button>
    </form>
  );
};

ScheduleForm.propTypes = {
  onAssigned: PropTypes.func,
};

ScheduleForm.defaultProps = {
  onAssigned: undefined,
};

export default ScheduleForm;
