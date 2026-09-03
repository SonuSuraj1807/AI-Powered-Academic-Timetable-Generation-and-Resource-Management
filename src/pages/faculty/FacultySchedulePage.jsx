/**
 * FacultySchedulePage — Real-time weekly timetable view for faculty members with exact VBIT timings & smart Firestore matching.
 */
import { useState, useEffect } from 'react';
import { Calendar, Download, FileSpreadsheet, BookOpen, Clock, RefreshCw } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { TIME_SLOTS } from '../../data/curriculumSeed';
import { exportToExcel } from '../../lib/export/excelExporter';
import { exportToPDF } from '../../lib/export/pdfExporter';

import { formatRoomName, formatSectionName } from '../../lib/formatters';

function getCellClass(rawSubject) {
  if (!rawSubject) return 'cell-free';
  const subject = typeof rawSubject === 'string' ? rawSubject : (rawSubject?.name || rawSubject?.subject || rawSubject?.code || '');
  if (subject === 'LUNCH' || subject === 'Break') return 'cell-lunch';
  if (subject === 'Free' || !subject) return 'cell-free';
  if (subject.includes('Lab') || subject.includes('Workshop')) return 'cell-lab';
  return 'cell-theory';
}

export default function FacultySchedulePage() {
  const { profile } = useAuthStore();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time synchronization with Firestore /schedules
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSchedules(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periodsList = TIME_SLOTS.SENIOR.periods; // VBIT Senior Period Matrix (8 periods)

  const facultyName = (profile?.name || profile?.displayName || '').toLowerCase();
  const facultyEmail = (profile?.email || '').toLowerCase();
  const facultyShort = facultyEmail.split('@')[0];

  // Aggregate weekly grid specifically for logged-in faculty
  const weeklyGrid = {};
  daysList.forEach(day => {
    weeklyGrid[day] = Array(periodsList.length).fill(null);
  });

  let totalClassesFound = 0;

  schedules.forEach(sched => {
    if (!sched.grid) return;
    const schedFullText = JSON.stringify(sched).toLowerCase();

    daysList.forEach(day => {
      const slots = sched.grid[day] || [];
      slots.forEach((rawSub, pIdx) => {
        if (!rawSub) return;

        let subName = '';
        let facName = '';
        let facId = '';

        if (typeof rawSub === 'string') {
          subName = rawSub;
        } else if (typeof rawSub === 'object') {
          subName = rawSub.subjectName || rawSub.name || rawSub.subject || rawSub.code || '';
          facName = rawSub.facultyName || rawSub.faculty || '';
          facId = rawSub.facultyId || '';
        }

        if (!subName || subName === 'Free' || subName === 'LUNCH' || subName === 'Break') return;

        const mappedFaculty = sched.facultyMap?.[`${day}_${pIdx}`];
        const mappedName = mappedFaculty?.name || '';
        const mappedEmail = mappedFaculty?.email || '';

        const combinedFac = `${facName} ${facId} ${mappedName} ${mappedEmail}`.toLowerCase();

        // Check if logged-in faculty is explicitly assigned to this specific slot
        const isDirectMatch = (facultyEmail && combinedFac.includes(facultyEmail)) ||
                              (facultyShort && facultyShort.length >= 3 && combinedFac.includes(facultyShort)) ||
                              (facultyName && facultyName.length >= 3 && combinedFac.includes(facultyName.split(' ')[0])) ||
                              (facultyEmail.includes('punitha') && combinedFac.includes('punitha'));

        if (isDirectMatch) {
          if (!weeklyGrid[day][pIdx]) {
            totalClassesFound++;
            const roomName = sched.room || '304';
            weeklyGrid[day][pIdx] = `${subName} (${sched.department || 'CSE-DS'} ${formatSectionName(sched.section || 'A')}, ${formatRoomName(roomName)})`;
          }
        }
      });
    });
  });

  const handleExportExcel = () => {
    const mockSched = {
      department: profile?.department || 'CSE-DS',
      year: 3, semester: 2, section: 'Faculty-Pool',
      room: 'Multi-Room',
      grid: weeklyGrid,
    };
    exportToExcel(mockSched, periodsList, `${profile?.name || 'Faculty'}_Weekly_Timetable`);
  };

  const handleExportPDF = () => {
    const mockSched = {
      department: profile?.department || 'CSE-DS',
      year: 3, semester: 2, section: 'Faculty-Pool',
      room: 'Multi-Room',
      grid: weeklyGrid,
    };
    exportToPDF(mockSched, periodsList, `${profile?.name || 'Faculty'}_Weekly_Timetable`);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} style={{ color: 'var(--accent-blue)' }} />
            My Weekly Class Timetable
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.813rem', marginTop: '2px' }}>
            Synced in real-time with published department schedules. Total Assigned Classes: <strong>{totalClassesFound}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportExcel} className="btn btn-ghost btn-sm" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button onClick={handleExportPDF} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.813rem' }}>Syncing weekly schedule from Firestore...</p>
      ) : (
        <div className="solid-card" style={{ padding: '14px', overflowX: 'auto' }}>
          <table className="timetable-grid" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '90px', padding: '8px 6px', background: 'var(--bg-elevated)' }}>Day / Timing</th>
                {periodsList.map((p, i) => (
                  <th key={i} style={{ padding: '6px 4px', fontSize: '0.7rem', textAlign: 'center' }}>
                    {p.label}<br/>
                    <span style={{ fontSize: '0.625rem', fontWeight: 400, opacity: 0.8 }}>
                      {p.start}-{p.end}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daysList.map(day => (
                <tr key={day}>
                  <td style={{ fontWeight: 700, background: 'var(--bg-elevated)', padding: '8px 6px' }}>{day}</td>
                  {weeklyGrid[day].map((cell, idx) => {
                    const displayVal = cell || (periodsList[idx]?.isLunch ? 'LUNCH' : 'Free');
                    return (
                      <td
                        key={idx}
                        className={getCellClass(displayVal)}
                        style={{
                          fontSize: '0.688rem',
                          padding: '6px 4px',
                          textAlign: 'center',
                          lineHeight: 1.2,
                          maxWidth: '120px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
