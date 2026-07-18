/**
 * FacultyDashboard — Faculty panel showing personal schedule, substitution alerts, and weekly view.
 */
import { 
  Calendar, Clock, BookOpen, UserCheck, Bell, 
  ArrowRight, FileText, ChevronRight, TrendingUp
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';

const DEMO_SCHEDULE = [
  { day: 'Monday', slots: [
    { time: '09:00-10:00', subject: 'Data Structures', section: 'CSE-DS A', type: 'theory' },
    { time: '10:00-11:00', subject: 'DAA', section: 'CSE-DS B', type: 'theory' },
    { time: '11:00-12:00', subject: 'Free', section: '', type: 'free' },
    { time: '12:20-01:10', subject: 'Lunch', section: '', type: 'lunch' },
    { time: '01:10-04:10', subject: 'DS Lab', section: 'CSE-DS A', type: 'lab' },
  ]},
  { day: 'Tuesday', slots: [
    { time: '09:00-10:00', subject: 'Data Structures', section: 'CSE-DS C', type: 'theory' },
    { time: '10:00-11:00', subject: 'Free', section: '', type: 'free' },
    { time: '11:00-12:00', subject: 'DAA', section: 'CSE-DS A', type: 'theory' },
    { time: '12:20-01:10', subject: 'Lunch', section: '', type: 'lunch' },
    { time: '01:10-02:10', subject: 'Data Structures', section: 'CSE-DS B', type: 'theory' },
  ]},
];

export default function FacultyDashboard() {
  const { profile } = useAuthStore();
  const { notifications, unreadCount } = useNotificationStore();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome */}
      <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Good morning, {profile?.displayName || 'Faculty'} 👨‍🏫
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Here's your schedule and updates for today.
        </p>
      </div>

      {/* Stats Row */}
      <div 
        className="animate-fade-in-up delay-1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px', opacity: 0 }}
      >
        {[
          { label: 'Today\'s Classes', value: '4', icon: Calendar, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Subjects Assigned', value: '3', icon: BookOpen, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Pending Substitutions', value: unreadCount.toString(), icon: UserCheck, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Weekly Hours', value: '18', icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
        ].map((stat, i) => (
          <div key={i} className="solid-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule + Notifications */}
      <div className="animate-fade-in-up delay-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', opacity: 0 }}>
        {/* Today's Classes */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
            Today's Schedule — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(DEMO_SCHEDULE[0]?.slots || []).map((slot, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 14px', borderRadius: '10px',
                  background: slot.type === 'lunch' ? 'var(--accent-amber-subtle)' : 
                              slot.type === 'lab' ? 'var(--accent-blue-subtle)' :
                              slot.type === 'free' ? 'var(--surface-glass)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
                  minWidth: '90px', fontFamily: 'var(--font-mono)',
                }}>
                  {slot.time}
                </div>
                <div style={{
                  width: '3px', height: '24px', borderRadius: '2px',
                  background: slot.type === 'theory' ? 'var(--accent-blue)' : 
                              slot.type === 'lab' ? 'var(--accent-purple)' :
                              slot.type === 'lunch' ? 'var(--accent-amber)' : 'var(--text-muted)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{slot.subject}</div>
                  {slot.section && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{slot.section}</div>
                  )}
                </div>
                <span className={`badge badge-${slot.type === 'lab' ? 'blue' : slot.type === 'theory' ? 'green' : slot.type === 'lunch' ? 'amber' : 'primary'}`}>
                  {slot.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: 'var(--accent-amber)' }} />
            Alerts
          </h2>
          
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <Bell size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.813rem' }}>No pending alerts</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: notif.status === 'unread' ? 'var(--accent-amber-subtle)' : 'var(--surface-glass)',
                  border: '1px solid var(--border-primary)',
                }}>
                  <div style={{ fontSize: '0.813rem', fontWeight: notif.status === 'unread' ? 600 : 400 }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {notif.body?.substring(0, 60)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
