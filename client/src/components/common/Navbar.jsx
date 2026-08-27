import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';

/**
 * Navigation bar with role-based menu
 * @returns {JSX.Element} Navbar
 */
export function Navbar() {
  const { user, logout } = useAuth();
  const role = useRole(user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">JU CSIMS</Link>
      </div>
      <div className="navbar-menu">
        {user && (
          <>
            <span className="navbar-user">
              {user.name} ({user.role})
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}