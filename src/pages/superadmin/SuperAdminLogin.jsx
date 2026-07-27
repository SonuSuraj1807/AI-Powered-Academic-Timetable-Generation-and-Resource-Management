import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Shield, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email.trim(), password, 'superadmin');
    if (success) {
      navigate('/superadmin');
    } else {
      setError(useAuthStore.getState().error || 'Super Admin authentication failed.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%)',
      padding: '20px',
    }}>
      <div className="animate-fade-in-scale" style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#8B5CF6',
          }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
            Super Admin Console
          </h2>
          <p style={{ fontSize: '0.813rem', color: '#94a3b8', marginTop: '6px' }}>
            Restricted Access • Institutional Governance Gateway
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Super Admin Email
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="superadmin@vbit.ac.in"
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Governance Passcode
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              marginTop: '8px',
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              border: 'none',
              fontWeight: 700,
            }}
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Lock size={18} />}
            {loading ? 'Authenticating Super Admin...' : 'Authenticate & Unlock Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
