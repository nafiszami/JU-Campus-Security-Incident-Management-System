import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import VisitorRegistration from './components/visitors/VisitorRegistration';
import VisitorSearch from './components/visitors/VisitorSearch';
import VisitorEntryExit from './components/visitors/VisitorEntryExit';
import LoginPage from './pages/LoginPage';

function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link to="/">Register</Link>
          <Link to="/search">Search</Link>
          <Link to="/entry-exit">Entry/Exit</Link>
          <div style={{ flex: 1 }}></div>
          {localStorage.getItem('token') ? (
            <button onClick={handleLogout} style={{ padding: '5px 10px', cursor: 'pointer' }}>Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
        <hr />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<VisitorRegistration />} />
          <Route path="/search" element={<VisitorSearch />} />
          <Route path="/entry-exit" element={<VisitorEntryExit />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
