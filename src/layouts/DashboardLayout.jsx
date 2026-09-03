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
import GlobalSearchModal from '../components/navigation/GlobalSearchModal';
import useAuthStore from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { profile } = useAuthStore();
  const { subscribeToNotifications } = useNotificationStore();

  // Subscribe to real-time notifications when the dashboard mounts
  useEffect(() => {
    let unsub = null;
    if (profile?.role) {
      unsub = subscribeToNotifications(profile.role, profile.email, profile.department);
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [profile, subscribeToNotifications]);

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

            {/* Scope / Department Badge */}
            {profile?.role === 'principal' ? null : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--accent-blue-subtle)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '10px',
                padding: '6px 12px',
              }}>
                <span style={{ fontSize: '0.688rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Dept:</span>
                <span style={{ fontSize: '0.813rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {profile?.department || 'CSE-DS'}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--surface-glass)',
              borderRadius: '10px',
              padding: '8px 14px',
              minWidth: '220px',
            }}>
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search schedules, faculty..."
                id="global-search-input"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
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

        {/* Global Real-Time Search Modal */}
        <GlobalSearchModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
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
