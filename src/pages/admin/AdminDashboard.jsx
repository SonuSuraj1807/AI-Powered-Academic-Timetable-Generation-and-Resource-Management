/**
 * AdminDashboard — Main admin overview panel.
 * Shows department stats, quick actions, and system status.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Calendar, Users, BookOpen, Cpu, FileSpreadsheet, 
  BarChart3, ArrowUpRight, Clock, CheckCircle, AlertTriangle,
  Layers, TrendingUp, GraduationCap, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const QUICK_ACTIONS = [
  { label: 'Generate Timetable', description: 'AI-powered schedule generation', icon: Cpu, path: '/admin/generate', color: '#E8522E' },
  { label: 'View Schedules', description: 'Browse published timetables', icon: Calendar, path: '/admin/schedules', color: '#3B82F6' },
  { label: 'Exam Scheduler', description: 'Graph-coloring exam planner', icon: FileSpreadsheet, path: '/admin/exam-scheduler', color: '#10B981' },
  { label: 'Training Override', description: 'Set training day overrides', icon: Layers, path: '/admin/overrides', color: '#8B5CF6' },
  { label: 'Faculty Manager', description: 'Manage teaching assignments', icon: Users, path: '/admin/faculty', color: '#F59E0B' },
  { label: 'Curriculum Registry', description: 'R22 & R25 subject database', icon: BookOpen, path: '/admin/curriculum', color: '#06B6D4' },
];

const RECENT_ACTIVITIES = [
  { text: 'CSE-DS R22 4th Year Section A timetable published', time: '2 hours ago', type: 'success' },
  { text: 'Smart Swap: Dr. Kumar → Dr. Reddy for DBMS (3rd Year B)', time: '4 hours ago', type: 'info' },
  { text: 'Training override applied: 4th Year Placement Week', time: '1 day ago', type: 'warning' },
  { text: 'R25 1st Year curriculum registry updated', time: '2 days ago', type: 'info' },
  { text: 'Exam schedule generated for III-I Semester', time: '3 days ago', type: 'success' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [schedulesCount, setSchedulesCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [curriculumCount, setCurriculumCount] = useState(0);
  const [sectionsCount, setSectionsCount] = useState(0);

  useEffect(() => {
    const isSuperAdmin = profile?.role === 'superadmin';
    const dept = profile?.department;

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
      let list = [];
      snap.forEach(doc => list.push(doc.data()));
      if (!isSuperAdmin && dept) {
        list = list.filter(d => d.department === dept);
      }
      setSchedulesCount(list.length);
      const activeSecs = new Set();
      list.forEach(data => {
        if (data.section && data.department) {
          activeSecs.add(`${data.department}_${data.year}_${data.section}`);
        }
      });
      setSectionsCount(activeSecs.size);
    });

    const unsubFaculty = onSnapshot(collection(db, 'faculty'), (snap) => {
      let list = [];
      snap.forEach(doc => list.push(doc.data()));
      if (!isSuperAdmin && dept) {
        list = list.filter(f => f.department === dept);
      }
      setFacultyCount(list.length);
    });

    const unsubCurriculum = onSnapshot(collection(db, 'curriculum_registry'), (snap) => {
      let list = [];
      snap.forEach(doc => list.push(doc.data()));
      if (!isSuperAdmin && dept) {
        list = list.filter(c => c.department === dept);
      }
      setCurriculumCount(list.length);
    });

    return () => {
      unsubSchedules();
      unsubFaculty();
      unsubCurriculum();
    };
  }, [profile]);

  const STAT_CARDS = [
    { label: 'Active Schedules', value: String(schedulesCount), change: `${profile?.department || 'Dept'} Scope`, icon: Calendar, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Faculty Members', value: String(facultyCount), change: `${profile?.department || 'Dept'} Staff`, icon: Users, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Subjects Registered', value: String(curriculumCount), change: `${profile?.department || 'Dept'} Courses`, icon: BookOpen, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Active Sections', value: String(sectionsCount), change: 'Department Sections', icon: Building2, color: '#E8522E', bg: 'rgba(232,82,46,0.1)' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Welcome back, {profile?.displayName || 'Administrator'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Here's what's happening with your academic schedules today.
        </p>
      </div>

      {/* Stats Grid */}
      <div 
        className="animate-fade-in-up delay-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {STAT_CARDS.map((stat, i) => (
          <div
            key={i}
            className="solid-card"
            style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in-up delay-2" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} style={{ color: 'var(--accent-primary)' }} />
          Quick Actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              id={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => navigate(action.path)}
              className="solid-card"
              style={{
                padding: '18px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `${action.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <action.icon size={18} style={{ color: action.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>{action.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column: Recent Activity + System Status */}
      <div 
        className="animate-fade-in-up delay-3"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
      >
        {/* Recent Activity */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--accent-blue)' }} />
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {RECENT_ACTIVITIES.map((activity, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                  background: activity.type === 'success' ? 'var(--success)' : activity.type === 'warning' ? 'var(--warning)' : 'var(--accent-blue)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {activity.text}
                  </div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: 'var(--success)' }} />
            System Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'AI Engine', status: 'Online', ok: true },
              { label: 'Firestore Database', status: 'Connected', ok: true },
              { label: 'Notification Service', status: 'Active', ok: true },
              { label: 'Export Pipeline', status: 'Ready', ok: true },
              { label: 'Biometric Integration', status: 'Placeholder', ok: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className="badge" style={{
                  background: item.ok ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                  color: item.ok ? 'var(--success)' : 'var(--warning)',
                }}>
                  {item.ok ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <AlertTriangle size={12} style={{ marginRight: '4px' }} />}
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
