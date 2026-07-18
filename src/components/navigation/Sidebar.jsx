/**
 * Sidebar — Dynamic role-based navigation panel
 * 
 * Collapsible sidebar with animated menu items, role-specific sections,
 * and active state highlighting.
 */
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, Users, Bell, Settings,
  GraduationCap, FileSpreadsheet, Clock, Cpu, UserCheck,
  BarChart3, CalendarCheck, ChevronLeft, ChevronRight,
  Shield, FlaskConical, Layers, LogOut,
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const MENU_CONFIG = {
  admin: {
    label: 'Administrator',
    color: '#E8522E',
    items: [
      { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { path: '/admin/generate', icon: Cpu, label: 'Generate Timetable' },
      { path: '/admin/schedules', icon: Calendar, label: 'View Schedules' },
      { path: '/admin/exam-scheduler', icon: CalendarCheck, label: 'Exam Scheduler' },
      { path: '/admin/faculty', icon: Users, label: 'Faculty Management' },
      { path: '/admin/curriculum', icon: BookOpen, label: 'Curriculum Registry' },
      { path: '/admin/overrides', icon: Layers, label: 'Training Overrides' },
      { path: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
      { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
  faculty: {
    label: 'Faculty',
    color: '#3B82F6',
    items: [
      { path: '/faculty', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { path: '/faculty/schedule', icon: Calendar, label: 'My Schedule' },
      { path: '/faculty/substitutions', icon: UserCheck, label: 'Substitutions' },
      { path: '/faculty/subjects', icon: BookOpen, label: 'My Subjects' },
      { path: '/faculty/settings', icon: Settings, label: 'Settings' },
    ],
  },
  student: {
    label: 'Student',
    color: '#10B981',
    items: [
      { path: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { path: '/student/timetable', icon: Calendar, label: 'Class Timetable' },
      { path: '/student/exams', icon: CalendarCheck, label: 'Exam Schedule' },
      { path: '/student/settings', icon: Settings, label: 'Settings' },
    ],
  },
};

export default function Sidebar({ collapsed, onToggle }) {
  const { role, profile, logout } = useAuthStore();
  const location = useLocation();
  const config = MENU_CONFIG[role] || MENU_CONFIG.admin;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="main-sidebar">
      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '72px',
      }}>
        <div style={{
          width: '40px', height: '40px', flexShrink: 0,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${config.color}40`,
        }}>
          <GraduationCap size={20} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              VBIT
            </div>
            <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              Timetable System
            </div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{
            fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '8px 12px 6px',
          }}>
            {config.label} Panel
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {config.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 12px' : '10px 14px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? `${config.color}15` : 'transparent',
                borderLeft: isActive ? `3px solid ${config.color}` : '3px solid transparent',
                transition: 'all 150ms ease',
                textDecoration: 'none',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <item.icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div style={{
        padding: collapsed ? '12px' : '12px 16px',
        borderTop: '1px solid var(--border-primary)',
      }}>
        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          id="sidebar-toggle"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)',
            marginBottom: '8px',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--surface-glass-hover)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* User Info & Logout */}
        {!collapsed && profile && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--surface-glass)',
            marginBottom: '8px',
          }}>
            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {profile.displayName || profile.email}
            </div>
            <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {profile.department || role}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          id="logout-button"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.813rem',
            color: 'var(--danger)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--danger-subtle)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
