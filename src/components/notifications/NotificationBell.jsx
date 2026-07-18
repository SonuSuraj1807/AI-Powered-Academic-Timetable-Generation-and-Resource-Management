/**
 * NotificationBell — Animated notification icon with unread badge and dropdown panel.
 */
import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, RefreshCw } from 'lucide-react';
import useNotificationStore from '../../stores/notificationStore';

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotificationStore();
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        id="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: '10px',
          color: 'var(--text-secondary)',
          transition: 'all 150ms ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-glass-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        className={unreadCount > 0 ? 'animate-bell-ring' : ''}
      >
        <Bell size={20} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '18px', height: '18px',
            borderRadius: '50%',
            background: 'var(--danger)',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-secondary)',
            animation: 'fadeInScale 0.3s ease-out',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="notification-dropdown"
          className="animate-fade-in-scale"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '380px',
            maxHeight: '480px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-secondary)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-2xl)',
            overflow: 'hidden',
            zIndex: 'var(--z-notification)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ fontSize: '0.938rem', fontWeight: 700 }}>Notifications</h3>
              {unreadCount > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.75rem', color: 'var(--accent-blue)',
                  padding: '4px 8px', borderRadius: '6px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-blue-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => notif.status === 'unread' && markAsRead(notif.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    cursor: notif.status === 'unread' ? 'pointer' : 'default',
                    background: notif.status === 'unread' ? 'var(--accent-blue-subtle)' : 'transparent',
                    transition: 'background 150ms ease',
                    display: 'flex', gap: '12px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-glass-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notif.status === 'unread' ? 'var(--accent-blue-subtle)' : 'transparent'}
                >
                  {/* Status Dot */}
                  <div style={{
                    width: '8px', height: '8px', flexShrink: 0,
                    borderRadius: '50%', marginTop: '6px',
                    background: notif.status === 'unread' ? 'var(--accent-blue)' : 'var(--text-muted)',
                    opacity: notif.status === 'unread' ? 1 : 0.3,
                  }} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.813rem', fontWeight: notif.status === 'unread' ? 600 : 400,
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {notif.body}
                    </div>
                    <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {timeAgo(notif.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
