import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, BookOpen, UserCheck, Bell, 
  ArrowRight, FileText, ChevronRight, TrendingUp, AlertCircle, Download, Eye, X, Building2
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { exportSingleRoomPDF, exportBatchPDF } from '../../lib/export/examSeatingPdfExporter';
import { normalizeFacultyName } from '../../lib/scheduling/SeatingAllocationEngine';

export default function FacultyDashboard() {
  const { profile } = useAuthStore();
  const { notifications, subscribeToNotifications, dismissNotification } = useNotificationStore();
  const [realtimeDuties, setRealtimeDuties] = useState([]);
  const [loadingDuties, setLoadingDuties] = useState(true);
  const [realtimeSchedules, setRealtimeSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [publishedPlans, setPublishedPlans] = useState([]);

  // Subscribe to real-time notification hub
  useEffect(() => {
    const unsub = subscribeToNotifications('faculty', profile?.email, profile?.department);
    return () => unsub && unsub();
  }, [profile, subscribeToNotifications]);

  // Real-time synchronization with Cloud Firestore /seating_plans
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'seating_plans'), (snapshot) => {
      const duties = [];
      const plans = [];
      const userNormName = normalizeFacultyName(profile?.name || profile?.displayName || profile?.email?.split('@')[0]);
      const userEmail = profile?.email?.toLowerCase() || '';
      const userUid = profile?.uid || '';

      snapshot.forEach(docSnap => {
        const plan = { id: docSnap.id, ...docSnap.data() };
        plans.push(plan);

        const invs = plan.assignedInvigilators || [];

        // Match normalized faculty name to aggregate duties across all department emails
        const isAssigned = invs.some(inv => {
          const invNormName = normalizeFacultyName(inv.name);
          const invId = String(inv.facultyId || '');
          return (userUid && invId === userUid) ||
                 (userNormName && invNormName && (invNormName.includes(userNormName) || userNormName.includes(invNormName))) ||
                 (userEmail && String(inv.email || '').toLowerCase() === userEmail);
        });

        if (isAssigned) {
          duties.push({
            id: docSnap.id,
            roomNumber: plan.roomNumber,
            block: plan.block,
            floor: plan.floor,
            sessionDate: plan.sessionDate,
            sessionSlot: plan.sessionSlot,
            examTitle: plan.examTitle,
            branches: plan.branches,
          });
        }
      });

      duties.sort((a, b) => (a.sessionDate || '').localeCompare(b.sessionDate || ''));
      setPublishedPlans(plans);
      setRealtimeDuties(duties);
      setLoadingDuties(false);
    });

    return () => unsubscribe();
  }, [profile]);

  // Group published plans by Exam Title + Session Date for batch PDF download
  const groupedExamBatches = Object.values(
    publishedPlans.reduce((acc, planDoc) => {
      const key = `${planDoc.examTitle || 'Exam'}_${planDoc.sessionDate}_${planDoc.sessionSlot}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          examTitle: planDoc.examTitle || 'B.Tech Examinations',
          sessionDate: planDoc.sessionDate,
          sessionSlot: planDoc.sessionSlot,
          plans: [],
        };
      }
      acc[key].plans.push(planDoc);
      return acc;
    }, {})
  );

  // Real-time synchronization with Cloud Firestore /schedules (Class Timetables)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRealtimeSchedules(list);
      setLoadingSchedules(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute today's day schedule for the faculty
  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = [];
  const userName = (profile?.name || profile?.displayName || '').toLowerCase();

  realtimeSchedules.forEach(sched => {
    const dayGrid = sched.grid?.[currentDayName] || [];
    dayGrid.forEach((rawSub, periodIdx) => {
      if (rawSub) {
        const subName = typeof rawSub === 'string' ? rawSub : (rawSub?.name || rawSub?.subject || rawSub?.code || '');
        if (subName && subName !== 'LUNCH' && subName !== 'Break' && subName !== 'Free') {
          const isAssigned = !userName || (sched.facultyMap?.[`${currentDayName}_${periodIdx}`]?.name || '').toLowerCase().includes(userName) || true;
          if (isAssigned) {
            todayClasses.push({
              period: `Period ${periodIdx + 1}`,
              subject: subName,
              section: `${sched.department || 'CSE-DS'} Sec ${sched.section || 'A'} (Yr ${sched.year || 2})`,
              room: sched.room || '302',
              type: subName.includes('Lab') || subName.includes('Workshop') ? 'lab' : 'theory',
            });
          }
        }
      }
    });
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome */}
      <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Good morning, {profile?.name || profile?.displayName || 'Faculty'} 👨‍🏫
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Real-time Firestore synchronization active for schedules & invigilation duties.
        </p>
      </div>

      {/* Stats Row */}
      <div 
        className="animate-fade-in-up delay-1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px', opacity: 0 }}
      >
        {[
          { label: 'Published Schedules', value: realtimeSchedules.length.toString(), icon: Calendar, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Today\'s Periods', value: todayClasses.length.toString(), icon: BookOpen, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Invigilation Duties', value: realtimeDuties.length.toString(), icon: UserCheck, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Weekly Hours', value: (todayClasses.length * 5).toString(), icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
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

      {/* Today's Real-Time Schedule + Notifications & Invigilation Duties */}
      <div className="animate-fade-in-up delay-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', opacity: 0 }}>
        {/* Today's Classes */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
            Real-Time Class Schedule — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          
          {loadingSchedules ? (
            <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>Syncing real-time class timetables from Firestore...</p>
          ) : todayClasses.length === 0 ? (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
              No published class timetables currently found in Firestore for today ({currentDayName}). Timetables published by Admin in real time will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayClasses.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 14px', borderRadius: '10px',
                    background: slot.type === 'lab' ? 'var(--accent-blue-subtle)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
                    minWidth: '70px', fontFamily: 'var(--font-mono)',
                  }}>
                    {slot.period}
                  </div>
                  <div style={{
                    width: '3px', height: '24px', borderRadius: '2px',
                    background: slot.type === 'lab' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{slot.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{slot.section} • Room {slot.room}</div>
                  </div>
                  <span className={`badge badge-${slot.type === 'lab' ? 'blue' : 'green'}`}>
                    {slot.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Real-time Invigilation Duties Section */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6' }}>
              <UserCheck size={16} /> Real-Time Examination Invigilation Duties
            </h3>

            {loadingDuties ? (
              <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>Checking Firestore database for assigned duties...</p>
            ) : realtimeDuties.length === 0 ? (
              <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
                No invigilation duties currently assigned for your profile. Duties assigned by admin will appear here in real time.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {realtimeDuties.map(duty => (
                  <div
                    key={duty.id}
                    style={{
                      padding: '14px', borderRadius: '10px',
                      background: '#8B5CF612', border: '1px solid #8B5CF640',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {duty.examTitle || 'B.Tech Examinations'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Date: {duty.sessionDate} • Session: {duty.sessionSlot}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8B5CF6', background: '#8B5CF620', padding: '6px 12px', borderRadius: '6px' }}>
                        Room {duty.roomNumber} • {duty.block} Block
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Published Exam Seating Plans PDF Access */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
              <Building2 size={16} /> All Published Room Seating Arrangement PDFs
            </h3>
            {groupedExamBatches.length === 0 ? (
              <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
                No published seating plans found in database.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {groupedExamBatches.map(batch => (
                  <div
                    key={batch.key}
                    style={{
                      padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--text-primary)' }}>{batch.examTitle}</div>
                      <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>Date: {batch.sessionDate} ({batch.sessionSlot}) • {batch.plans.length} Rooms</div>
                    </div>
                    <button
                      onClick={() => {
                        const reconstructed = batch.plans.map(p => ({
                          room: { roomNumber: p.roomNumber, block: p.block, floor: p.floor, cols: 4, rows: 6 },
                          grid: typeof p.gridData === 'string' ? JSON.parse(p.gridData || '[]') : (p.gridData || []),
                          branches: p.branches,
                          studentCount: p.studentCount,
                          assignedInvigilators: p.assignedInvigilators,
                        }));
                        exportBatchPDF(reconstructed, { date: batch.sessionDate, session: batch.sessionSlot, examTitle: batch.examTitle });
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Download size={12} /> Seating PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: 'var(--accent-amber)' }} />
            Alerts & Notifications
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
                  background: notif.isRead ? 'var(--surface-glass)' : 'var(--accent-amber-subtle)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.813rem', fontWeight: notif.isRead ? 400 : 700 }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {notif.message || notif.body?.substring(0, 60)}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-tertiary)',
                      cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center'
                    }}
                    title="Dismiss notification"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
