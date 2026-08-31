/**
 * Sidebar — Dynamic role-based navigation panel
 * 
 * Collapsible sidebar with animated menu items, role-specific sections,
 * and active state highlighting.
 */
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, Users, Bell, Settings,
  GraduationCap, FileSpreadsheet, Clock, Cpu, UserCheck,
  BarChart3, CalendarCheck, ChevronLeft, ChevronRight,
  Shield, FlaskConical, Layers, LogOut, Zap, ClipboardList, Building2
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const MENU_CONFIG = {
  superadmin: {
    label: 'Super Admin',
    color: '#8B5CF6',
    items: [
      { path: '/superadmin', icon: Shield, label: 'Super Admin Console', end: true },
      { path: '/admin/facilities', icon: Building2, label: 'Manage Campus Venues' },
      { path: '/admin/club-leads', icon: UserCheck, label: 'Manage Club Leads' },
      { path: '/admin/venue-oversight', icon: Building2, label: 'Venue Oversight' },
      { path: '/admin/schedules', icon: Calendar, label: 'All Schedules' },
      { path: '/admin/faculty', icon: Users, label: 'All Faculty Pool' },
      { path: '/admin/reports', icon: BarChart3, label: 'Analytics' },
    ],
  },
  sac_director: {
    label: 'SAC Director',
    color: '#F59E0B',
    items: [
      { path: '/sac-director', icon: LayoutDashboard, label: 'SAC Approval Console', end: true },
      { path: '/admin/venue-oversight', icon: Building2, label: 'Venue Oversight' },
    ],
  },
  principal: {
    label: 'Principal Office',
    color: '#10B981',
    items: [
      { path: '/principal', icon: LayoutDashboard, label: 'Principal Console', end: true },
      { path: '/admin/venue-oversight', icon: Building2, label: 'Venue Oversight' },
      { path: '/admin/schedules', icon: Calendar, label: 'All Schedules' },
    ],
  },
  exam_controller: {
    label: 'Exam Controller',
    color: '#EC4899',
    items: [
      { path: '/admin/exam-scheduler', icon: CalendarCheck, label: 'Publish Exam Schedules', end: true },
      { path: '/admin/exam-seating', icon: ClipboardList, label: 'Seating Allocation' },
      { path: '/admin/exam-rooms', icon: Building2, label: 'Invigilation & Rooms' },
      { path: '/admin/schedules', icon: Calendar, label: 'View All Timetables' },
    ],
  },
  admin: {
    label: 'Administrator / HOD',
    color: '#E8522E',
    items: [
      { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { path: '/admin/facilities', icon: Building2, label: 'Manage Campus Venues' },
      { path: '/admin/club-leads', icon: UserCheck, label: 'Manage Club Leads' },
      { path: '/admin/venue-oversight', icon: Building2, label: 'Venue Allocation Oversight' },
      { path: '/admin/generate', icon: Cpu, label: 'Generate Timetable' },
      { path: '/admin/schedules', icon: Calendar, label: 'View Schedules' },
      { path: '/admin/exam-scheduler', icon: CalendarCheck, label: 'Exam Scheduler' },
      { path: '/admin/faculty', icon: Users, label: 'Faculty Management' },
      { path: '/admin/curriculum', icon: BookOpen, label: 'Curriculum Registry' },
      { path: '/admin/overrides', icon: Zap, label: 'Training Overrides' },
      { path: '/admin/substitutions', icon: UserCheck, label: 'Faculty Substitution' },
      { path: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
      { path: '/admin/exam-seating', icon: ClipboardList, label: 'Exam Seating Plan' },
      { path: '/admin/exam-rooms', icon: Building2, label: 'Exam Rooms' },
      { path: '/faculty/schedule', icon: Clock, label: 'My Personal Schedule' },
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
      { path: '/student/facility-booking', icon: Building2, label: 'Auditorium & Venue Booking' },
      { path: '/student/timetable', icon: Calendar, label: 'Class Timetable' },
      { path: '/student/exams', icon: CalendarCheck, label: 'Exam Schedule' },
      { path: '/student/settings', icon: Settings, label: 'Settings' },
    ],
  },
};

export default function Sidebar({ collapsed, onToggle }) {
  const { role, profile, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const activeRole = (role === 'hod' || role === 'dept_admin') ? 'admin' : role;
  const config = MENU_CONFIG[activeRole] || MENU_CONFIG.admin;

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout(true);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="main-sidebar">
      {/* Brand Header */}
      <div 
        onClick={() => {
          const ROLE_ROUTES = {
            superadmin: '/superadmin',
            admin: '/admin',
            faculty: '/faculty',
            student: '/student',
            exam_controller: '/admin/exam-scheduler',
          };
          navigate(ROLE_ROUTES[role] || '/');
        }}
        style={{
          padding: collapsed ? '16px 12px' : '16px 20px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '72px',
          cursor: 'pointer',
        }}
        title="Go to Dashboard"
      >
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
          onClick={() => setShowLogoutModal(true)}
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
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--danger-subtle)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="solid-card" style={{ maxWidth: '420px', width: '100%', padding: '28px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '18px',
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)'
            }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Confirm Sign Out
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to log out? Any unsaved timetable draft, schedule changes, or active work in progress will be lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="btn btn-danger" 
                style={{ flex: 1, padding: '10px 16px', background: 'var(--danger)', color: 'white', fontWeight: 700 }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
