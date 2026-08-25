/**
 * StudentDashboard — Real-time Student panel with 100% real-time Firestore exam seating lookup & published class timetables.
 */
import { useState, useEffect } from 'react';
import { Calendar, CalendarCheck, Download, FileSpreadsheet, BookOpen, Clock, Search, AlertCircle, X, Eye, ClipboardList } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { TIME_SLOTS } from '../../data/curriculumSeed';
import { exportToExcel } from '../../lib/export/excelExporter';
import { exportToPDF } from '../../lib/export/pdfExporter';
import { exportSingleRoomPDF, exportBatchPDF } from '../../lib/export/examSeatingPdfExporter';

function getCellClass(rawSubject) {
  if (!rawSubject) return 'cell-free';
  const subject = typeof rawSubject === 'string' ? rawSubject : (rawSubject?.name || rawSubject?.subject || rawSubject?.code || '');
  if (subject === 'LUNCH' || subject === 'Break') return 'cell-lunch';
  if (subject === 'Free' || !subject) return 'cell-free';
  if (subject.includes('Lab') || subject.includes('Workshop')) return 'cell-lab';
  return 'cell-theory';
}

export default function StudentDashboard() {
  const { profile } = useAuthStore();
  const { notifications, subscribeToNotifications, dismissNotification } = useNotificationStore();
  const [searchHTNo, setSearchHTNo] = useState(profile?.hallTicketNo || '23P61A6701');
  const [publishedPlans, setPublishedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [seatingMatch, setSeatingMatch] = useState(null);

  // Subscribe to real-time notification hub
  useEffect(() => {
    const unsub = subscribeToNotifications('student', profile?.email, profile?.department);
    return () => unsub && unsub();
  }, [profile, subscribeToNotifications]);

  // Real-time Firestore timetables from /schedules
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Real-time Firestore synchronization with /seating_plans
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'seating_plans'), (snapshot) => {
      const plans = [];
      snapshot.forEach(docSnap => {
        plans.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPublishedPlans(plans);
      setLoadingPlans(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Real-time Firestore synchronization with /schedules (Class Timetables)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPublishedSchedules(list);
      if (list.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(list[0].id);
      }
      setLoadingSchedules(false);
    });

    return () => unsubscribe();
  }, []);

  // Perform search whenever searchHTNo or publishedPlans updates
  useEffect(() => {
    if (!searchHTNo.trim()) {
      setSeatingMatch(null);
      return;
    }

    const queryHT = searchHTNo.trim().toUpperCase();
    let foundMatch = null;

    for (const planDoc of publishedPlans) {
      let grid = [];
      try {
        grid = typeof planDoc.gridData === 'string' ? JSON.parse(planDoc.gridData) : (planDoc.gridData || []);
      } catch (e) {
        console.error('Grid parse error:', e);
      }

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          const cell = grid[r][c];
          if (cell) {
            let studentSeat = null;
            if (cell.seat1 && cell.seat1.hallTicketNo?.trim().toUpperCase() === queryHT) {
              studentSeat = cell.seat1;
            } else if (cell.seat2 && cell.seat2.hallTicketNo?.trim().toUpperCase() === queryHT) {
              studentSeat = cell.seat2;
            } else if (cell.hallTicketNo && cell.hallTicketNo.trim().toUpperCase() === queryHT) {
              studentSeat = cell;
            }

            if (studentSeat) {
              foundMatch = {
                hallTicketNo: studentSeat.hallTicketNo,
                branch: studentSeat.branch,
                yearSem: studentSeat.yearSem || planDoc.examTitle,
                roomNumber: planDoc.roomNumber,
                block: planDoc.block,
                floor: planDoc.floor,
                examTitle: planDoc.examTitle,
                sessionDate: planDoc.sessionDate,
                sessionSlot: planDoc.sessionSlot,
                colNum: c + 1,
                rowNum: r + 1,
              };
              break;
            }
          }
        }
        if (foundMatch) break;
      }
      if (foundMatch) break;
    }

    setSeatingMatch(foundMatch);
  }, [searchHTNo, publishedPlans]);

  const activeSchedule = publishedSchedules.find(s => s.id === selectedScheduleId) || publishedSchedules[0];

  const handleExportExcel = () => {
    if (!activeSchedule) return;
    const timeConfig = activeSchedule.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
    exportToExcel(activeSchedule, timeConfig, `${activeSchedule.department}_Yr${activeSchedule.year}_Sec${activeSchedule.section}_Timetable`);
  };

  const handleExportPDF = () => {
    if (!activeSchedule) return;
    const timeConfig = activeSchedule.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
    exportToPDF(activeSchedule, timeConfig, `${activeSchedule.department}_Yr${activeSchedule.year}_Sec${activeSchedule.section}_Timetable`);
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeConfig = activeSchedule?.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
  const periodsList = Array.isArray(timeConfig) ? timeConfig : (timeConfig?.periods || []);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome */}
      <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Hello, {profile?.name || profile?.displayName || 'Student'} 🎓
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Real-time Firestore database connected for examination seating & class timetables.
        </p>
      </div>

      {/* Real-time Notifications Banner with Cross Dismissal Button */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.slice(0, 3).map(n => (
            <div key={n.id} style={{
              padding: '12px 16px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)', marginRight: '8px' }}>🔔 {n.title}:</span>
                <span style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>{n.message}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button
                  onClick={() => dismissNotification(n.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 150ms ease'
                  }}
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Cards */}
      <div 
        className="animate-fade-in-up delay-1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px', opacity: 0 }}
      >
        {[
          { label: 'Section', value: activeSchedule ? `${activeSchedule.department} Sec ${activeSchedule.section}` : 'CSE-DS Sec A', icon: BookOpen, color: '#3B82F6' },
          { label: 'Academic Year', value: activeSchedule ? `Year ${activeSchedule.year} Sem ${activeSchedule.semester}` : 'Year 3 Sem 1', icon: FileSpreadsheet, color: '#10B981' },
          { label: 'Classroom', value: activeSchedule ? `Room ${activeSchedule.room}` : 'Room 304', icon: Calendar, color: '#8B5CF6' },
          { label: 'Published Plans', value: publishedPlans.length.toString(), icon: CalendarCheck, color: '#E8522E' },
        ].map((stat, i) => (
          <div key={i} className="solid-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: `${stat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Exam Seating Lookup Section */}
      <div className="animate-fade-in-up delay-2" style={{ marginBottom: '24px', opacity: 0 }}>
        <div className="solid-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#E8522E' }}>
            <CalendarCheck size={18} /> Real-Time Examination Seating Plan Lookup
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter Hall Ticket No (e.g. 23P61A6701)"
                value={searchHTNo}
                onChange={e => setSearchHTNo(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.813rem' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              ({publishedPlans.length} published room seating plans in database)
            </span>
          </div>

          {/* Real-Time Seating Match Display */}
          {loadingPlans ? (
            <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>Searching Firestore seating plans...</p>
          ) : seatingMatch ? (
            <div style={{
              padding: '18px', borderRadius: '12px',
              background: 'var(--surface-glass)', border: '1px solid var(--accent-green)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px',
            }}>
              <div>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exam & Date</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '2px' }}>{seatingMatch.examTitle || 'B.Tech Examinations'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{seatingMatch.sessionDate} ({seatingMatch.sessionSlot} Session)</div>
              </div>
              <div>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Hall</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>Room {seatingMatch.roomNumber}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{seatingMatch.block} Block ({seatingMatch.floor === 0 ? 'Ground Floor' : `Floor ${seatingMatch.floor}`})</div>
              </div>
              <div>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Seat Position</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#8B5CF6', marginTop: '2px' }}>Column {seatingMatch.colNum} • Row {seatingMatch.rowNum}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bench Pair Seat #{seatingMatch.colNum * seatingMatch.rowNum}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student & Branch</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '2px' }}>{seatingMatch.hallTicketNo}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{seatingMatch.yearSem || seatingMatch.branch}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
              No seating record found for Hall Ticket No: <strong>{searchHTNo}</strong> in the current published database.
            </div>
          )}

          {/* Published Seating PDFs Download Section for Students */}
          {groupedExamBatches.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} style={{ color: 'var(--accent-blue)' }} /> Download Full Published Seating Arrangement PDFs
              </h3>
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
            </div>
          )}
        </div>
      </div>

      {/* Real-time Class Timetable Section */}
      <div className="animate-fade-in-up delay-3" style={{ opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
              Real-Time Class Timetable
            </h2>
            {publishedSchedules.length > 1 && (
              <select
                className="input-field"
                value={selectedScheduleId}
                onChange={e => setSelectedScheduleId(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.813rem' }}
              >
                {publishedSchedules.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.department} Yr {s.year} Sec {s.section} (Room {s.room})
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeSchedule && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleExportExcel} className="btn btn-ghost btn-sm" id="export-excel-btn">
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" id="export-pdf-btn">
                <Download size={14} /> PDF
              </button>
            </div>
          )}
        </div>

        {loadingSchedules ? (
          <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>Syncing published class timetables from Firestore...</p>
        ) : !activeSchedule ? (
          <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            No class timetable has been published by the admin yet in Firestore database. Timetables published by admin will appear here in real time.
          </div>
        ) : (
          <div className="timetable-container">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>Day / Period</th>
                  {periodsList.map((p, i) => (
                    <th key={i} style={{ fontSize: '0.75rem' }}>{p.label}<br/><span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>{p.time}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysList.map((day) => {
                  const slots = activeSchedule.grid?.[day] || [];
                  const cells = [];
                  let i = 0;
                  while (i < periodsList.length) {
                    const rawSub = slots[i] || 'Free';
                    const subDisplay = typeof rawSub === 'string' ? rawSub : (rawSub?.name || rawSub?.subject || rawSub?.code || 'Free');
                    let span = 1;
                    if (subDisplay !== 'LUNCH' && subDisplay !== 'Break' && subDisplay !== 'Free') {
                      while (i + span < periodsList.length && (typeof slots[i + span] === 'string' ? slots[i + span] : (slots[i + span]?.name || slots[i + span]?.subject || '')) === subDisplay) span++;
                    }
                    cells.push(
                      <td
                        key={i}
                        colSpan={span}
                        className={getCellClass(subDisplay)}
                        style={{
                          fontWeight: span > 1 ? 600 : 400,
                          fontSize: span > 1 ? '0.813rem' : '0.75rem',
                        }}
                      >
                        {subDisplay}
                      </td>
                    );
                    i += span;
                  }
                  return (
                    <tr key={day}>
                      <td style={{ fontWeight: 600, background: 'var(--bg-elevated)' }}>{day}</td>
                      {cells}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
