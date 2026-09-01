import React, { useState, useEffect, useCallback } from 'react';
import { visitorService } from '../../services/visitorService';

const VisitorEntryExit = () => {
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [historyFilters, setHistoryFilters] = useState({ date_from: '', date_to: '', category: '' });

  // User details
  const [user, setUser] = useState(null);

  // Quick Scan State
  const [scanId, setScanId] = useState('');
  const [scannedVisitor, setScannedVisitor] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u) setUser(u);
    } catch (e) {}
    
    visitorService.getCategories().then(data => {
      setCategories(data);
    }).catch(err => console.error('Failed to load categories', err));
  }, []);

  const loadActive = useCallback(async () => {
    setLoading(true);
    try {
      const data = await visitorService.getActive();
      setActiveVisitors(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load active visitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const activeParams = Object.fromEntries(
        Object.entries(historyFilters).filter(([, v]) => v !== '')
      );
      const data = await visitorService.getHistory(activeParams);
      setHistory(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, [historyFilters]);

  useEffect(() => {
    setError('');
    setSuccessMsg('');
    if (activeTab === 'active') loadActive();
    else loadHistory();
  }, [activeTab, loadActive, loadHistory]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanId.trim()) return;
    
    setScanLoading(true);
    setError('');
    setSuccessMsg('');
    setScannedVisitor(null);

    try {
      const results = await visitorService.search(scanId.trim());
      if (results.length === 0) {
        setError('Visitor not found with that ID or Phone.');
      } else {
        setScannedVisitor(results[0]);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleEntry = async (visitorId, visitorName) => {
    if (!window.confirm(`Confirm visitor entry for ${visitorName}?`)) return;
    
    setActionLoading(visitorId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await visitorService.processEntry(visitorId);
      setSuccessMsg(`Entry recorded for ${res.visitor.name}`);
      if (scannedVisitor && scannedVisitor.id === visitorId) {
        setScannedVisitor({ ...scannedVisitor, status: 'Inside' });
      }
      loadActive();
    } catch (err) {
      setError(err.response?.data?.error || 'Entry failed.');
    } finally {
      setActionLoading(null);
      setScanId('');
    }
  };

  const handleExit = async (visitorId, visitorName) => {
    if (!window.confirm(`Confirm visitor exit for ${visitorName}?`)) return;

    setActionLoading(visitorId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await visitorService.processExit(visitorId);
      setSuccessMsg(`Exit recorded for ${res.visitor.name} (${res.visitor.duration_minutes || 0} min)`);
      if (scannedVisitor && scannedVisitor.id === visitorId) {
        setScannedVisitor({ ...scannedVisitor, status: 'Exited' });
      }
      loadActive();
    } catch (err) {
      setError(err.response?.data?.error || 'Exit failed.');
    } finally {
      setActionLoading(null);
      setScanId('');
    }
  };

  const clearFilters = () => {
    setHistoryFilters({ date_from: '', date_to: '', category: '' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Campus Entry &amp; Exit Management</h2>
        <div style={{ padding: '10px 15px', background: '#e9ecef', borderRadius: '4px', fontWeight: 'bold' }}>
          Operating Gate: {user?.assigned_gate || 'Main Gate'}
        </div>
      </div>

      {/* Quick Scanner */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3>Quick Process by ID/Phone</h3>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input
            type="text"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            placeholder="Search by Visitor ID / Identity Number / Name"
            style={{ flex: 1, padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button type="submit" disabled={scanLoading} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {scanLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {scannedVisitor && (
          <div style={{ marginTop: '20px', padding: '15px', background: 'white', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h4>Visitor Verification</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <p><strong>Visitor ID:</strong> {scannedVisitor.visitor_id}</p>
              <p><strong>Name:</strong> {scannedVisitor.name}</p>
              <p><strong>Category:</strong> {scannedVisitor.category}</p>
              <p><strong>Identity:</strong> {scannedVisitor.identity_number}</p>
              <p><strong>Phone:</strong> {scannedVisitor.phone}</p>
              <p><strong>Host:</strong> {scannedVisitor.host_name || 'N/A'}</p>
              <p>
                <strong>Status:</strong> 
                <span style={{ 
                  fontWeight: 'bold', 
                  marginLeft: '5px',
                  color: scannedVisitor.status === 'Inside' ? 'blue' : scannedVisitor.status === 'Registered' ? 'green' : 'gray'
                }}>
                  {scannedVisitor.status}
                </span>
              </p>
            </div>
            <div>
              {scannedVisitor.status === 'Registered' && (
                <button onClick={() => handleEntry(scannedVisitor.id, scannedVisitor.name)} disabled={actionLoading === scannedVisitor.id} style={{ background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {actionLoading === scannedVisitor.id ? 'Processing Entry...' : 'Process Entry'}
                </button>
              )}
              {scannedVisitor.status === 'Inside' && (
                <button onClick={() => handleExit(scannedVisitor.id, scannedVisitor.name)} disabled={actionLoading === scannedVisitor.id} style={{ background: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {actionLoading === scannedVisitor.id ? 'Processing Exit...' : 'Process Exit'}
                </button>
              )}
              {scannedVisitor.status === 'Exited' && (
                <p style={{ color: 'red', margin: 0 }}>This visitor has already exited.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: 'white', background: '#dc3545', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}
      {successMsg && <div style={{ color: 'white', background: '#28a745', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{successMsg}</div>}

      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{ padding: '8px 16px', background: activeTab === 'active' ? '#007bff' : '#eee', color: activeTab === 'active' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Currently Inside
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{ padding: '8px 16px', background: activeTab === 'history' ? '#007bff' : '#eee', color: activeTab === 'history' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Entry / Exit History
        </button>
      </div>

      {activeTab === 'active' && (
        <div>
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <strong>{activeVisitors.length} Visitors Inside</strong>
             <button onClick={loadActive} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
               Refresh
             </button>
          </div>
          {loading ? <p>Loading visitors...</p> : activeVisitors.length === 0 ? <p>No visitors are currently inside the campus.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Visitor ID</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Category</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Phone</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Entry Time</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Gate</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVisitors.map(v => (
                    <tr key={v.id}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.visitor_id}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.name}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.category}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.phone}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.entry_time ? new Date(v.entry_time).toLocaleTimeString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.entry_gate || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', color: 'blue', fontWeight: 'bold' }}>{v.status}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <button onClick={() => handleExit(v.id, v.name)} disabled={actionLoading === v.id} style={{ background: '#dc3545', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Process Exit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="date" value={historyFilters.date_from} onChange={e => setHistoryFilters(p => ({...p, date_from: e.target.value}))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="date" value={historyFilters.date_to} onChange={e => setHistoryFilters(p => ({...p, date_to: e.target.value}))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <select value={historyFilters.category} onChange={e => setHistoryFilters(p => ({...p, category: e.target.value}))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="">All Categories</option>
              {Object.keys(categories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button onClick={loadHistory} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply Filters</button>
            <button onClick={clearFilters} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear Filters</button>
          </div>
          {loading ? <p>Loading history...</p> : history.length === 0 ? <p>No entry/exit records found.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Visitor</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Category</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Entry Time</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Gate</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Exit Time</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(v => (
                    <tr key={v.id}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}><strong>{v.name}</strong><br/><small>{v.visitor_id}</small></td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.category}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.entry_time ? new Date(v.entry_time).toLocaleString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.entry_gate || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.exit_time ? new Date(v.exit_time).toLocaleString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.duration_minutes != null ? `${v.duration_minutes} min` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitorEntryExit;
