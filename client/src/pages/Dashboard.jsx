import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';

/**
 * Role-based dashboard
 * @returns {JSX.Element} Dashboard
 */
export function Dashboard() {
  const { user } = useAuth();
  const role = useRole(user);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
      <p>Role: {user?.role}</p>

      <div className="dashboard-grid">
        {role.canSubmitReports && (
          <div className="dashboard-card">
            <h3>📝 Submit Report</h3>
            <p>Submit a new incident report</p>
            <Link to="/reports/new">Go</Link>
          </div>
        )}

        {role.canViewAllReports && (
          <div className="dashboard-card">
            <h3>📋 All Reports</h3>
            <p>View and filter all reports</p>
            <Link to="/reports">Go</Link>
          </div>
        )}

        {role.canManageVisitors && (
          <div className="dashboard-card">
            <h3>👤 Register Visitor</h3>
            <p>Register a new visitor</p>
            <Link to="/visitors/register">Go</Link>
          </div>
        )}

        {role.canManageRestricted && (
          <div className="dashboard-card">
            <h3>🚫 Restricted Visitors</h3>
            <p>Manage restricted visitor list</p>
            <Link to="/restricted">Go</Link>
          </div>
        )}

        {role.canScheduleGuards && (
          <div className="dashboard-card">
            <h3>👮 Guard Scheduling</h3>
            <p>Manage guard duty schedules</p>
            <Link to="/schedules">Go</Link>
          </div>
        )}

        {role.canManageUsers && (
          <div className="dashboard-card">
            <h3>👥 User Management</h3>
            <p>Manage user accounts and roles</p>
            <Link to="/users">Go</Link>
          </div>
        )}
      </div>
    </div>
  );
}