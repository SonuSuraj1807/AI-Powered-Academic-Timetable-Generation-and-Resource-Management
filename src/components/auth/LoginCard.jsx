/**
 * LoginCard — White card auth component for the triple-portal landing page.
 * 
 * Replicates the exact layout from the reference image, made more compact and mobile-responsive:
 * - VBIT Logo image centered at the top
 * - Bold centered heading (Admin/Faculty/Student Login) in blue with small descriptive tags
 * - No labels above input fields, placeholders only
 * - Solid orange-red button labeled "Login"
 */
import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function LoginCard({ role, title }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (!email.trim()) { setLocalError('Email is required'); return; }
    if (!password.trim()) { setLocalError('Password is required'); return; }

    setIsSubmitting(true);
    await login(email.trim(), password, role);
    setIsSubmitting(false);
  };

  const displayError = localError || error;

  // Placeholder texts exactly matching role
  const emailPlaceholder = role === 'student' ? 'Student Email' : role === 'admin' ? 'Admin Email' : 'Faculty Email';

  // Subtitle tags matching user request
  const tagSubtitle = role === 'admin' 
    ? 'Administrators & HODs' 
    : role === 'faculty' 
    ? 'Faculty & HODs' 
    : 'Class Reps & Student Leads';

  return (
    <div 
      className="login-card-white animate-fade-in-up"
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '24px 20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        width: '100%',
        maxWidth: '280px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        flexShrink: 0,
        margin: '0 auto',
      }}
    >
      {/* VBIT Logo Image */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <img 
          src="/vbit-logo.png" 
          alt="VBIT Logo" 
          style={{ 
            height: '42px', 
            objectFit: 'contain',
            marginBottom: '10px'
          }} 
        />
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          color: '#1e3a8a', 
          textAlign: 'center',
          margin: 0
        }}>
          {title}
        </h2>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#64748B', 
          marginTop: '4px',
          fontWeight: 500,
          textAlign: 'center',
          margin: '4px 0 0 0'
        }}>
          {tagSubtitle}
        </p>
      </div>

      {/* Error Display */}
      {displayError && (
        <div style={{
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#DC2626',
          fontSize: '0.72rem',
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          {displayError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          id={`${role}-email-input`}
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setLocalError(''); clearError(); }}
          autoComplete="email"
          disabled={isSubmitting}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #D2D6DC',
            fontSize: '0.813rem',
            background: '#F9FAFB',
            color: '#1E293B',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#d34e2b'; e.target.style.background = '#FFFFFF'; }}
          onBlur={(e) => { e.target.style.borderColor = '#D2D6DC'; e.target.style.background = '#F9FAFB'; }}
        />

        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            id={`${role}-password-input`}
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLocalError(''); clearError(); }}
            autoComplete="current-password"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: '40px',
              borderRadius: '8px',
              border: '1px solid #D2D6DC',
              fontSize: '0.813rem',
              background: '#F9FAFB',
              color: '#1E293B',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#d34e2b'; e.target.style.background = '#FFFFFF'; }}
            onBlur={(e) => { e.target.style.borderColor = '#D2D6DC'; e.target.style.background = '#F9FAFB'; }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              color: '#94A3B8', padding: '2px', display: 'flex', background: 'none', border: 'none',
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button
          type="submit"
          id={`${role}-login-button`}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            background: '#d34e2b',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: isSubmitting ? 'wait' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            marginTop: '4px',
            opacity: isSubmitting ? 0.8 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) e.target.style.opacity = '0.95';
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = '1';
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </div>
  );
}
