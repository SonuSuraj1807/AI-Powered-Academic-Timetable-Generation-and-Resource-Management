/**
 * NotificationOverlay — Full-screen modal alert for unread substitution notifications.
 * Displays on first login if there are pending substitution alerts.
 * Auto-dismisses after 10 seconds or can be manually closed.
 */
import { useState, useEffect } from 'react';
import { X, UserCheck, ArrowRight, Clock } from 'lucide-react';
import useNotificationStore from '../../stores/notificationStore';

export default function NotificationOverlay() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotificationStore();

  const substitutionAlerts = notifications.filter(
    n => n.status === 'unread' && n.type === 'substitution'
  );

  useEffect(() => {
    if (substitutionAlerts.length > 0 && !dismissed) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [substitutionAlerts.length, dismissed]);

  if (!visible || substitutionAlerts.length === 0) return null;

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    substitutionAlerts.forEach(n => markAsRead(n.id));
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={handleDismiss}
    >
      <div
        className="animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-2xl)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            color: 'var(--text-tertiary)',
            padding: '4px', borderRadius: '8px',
          }}
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div style={{
          width: '56px', height: '56px',
          borderRadius: '16px',
          background: 'var(--accent-amber-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <UserCheck size={28} style={{ color: 'var(--accent-amber)' }} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          Substitution Alert{substitutionAlerts.length > 1 ? 's' : ''}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          You have {substitutionAlerts.length} pending substitution notification{substitutionAlerts.length > 1 ? 's' : ''}.
        </p>

        {/* Substitution Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
          {substitutionAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--surface-glass)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                {alert.title}
              </div>
              <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {alert.body}
              </div>
              {alert.metadata && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)',
                }}>
                  {alert.metadata.timeSlot && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {alert.metadata.timeSlot}
                    </span>
                  )}
                  {alert.metadata.originalFaculty && alert.metadata.substituteFaculty && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {alert.metadata.originalFaculty} <ArrowRight size={12} /> {alert.metadata.substituteFaculty}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            onClick={handleDismiss}
            className="btn btn-primary btn-lg"
            style={{ flex: 1 }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
