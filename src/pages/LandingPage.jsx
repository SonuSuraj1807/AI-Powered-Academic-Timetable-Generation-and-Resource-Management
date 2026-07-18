/**
 * LandingPage — Triple-Portal Authentication Gateway
 * 
 * Replicates the exact layout from the 3rd reference image:
 * - Full screen college entrance background image clearly visible with a balanced overlay
 * - Center-aligned horizontal array of three white login cards
 * - Fully responsive: wraps on tablet and mobile viewports
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';
import useAuthStore from '../stores/authStore';

const ROLE_ROUTES = {
  admin: '/admin',
  faculty: '/faculty',
  student: '/student',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role, initialized } = useAuthStore();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (initialized && user && role) {
      navigate(ROLE_ROUTES[role] || '/', { replace: true });
    }
  }, [initialized, user, role, navigate]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#090d1f',
    }}>
      {/* Background Canvas (Banner is clearly visible) */}
      <div 
        className="landing-bg"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('/college-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />
      
      {/* Adjusted Overlay (Lighter to show the building clearly) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        zIndex: 1,
      }} />

      {/* Center-aligned Cards Container (Fully responsive on Mobile & Desktop) */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '1200px',
        padding: '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Horizontal Card Array wrapping on smaller viewports */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '24px',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Admin Card */}
          <div style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'center' }}>
            <LoginCard
              role="admin"
              title="Admin Login"
            />
          </div>

          {/* Faculty Card */}
          <div style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'center' }}>
            <LoginCard
              role="faculty"
              title="Faculty Login"
            />
          </div>

          {/* Student Card */}
          <div style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'center' }}>
            <LoginCard
              role="student"
              title="Student Login"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
