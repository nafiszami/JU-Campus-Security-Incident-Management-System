/**
 * Visitor Pass Component
 * Displays a digital visitor pass
 * @param {Object} props - Component props
 * @param {Object} props.visitor - Visitor data
 * @param {Object} props.pass - Pass data
 * @returns {JSX.Element} Visitor pass
 */
const VisitorPass = ({ visitor, pass }) => {
  if (!visitor && !pass) return null;

  const data = visitor || pass;

  return (
    <div className="visitor-pass" id="visitor-pass">
      <div className="pass-header">
        <h2>🎫 JU CAMPUS VISITOR PASS</h2>
        <p className="pass-id"><strong>ID:</strong> {data.visitor_id}</p>
      </div>

      <div className="pass-body">
        <div className="pass-section">
          <h4>Visitor Information</h4>
          <p><strong>Name:</strong> {data.name}</p>
          <p><strong>Category:</strong> {data.category}</p>
          <p><strong>Phone:</strong> {data.phone}</p>
          <p><strong>Purpose:</strong> {data.purpose || 'N/A'}</p>
        </div>

        {data.host_name && (
          <div className="pass-section">
            <h4>Host Information</h4>
            <p><strong>Name:</strong> {data.host_name}</p>
            {data.host_department && <p><strong>Department:</strong> {data.host_department}</p>}
          </div>
        )}

        {data.student_name && (
          <div className="pass-section">
            <h4>Student Information</h4>
            <p><strong>Name:</strong> {data.student_name}</p>
            {data.student_hall && <p><strong>Hall:</strong> {data.student_hall}</p>}
          </div>
        )}

        {data.company_name && (
          <div className="pass-section">
            <h4>Organization</h4>
            <p><strong>Company:</strong> {data.company_name}</p>
          </div>
        )}

        {data.project_code && (
          <div className="pass-section">
            <h4>Project</h4>
            <p><strong>Code:</strong> {data.project_code}</p>
            {data.work_site && <p><strong>Site:</strong> {data.work_site}</p>}
          </div>
        )}

        <div className="pass-section pass-validity">
          <h4>Validity</h4>
          <p>
            <strong>Valid Until:</strong>
            <span className="validity-date">
              {new Date(data.pass_valid_until || data.valid_until).toLocaleString()}
            </span>
          </p>
          <p><strong>Status:</strong>
            <span className={`status-badge ${data.status || 'Registered'}`}>
              {data.status || 'Registered'}
            </span>
          </p>
        </div>

        <div className="pass-footer">
          <p><strong>Issued By:</strong> {data.registered_by_name || data.issued_by || 'Gate Operator'}</p>
          <p><strong>Issued At:</strong> {new Date(data.created_at || data.issued_at).toLocaleString()}</p>
          <p><strong>Gate:</strong> {data.entry_gate || data.issued_gate || 'Main Gate'}</p>
        </div>
      </div>

      <div className="pass-actions">
        <button onClick={() => window.print()} className="btn-print">
          🖨️ Print Pass
        </button>
      </div>
    </div>
  );
};

export default VisitorPass;