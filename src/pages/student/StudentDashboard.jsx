/**
 * StudentDashboard — Student/CR panel with read-only timetable view and exam schedule.
 */
import { Calendar, CalendarCheck, Download, FileSpreadsheet, BookOpen, Clock } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const DEMO_TIMETABLE = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  periods: ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-12:20', '12:20-01:10', '01:10-02:10', '02:10-03:10', '03:10-04:10'],
  grid: {
    Monday:    ['M&C', 'EC', 'PPS', 'Break', 'LUNCH', 'Chem Lab', 'Chem Lab', 'Chem Lab'],
    Tuesday:   ['EC', 'BEE', 'Eng Chem', 'Break', 'LUNCH', 'PPS Lab', 'PPS Lab', 'PPS Lab'],
    Wednesday: ['M&C', 'PPS', 'BEE', 'Break', 'LUNCH', 'IT Workshop', 'IT Workshop', 'IT Workshop'],
    Thursday:  ['Eng Chem', 'M&C', 'EC', 'Break', 'LUNCH', 'BEE Lab', 'BEE Lab', 'BEE Lab'],
    Friday:    ['BEE', 'Eng Chem', 'PPS', 'Break', 'LUNCH', 'Eng Workshop', 'Eng Workshop', 'Eng Workshop'],
    Saturday:  ['M&C', 'EC', 'Free', 'Break', 'LUNCH', 'Free', 'Free', 'Free'],
  },
};

function getCellClass(subject) {
  if (subject === 'LUNCH') return 'cell-lunch';
  if (subject === 'Break') return 'cell-lunch';
  if (subject === 'Free') return 'cell-free';
  if (subject.includes('Lab') || subject.includes('Workshop')) return 'cell-lab';
  return 'cell-theory';
}

export default function StudentDashboard() {
  const { profile } = useAuthStore();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome */}
      <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Hello, {profile?.displayName || 'Student'} 🎓
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Your class timetable and exam schedule at a glance.
        </p>
      </div>

      {/* Info Cards */}
      <div 
        className="animate-fade-in-up delay-1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px', opacity: 0 }}
      >
        {[
          { label: 'Section', value: profile?.section || 'CSE-DS A', icon: BookOpen, color: '#3B82F6' },
          { label: 'Regulation', value: profile?.regulation || 'R25', icon: FileSpreadsheet, color: '#10B981' },
          { label: 'Semester', value: 'I Year I Sem', icon: Calendar, color: '#8B5CF6' },
          { label: 'Next Exam', value: 'Aug 15', icon: CalendarCheck, color: '#E8522E' },
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

      {/* Timetable Grid */}
      <div className="animate-fade-in-up delay-2" style={{ opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
            Class Timetable
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" id="export-excel-btn">
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button className="btn btn-ghost btn-sm" id="export-pdf-btn">
              <Download size={14} /> PDF
            </button>
          </div>
        </div>

        <div className="timetable-container">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th style={{ minWidth: '100px' }}>Day / Period</th>
                {DEMO_TIMETABLE.periods.map((p, i) => (
                  <th key={i} style={{ fontSize: '0.75rem' }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_TIMETABLE.days.map((day) => {
                const slots = DEMO_TIMETABLE.grid[day] || [];
                const cells = [];
                let i = 0;
                while (i < slots.length) {
                  const subject = slots[i];
                  // Check for consecutive lab spans
                  let span = 1;
                  if (subject !== 'LUNCH' && subject !== 'Break' && subject !== 'Free') {
                    while (i + span < slots.length && slots[i + span] === subject) span++;
                  }
                  cells.push(
                    <td
                      key={i}
                      colSpan={span}
                      className={getCellClass(subject)}
                      style={{
                        fontWeight: span > 1 ? 600 : 400,
                        fontSize: span > 1 ? '0.813rem' : '0.75rem',
                      }}
                    >
                      {subject}
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
      </div>
    </div>
  );
}
