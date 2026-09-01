import { useState } from 'react';
import { visitorService } from '../../services/visitorService';

/**
 * Visitor Search Component
 * Allows searching for visitors by various fields
 * @param {Object} props - Component props
 * @param {Function} props.onSelect - Callback when visitor is selected
 * @param {Function} props.onView - Callback when view is clicked
 * @returns {JSX.Element} Search component
 */
const VisitorSearch = ({ onSelect, onView }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle search
   */
  const handleSearch = async () => {
    if (query.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await visitorService.search(query);
      setResults(data);
      if (data.length === 0) {
        setError('No visitors found');
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle enter key press
   * @param {Event} e - Key event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /**
   * Get status badge class
   * @param {string} status - Visitor status
   * @returns {string} CSS class
   */
  const getStatusClass = (status) => {
    const classes = {
      Registered: 'status-registered',
      Inside: 'status-inside',
      Exited: 'status-exited',
    };
    return classes[status] || '';
  };

  return (
    <div className="visitor-search">
      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search by Visitor ID, Name, NID, Phone, or Host Name"
          className="search-input"
        />
        <button onClick={handleSearch} disabled={loading} className="search-btn">
          {loading ? '⏳' : '🔍 Search'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {results.length > 0 && (
        <div className="search-results">
          <table>
            <thead>
              <tr>
                <th>Visitor ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Host</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((visitor) => (
                <tr key={visitor.id}>
                  <td><strong>{visitor.visitor_id}</strong></td>
                  <td>{visitor.name}</td>
                  <td>{visitor.category}</td>
                  <td>{visitor.host_name || '—'}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(visitor.status)}`}>
                      {visitor.status}
                    </span>
                  </td>
                  <td>
                    {visitor.pass_valid_until
                      ? new Date(visitor.pass_valid_until).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => onView && onView(visitor)}
                      className="btn-view"
                      title="View Details"
                    >
                      👁️ View
                    </button>
                    {visitor.status === 'Registered' && (
                      <button
                        onClick={() => onSelect && onSelect(visitor, 'entry')}
                        className="btn-entry"
                        title="Process Entry"
                      >
                        🚪 Entry
                      </button>
                    )}
                    {visitor.status === 'Inside' && (
                      <button
                        onClick={() => onSelect && onSelect(visitor, 'exit')}
                        className="btn-exit"
                        title="Process Exit"
                      >
                        🚶 Exit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !error && query.length >= 2 && (
        <div className="empty-state">
          <p>No visitors found matching "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default VisitorSearch;