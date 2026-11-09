import React, { useState, useEffect, useCallback } from 'react';
import { vehicleService } from '../../services/vehicleService';

const VehicleEntryExitScreen = () => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'register' | 'history'
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State for Entry Registration
  const [formData, setFormData] = useState({
    plate_number: '',
    vehicle_type: 'Car',
    category: 'Visitor',
    driver_name: '',
    driver_phone: '',
    driver_identity: '',
    purpose: '',
    host_or_destination: '',
    entry_gate: 'Main Gate',
    is_emergency: false,
    remarks: '',
  });

  // Real-time plate check status
  const [plateCheck, setPlateCheck] = useState(null);
  const [checkingPlate, setCheckingPlate] = useState(false);

  // History Filter State
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  // Load Active Vehicles
  const loadActiveVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getActive();
      setActiveVehicles(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load active vehicles.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load History
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const activeParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const data = await vehicleService.getHistory(activeParams);
      setHistory(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vehicle history.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setError('');
    setSuccessMsg('');
    if (activeTab === 'active') {
      loadActiveVehicles();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadActiveVehicles, loadHistory]);

  // Check plate restriction on blur or plate change
  const handlePlateBlur = async () => {
    const plate = formData.plate_number.trim();
    if (!plate || plate.length < 3) return;

    setCheckingPlate(true);
    try {
      const res = await vehicleService.checkRestricted(plate);
      if (res.restricted) {
        setPlateCheck({
          restricted: true,
          reason: res.reason,
        });
        setError(`ALERT: Vehicle plate "${plate}" is blacklisted/restricted: ${res.reason}`);
      } else {
        setPlateCheck({ restricted: false });
      }
    } catch (e) {
      // Ignore network errors on check
    } finally {
      setCheckingPlate(false);
    }
  };

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'plate_number') {
      setPlateCheck(null);
      setError('');
    }
  };

  // Submit Vehicle Entry
  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (plateCheck && plateCheck.restricted) {
      setError('Cannot register entry: This vehicle is blacklisted from campus entry!');
      return;
    }

    setLoading(true);
    try {
      const res = await vehicleService.registerEntry(formData);
      setSuccessMsg(`Vehicle ${res.vehicle.plate_number} entered successfully! Pass: ${res.vehicle.pass_number}`);
      setFormData({
        plate_number: '',
        vehicle_type: 'Car',
        category: 'Visitor',
        driver_name: '',
        driver_phone: '',
        driver_identity: '',
        purpose: '',
        host_or_destination: '',
        entry_gate: 'Main Gate',
        is_emergency: false,
        remarks: '',
      });
      setPlateCheck(null);
      setActiveTab('active');
      loadActiveVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record vehicle entry.');
    } finally {
      setLoading(false);
    }
  };

  // Record Vehicle Exit
  const handleRecordExit = async (vehicleId, plateNumber) => {
    if (!window.confirm(`Confirm vehicle exit for plate ${plateNumber}?`)) return;

    setActionLoading(vehicleId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await vehicleService.processExit(vehicleId, {
        exit_gate: 'Main Gate',
      });
      setSuccessMsg(`Exit recorded for ${plateNumber}! Duration: ${res.vehicle.duration_minutes || 0} minutes.`);
      loadActiveVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record vehicle exit.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ borderBottom: '2px solid #0056b3', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: '#003366', margin: 0 }}>🚗 Vehicle Entry and Exit Management</h2>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>
          Jahangirnagar University Campus Security &mdash; Vehicle Movement Monitoring (Feature 8)
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 18px',
            backgroundColor: activeTab === 'active' ? '#0056b3' : '#e9ecef',
            color: activeTab === 'active' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🚘 Vehicles Inside Campus ({activeVehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('register')}
          style={{
            padding: '10px 18px',
            backgroundColor: activeTab === 'register' ? '#0056b3' : '#e9ecef',
            color: activeTab === 'register' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ➕ Register Vehicle Entry
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 18px',
            backgroundColor: activeTab === 'history' ? '#0056b3' : '#e9ecef',
            color: activeTab === 'history' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          📋 Movement History
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ffcdd2' }}>
          <strong>Error: </strong> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '5px', marginBottom: '15px', border: '1px solid #c8e6c9' }}>
          <strong>Success: </strong> {successMsg}
        </div>
      )}

      {/* TAB 1: VEHICLES INSIDE */}
      {activeTab === 'active' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3>Currently Inside Campus</h3>
            <button onClick={loadActiveVehicles} style={{ padding: '6px 12px', cursor: 'pointer' }}>🔄 Refresh</button>
          </div>

          {loading ? (
            <p>Loading active vehicles...</p>
          ) : activeVehicles.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: '#f8f9fa', borderRadius: '6px', color: '#666' }}>
              No vehicles currently logged inside the campus.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Pass #</th>
                  <th style={{ padding: '10px' }}>Plate Number</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Driver</th>
                  <th style={{ padding: '10px' }}>Destination</th>
                  <th style={{ padding: '10px' }}>Entry Time</th>
                  <th style={{ padding: '10px' }}>Gate</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeVehicles.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0', background: v.is_emergency ? '#fff7ed' : '#fff' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#0369a1' }}>{v.pass_number}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>
                      {v.plate_number} {v.is_emergency ? '🚨' : ''}
                    </td>
                    <td style={{ padding: '10px' }}>{v.vehicle_type}</td>
                    <td style={{ padding: '10px' }}>{v.category}</td>
                    <td style={{ padding: '10px' }}>
                      {v.driver_name} <br />
                      <small style={{ color: '#666' }}>{v.driver_phone}</small>
                    </td>
                    <td style={{ padding: '10px' }}>{v.host_or_destination || 'N/A'}</td>
                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                      {new Date(v.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px' }}>{v.entry_gate}</td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => handleRecordExit(v.id, v.plate_number)}
                        disabled={actionLoading === v.id}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {actionLoading === v.id ? 'Recording...' : 'Record Exit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER ENTRY */}
      {activeTab === 'register' && (
        <form onSubmit={handleSubmitEntry} style={{ background: '#fff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b' }}>Register New Vehicle Entry</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Plate Number *</label>
              <input
                type="text"
                name="plate_number"
                value={formData.plate_number}
                onChange={handleInputChange}
                onBlur={handlePlateBlur}
                placeholder="e.g. DHA-GA-1122"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: plateCheck?.restricted ? '2px solid #ef4444' : '1px solid #cbd5e1',
                }}
              />
              {checkingPlate && <small style={{ color: '#64748b' }}>Checking restricted list...</small>}
              {plateCheck?.restricted && (
                <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '4px', fontSize: '0.85rem' }}>
                  🚫 Blacklisted Plate: {plateCheck.reason}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vehicle Type *</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="Car">Car / Sedan</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Microbus">Microbus</option>
                <option value="Truck">Truck / Pickup</option>
                <option value="Official">University / Govt Official</option>
                <option value="Emergency">Ambulance / Fire / Police</option>
                <option value="Delivery">Delivery / Courier</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Entrant Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="Visitor">Visitor (Private)</option>
                <option value="Student">Student Vehicle</option>
                <option value="Faculty/Staff">Faculty / Staff Vehicle</option>
                <option value="Official">Government / Official Vehicle</option>
                <option value="Delivery/Service">Delivery / Contractor / Service</option>
                <option value="Emergency">Emergency Service</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Driver Full Name *</label>
              <input
                type="text"
                name="driver_name"
                value={formData.driver_name}
                onChange={handleInputChange}
                placeholder="Full name of driver"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Driver Contact Phone *</label>
              <input
                type="text"
                name="driver_phone"
                value={formData.driver_phone}
                onChange={handleInputChange}
                placeholder="e.g. 017xxxxxxxx"
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Driver NID / Student ID</label>
              <input
                type="text"
                name="driver_identity"
                value={formData.driver_identity}
                onChange={handleInputChange}
                placeholder="Identity document number"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Destination / Host Building</label>
              <input
                type="text"
                name="host_or_destination"
                value={formData.host_or_destination}
                onChange={handleInputChange}
                placeholder="e.g. Central Library, Science Faculty"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Entry Checkpoint Gate *</label>
              <select
                name="entry_gate"
                value={formData.entry_gate}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="Main Gate">Main Gate</option>
                <option value="Science Faculty Gate">Science Faculty Gate</option>
                <option value="Arts Faculty Gate">Arts Faculty Gate</option>
                <option value="Admin Building">Admin Building</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Purpose of Visit</label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="e.g. Parcel Delivery, Official Meeting, Guest Visit"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_emergency"
              name="is_emergency"
              checked={formData.is_emergency}
              onChange={handleInputChange}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="is_emergency" style={{ fontWeight: 'bold', color: '#c2410c' }}>
              🚨 Emergency Vehicle (Immediate access priority)
            </label>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="submit"
              disabled={loading || (plateCheck && plateCheck.restricted)}
              style={{
                padding: '10px 24px',
                backgroundColor: plateCheck?.restricted ? '#94a3b8' : '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: plateCheck?.restricted ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Recording Entry...' : 'Grant Vehicle Entry & Issue Pass'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MOVEMENT HISTORY */}
      {activeTab === 'history' && (
        <div>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search plate or driver..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Categories</option>
              <option value="Visitor">Visitor</option>
              <option value="Student">Student</option>
              <option value="Faculty/Staff">Faculty/Staff</option>
              <option value="Official">Official</option>
              <option value="Emergency">Emergency</option>
            </select>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <button
              onClick={loadHistory}
              style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Apply Filter
            </button>
          </div>

          {loading ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p>No vehicle movement records match the filter criteria.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Pass #</th>
                  <th style={{ padding: '10px' }}>Plate Number</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Driver</th>
                  <th style={{ padding: '10px' }}>Entry Time & Gate</th>
                  <th style={{ padding: '10px' }}>Exit Time & Gate</th>
                  <th style={{ padding: '10px' }}>Duration</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{h.pass_number}</td>
                    <td style={{ padding: '10px' }}>{h.plate_number}</td>
                    <td style={{ padding: '10px' }}>{h.category}</td>
                    <td style={{ padding: '10px' }}>{h.driver_name}</td>
                    <td style={{ padding: '10px' }}>
                      {new Date(h.entry_time).toLocaleString()} <br />
                      <small style={{ color: '#64748b' }}>Gate: {h.entry_gate}</small>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {h.exit_time ? new Date(h.exit_time).toLocaleString() : '—'} <br />
                      {h.exit_gate && <small style={{ color: '#64748b' }}>Gate: {h.exit_gate}</small>}
                    </td>
                    <td style={{ padding: '10px' }}>{h.duration_minutes ? `${h.duration_minutes}m` : '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          backgroundColor: h.status === 'Inside' ? '#dcfce7' : '#f1f5f9',
                          color: h.status === 'Inside' ? '#166534' : '#475569',
                        }}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleEntryExitScreen;
