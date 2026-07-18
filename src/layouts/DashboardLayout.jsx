/**
 * DashboardLayout — Master layout for all authenticated dashboard panels.
 * 
 * Provides the sidebar, top header with notification bell, and scrollable content area.
 * Used by Admin, Faculty, and Student panels.
 */
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import Sidebar from '../components/navigation/Sidebar';
import NotificationBell from '../components/notifications/NotificationBell';
import NotificationOverlay from '../components/notifications/NotificationOverlay';
import useAuthStore from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuthStore();
  const { subscribeToNotifications, cleanup } = useNotificationStore();

  // Subscribe to notifications when the dashboard mounts
  useEffect(() => {
    if (profile?.uid) {
      subscribeToNotifications(profile.uid);
    }
    return () => cleanup();
  }, [profile?.uid]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 39, display: 'none',
          }}
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <div 
        className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        {/* Top Header Bar */}
        <header className="top-header">
          {/* Left: Mobile hamburger + Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none', padding: '8px', borderRadius: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              <Menu size={20} />
            </button>
            
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--surface-glass)',
              borderRadius: '10px',
              padding: '8px 14px',
              minWidth: '240px',
            }}>
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search schedules, faculty..."
                id="global-search-input"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.813rem',
                  color: 'var(--text-primary)',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Right: Notifications + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NotificationBell />
            
            {profile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '6px 12px', borderRadius: '10px',
                background: 'var(--surface-glass)',
              }}>
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {(profile.displayName || profile.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.813rem', fontWeight: 600 }}>
                    {profile.displayName || 'User'}
                  </span>
                  <span style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
                    {profile.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content" style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* Substitution Notification Overlay */}
        <NotificationOverlay />
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-btn { display: flex !important; }
          .mobile-overlay { display: block !important; }
        }
      `}</style>
    </div>
  );
}
