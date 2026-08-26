import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function useInactivityLogout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await logout();
        navigate('/login');
      }, TIMEOUT_MS);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, logout, navigate]);
}

export default useInactivityLogout;