import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Home page component
 * @returns {JSX.Element} Home page
 */
export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>JU Campus Security & Incident Management System</h1>
        <p>Secure. Efficient. Transparent.</p>
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        ) : (
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}