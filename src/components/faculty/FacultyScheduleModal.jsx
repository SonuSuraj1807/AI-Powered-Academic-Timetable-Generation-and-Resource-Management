/**
 * FacultyScheduleModal — Displays detailed subject assignments, weekly timetable matrix, 
 * period time slots, and active substitution duties for a specific faculty member.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { X, Calendar, BookOpen, Clock, UserCheck, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { WEEKDAYS, TIME_SLOTS } from '../../data/curriculumSeed';

export default function FacultyScheduleModal({ faculty, isOpen, onClose }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !faculty) return;

    const unsub = onSnapshot(collection(db, 'schedules'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSchedules(list);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, faculty]);

  if (!isOpen || !faculty) return null;

  const facId = faculty.uid || faculty.id;
  const facName = faculty.name?.toLowerCase().trim();

  // 1. Extract assigned subjects across all schedules
  const assignedSubjectsMap = new Map();
  // 2. Build weekly timetable matrix
  const weeklyGrid = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
  };

  schedules.forEach(sched => {
    if (!sched.grid) return;
    const timeConfig = sched.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;

    WEEKDAYS.forEach(day => {
      const daySlots = sched.grid[day] || [];
      daySlots.forEach((slot, idx) => {
        if (!slot || slot.type === 'break' || slot.type === 'lunch') return;

        const matchesId = slot.facultyId === facId;
        const matchesName = slot.facultyName && slot.facultyName.toLowerCase().includes(facName);

        if (matchesId || matchesName) {
          // Track subject
          if (slot.subjectCode && slot.subjectName) {
            assignedSubjectsMap.set(slot.subjectCode, {
              code: slot.subjectCode,
              name: slot.subjectName,
              department: sched.department,
              year: sched.year,
              section: sched.section,
              type: slot.type,
            });
          }

          // Slot time range
          const periodInfo = timeConfig.periods[idx] || { label: `Period ${idx + 1}`, start: '09:50', end: '10:40' };

          weeklyGrid[day].push({
            day,
            periodIndex: idx,
            periodLabel: periodInfo.label,
            timeRange: `${periodInfo.start} – ${periodInfo.end}`,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
            department: sched.department,
            year: sched.year,
            section: sched.section,
            room: sched.room || '301',
            type: slot.type,
            isSubstitution: !!slot.isSubstitution,
            originalFacultyName: slot.originalFacultyName,
          });
        }
      });
    });
  });

  const assignedSubjects = Array.from(assignedSubjectsMap.values());
  const totalWeeklyPeriods = Object.values(weeklyGrid).reduce((acc, list) => acc + list.length, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '850px',
          width: '100%',
          maxHeight: '85vh',
          boxShadow: 'var(--shadow-2xl)',
          display: 'flex', flexDirection: 'column', gap: '20px',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>{faculty.name}</h2>
              <span className="badge badge-blue">{faculty.department}</span>
            </div>
            <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {faculty.designation} • {faculty.email}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: '6px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
          {/* Section 1: Assigned Subjects for Semester */}
          <div>
            <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
              Assigned Semester Courses & Labs ({assignedSubjects.length})
            </h3>

            {assignedSubjects.length === 0 ? (
              <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>No courses currently assigned in published schedules.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {assignedSubjects.map((sub, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{sub.code}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', margin: '2px 0' }}>{sub.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Year {sub.year} Sec {sub.section} • {sub.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Weekly Schedule & Substitution Duties */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.938rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
                Weekly Period Schedule ({totalWeeklyPeriods} periods/week)
              </h3>
            </div>

            {totalWeeklyPeriods === 0 ? (
              <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>No period time slots assigned for this week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {WEEKDAYS.map(day => {
                  const daySlots = weeklyGrid[day] || [];
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={day} style={{ background: 'var(--surface-glass)', borderRadius: '12px', border: '1px solid var(--border-primary)', padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{day}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{daySlots.length} slot(s)</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {daySlots.map((slot, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 12px', borderRadius: '8px',
                              background: slot.isSubstitution ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-elevated)',
                              border: `1px solid ${slot.isSubstitution ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-primary)'}`,
                              fontSize: '0.75rem',
                              position: 'relative',
                            }}
                          >
                            {/* Substitution Badge */}
                            {slot.isSubstitution && (
                              <div style={{
                                position: 'absolute', top: '6px', right: '6px',
                                background: 'var(--accent-amber)', color: 'white',
                                fontSize: '0.625rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                                display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                                <UserCheck size={10} /> SUBSTITUTION
                              </div>
                            )}

                            <div style={{ fontWeight: 700, color: slot.isSubstitution ? 'var(--accent-amber)' : 'var(--accent-blue)', marginBottom: '2px' }}>
                              {slot.periodLabel} ({slot.timeRange})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.813rem', color: 'var(--text-primary)' }}>
                              {slot.subjectName}
                            </div>
                            <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Year {slot.year} Sec {slot.section} • Room {slot.room}
                            </div>
                            {slot.isSubstitution && slot.originalFacultyName && (
                              <div style={{ fontSize: '0.688rem', color: 'var(--accent-amber)', marginTop: '4px', fontWeight: 600 }}>
                                Substituted for: {slot.originalFacultyName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
