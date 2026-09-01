import { useState, useEffect } from 'react';
import { visitorService } from '../../services/visitorService';
import VisitorPass from './VisitorPass';

/**
 * Visitor Registration Component
 * Allows Gate Operators to register visitors with dynamic forms
 * @returns {JSX.Element} Registration form
 */
const VisitorRegistration = () => {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [restrictedCheck, setRestrictedCheck] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [registeredVisitor, setRegisteredVisitor] = useState(null);

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    identity_number: '',
    phone: '',
    purpose: '',
    host_name: '',
    host_department: '',
    student_name: '',
    student_hall: '',
    company_name: '',
    project_code: '',
    work_site: '',
    vehicle_plate: '',
    event_name: '',
    event_pass: '',
  });

  const [selectedCategoryConfig, setSelectedCategoryConfig] = useState(null);

  /**
   * Load categories on component mount
   */
  useEffect(() => {
    loadCategories();
  }, []);

  /**
   * Fetch category configurations from API
   */
  const loadCategories = async () => {
    try {
      const data = await visitorService.getCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  /**
   * Handle category selection change
   * @param {Event} e - Change event
   */
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData((prev) => ({ ...prev, category }));

    // Find category config
    const config = categories[category];
    setSelectedCategoryConfig(config || null);

    // Reset restricted check
    setRestrictedCheck(null);
    setError('');
  };

  /**
   * Handle form field changes
   * @param {Event} e - Change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Check restricted when identity number changes (minimum 6 chars)
    if (name === 'identity_number' && value.length >= 6) {
      checkRestricted(value);
    }
  };

  /**
   * Check if identity is restricted
   * @param {string} identityNumber - Identity number to check
   */
  const checkRestricted = async (identityNumber) => {
    try {
      const result = await visitorService.checkRestricted(identityNumber);
      setRestrictedCheck(result);
      if (result.restricted) {
        setError(`⚠️ This visitor is restricted: ${result.reason}`);
      } else {
        setError('');
      }
    } catch (err) {
      // Ignore errors
    }
  };

  /**
   * Get required fields for selected category
   * @returns {Array} List of required field names
   */
  const getRequiredFields = () => {
    return selectedCategoryConfig?.required || [];
  };

  /**
   * Get all fields for selected category
   * @returns {Array} List of field names
   */
  const getFields = () => {
    return selectedCategoryConfig?.fields || [];
  };

  /**
   * Get display label for field
   * @param {string} field - Field name
   * @returns {string} Display label
   */
  const getFieldLabel = (field) => {
    const labels = {
      name: 'Full Name',
      identity_number: 'Identity Number (NID)',
      phone: 'Phone Number',
      purpose: 'Purpose of Visit',
      host_name: 'Host Name',
      host_department: 'Host Department',
      student_name: 'Student Name',
      student_hall: 'Student Hall',
      company_name: 'Company Name',
      project_code: 'Project Code',
      work_site: 'Work Site Location',
      vehicle_plate: 'Vehicle Plate Number',
      event_name: 'Event Name',
      event_pass: 'Event Pass Number',
    };
    return labels[field] || field.replace('_', ' ');
  };

  /**
   * Get placeholder for field
   * @param {string} field - Field name
   * @returns {string} Placeholder text
   */
  const getFieldPlaceholder = (field) => {
    const placeholders = {
      name: 'Enter visitor\'s full name',
      identity_number: 'e.g., 1234567890',
      phone: 'e.g., 01712345678',
      purpose: 'Why is the visitor coming?',
      host_name: 'Name of student/faculty being visited',
      host_department: 'e.g., Computer Science',
      student_name: 'Student being visited',
      student_hall: 'e.g., BRH, SNR',
      company_name: 'Company or organization name',
      project_code: 'Project/Work code',
      work_site: 'Location of work site',
      vehicle_plate: 'e.g., DHA-1234',
      event_name: 'Name of the event',
      event_pass: 'Event pass/ID number',
    };
    return placeholders[field] || '';
  };

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);
    setShowPass(false);

    // Check restricted
    if (restrictedCheck?.restricted) {
      setError(`❌ Visitor is restricted: ${restrictedCheck.reason}`);
      setLoading(false);
      return;
    }

    // Check required fields
    const required = getRequiredFields();
    for (const field of required) {
      if (!formData[field]) {
        setError(`${getFieldLabel(field)} is required`);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await visitorService.register(formData);
      setSuccess(result);
      setRegisteredVisitor(result.visitor);
      setShowPass(true);

      // Reset form
      setFormData({
        category: '',
        name: '',
        identity_number: '',
        phone: '',
        purpose: '',
        host_name: '',
        host_department: '',
        student_name: '',
        student_hall: '',
        company_name: '',
        project_code: '',
        work_site: '',
        vehicle_plate: '',
        event_name: '',
        event_pass: '',
      });
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed');
      } finally {
        setLoading(false);
      }
    };

    /**
     * Process Entry immediately
     */
    const [entryLoading, setEntryLoading] = useState(false);
    const [entrySuccess, setEntrySuccess] = useState(false);

    const handleEntryNow = async () => {
      if (!success?.visitor?.id) return;
      setEntryLoading(true);
      try {
        await visitorService.processEntry(success.visitor.id);
        setEntrySuccess(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to process entry');
      } finally {
        setEntryLoading(false);
      }
    };

    /**
     * Reset form
     */
  const resetForm = () => {
    setFormData({
      category: '',
      name: '',
      identity_number: '',
      phone: '',
      purpose: '',
      host_name: '',
      host_department: '',
      student_name: '',
      student_hall: '',
      company_name: '',
      project_code: '',
      work_site: '',
      vehicle_plate: '',
      event_name: '',
      event_pass: '',
    });
    setSelectedCategoryConfig(null);
    setRestrictedCheck(null);
    setError('');
    setSuccess(null);
    setShowPass(false);
    setRegisteredVisitor(null);
  };

  // If restricted, show alert
  if (restrictedCheck?.restricted && !success) {
    return (
      <div className="visitor-registration">
        <div className="restricted-alert">
          <h3>🚫 Restricted Visitor</h3>
          <p><strong>Name:</strong> {restrictedCheck.name}</p>
          <p><strong>Reason:</strong> {restrictedCheck.reason}</p>
          <p><strong>Type:</strong> {restrictedCheck.restriction_type}</p>
          <button onClick={() => setRestrictedCheck(null)} className="btn-secondary">
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-registration">
      <h2>📋 Register Visitor</h2>

      {error && <div className="error-message">{error}</div>}

      {success && showPass && (
        <div className="success-message">
          <p>✅ Visitor registered successfully!</p>
          <p><strong>Visitor ID:</strong> {success.visitor?.visitor_id}</p>
          <p><strong>Valid Until:</strong> {new Date(success.pass?.valid_until).toLocaleString()}</p>
          <div className="success-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            {!entrySuccess ? (
              <button 
                onClick={handleEntryNow} 
                disabled={entryLoading}
                style={{ background: '#28a745', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {entryLoading ? 'Processing...' : 'Allow Entry Now'}
              </button>
            ) : (
              <span style={{ padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                Entry Recorded!
              </span>
            )}
            <button onClick={resetForm} className="btn-secondary" style={{ padding: '10px 15px' }}>
              Register Another
            </button>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit}>
          {/* Category Selection */}
          <div className="form-group">
            <label>Visitor Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              required
            >
              <option value="">Select category</option>
              {Object.keys(categories).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {selectedCategoryConfig && (
            <>
              {/* Dynamic Fields */}
              {getFields().map((field) => {
                const isRequired = getRequiredFields().includes(field);
                return (
                  <div className="form-group" key={field}>
                    <label>
                      {getFieldLabel(field)}
                      {isRequired && ' *'}
                    </label>
                    {field === 'purpose' || field === 'remarks' ? (
                      <textarea
                        name={field}
                        value={formData[field] || ''}
                        onChange={handleChange}
                        placeholder={getFieldPlaceholder(field)}
                        rows="2"
                      />
                    ) : (
                      <input
                        type="text"
                        name={field}
                        value={formData[field] || ''}
                        onChange={handleChange}
                        placeholder={getFieldPlaceholder(field)}
                        required={isRequired}
                      />
                    )}
                  </div>
                );
              })}

              <button type="submit" disabled={loading}>
                {loading ? 'Registering...' : 'Register Visitor'}
              </button>
            </>
          )}
        </form>
      )}

      {/* Pass Display */}
      {success && showPass && (
        <div className="pass-container">
          <VisitorPass visitor={success.visitor} pass={success.pass} />
          <button onClick={() => window.print()} className="btn-print">
            🖨️ Print Pass
          </button>
        </div>
      )}
    </div>
  );
};

export default VisitorRegistration;