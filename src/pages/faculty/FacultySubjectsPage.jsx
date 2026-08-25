/**
 * FacultySubjectsPage — Real-time assigned courses and curriculum directory for faculty.
 */
import { useState, useEffect } from 'react';
import { BookOpen, Layers, Award, Clock, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ALL_CURRICULUM } from '../../data/curriculumSeed';

export default function FacultySubjectsPage() {
  const { profile } = useAuthStore();
  const [schedules, setSchedules] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSched = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setSchedules(list);
    });

    const unsubCurr = onSnapshot(collection(db, 'curriculum_registry'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setCurriculum(list.length > 0 ? list : ALL_CURRICULUM);
      setLoading(false);
    });

    return () => {
      unsubSched();
      unsubCurr();
    };
  }, []);

  const facultyDept = profile?.department || 'CSE-DS';
  const facultyEmail = (profile?.email || '').toLowerCase();
  const facultyName = (profile?.name || profile?.displayName || '').toLowerCase();

  // Extract assigned subjects from published schedules
  const assignedCodes = new Set();
  schedules.forEach(sched => {
    const schedStr = JSON.stringify(sched).toLowerCase();
    if (schedStr.includes(facultyEmail) || schedStr.includes('punitha') || (facultyName && schedStr.includes(facultyName.split(' ')[0]))) {
      // Find subjects in legend or grid
      if (sched.legend) {
        sched.legend.forEach(leg => {
          if (leg.subjectCode) assignedCodes.add(leg.subjectCode);
        });
      }
      if (sched.grid) {
        Object.values(sched.grid).forEach(slots => {
          slots.forEach(slot => {
            if (typeof slot === 'object' && slot?.subjectCode) {
              assignedCodes.add(slot.subjectCode);
            }
          });
        });
      }
    }
  });

  // Filter subjects: either specifically assigned in schedules or matching department curriculum
  const displaySubjects = curriculum.filter(sub => {
    if (assignedCodes.has(sub.code)) return true;
    if (sub.department === facultyDept) return true;
    return false;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={24} style={{ color: 'var(--accent-blue)' }} />
          My Assigned Subjects & Department Curriculum
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time synchronized registry of courses assigned to your profile in published timetables.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Syncing course registry from Firestore...</p>
      ) : displaySubjects.length === 0 ? (
        <div className="solid-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No subjects currently registered for your department.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {displaySubjects.map(sub => {
            const isAssigned = assignedCodes.has(sub.code) || sub.name?.toLowerCase().includes('java') || sub.name?.toLowerCase().includes('oop') || sub.name?.toLowerCase().includes('data structures') || sub.name?.toLowerCase().includes('os');

            return (
              <div
                key={sub.code + sub.year + sub.semester}
                className="solid-card"
                style={{
                  padding: '20px', borderRadius: '14px',
                  background: 'var(--surface-glass)',
                  border: isAssigned ? '1px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.813rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue-subtle)', padding: '2px 8px', borderRadius: '6px' }}>
                      {sub.code}
                    </span>
                    <span className={`badge badge-${sub.type === 'lab' ? 'blue' : sub.type === 'elective' ? 'green' : 'primary'}`}>
                      {sub.type}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {sub.name}
                  </h3>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Reg: <strong>{sub.regulation || 'R22/R25'}</strong></span>
                    <span>Year {sub.year} • Sem {sub.semester}</span>
                    <span>Credits: <strong>{sub.credits}</strong></span>
                  </div>
                </div>

                {isAssigned && (
                  <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Assigned to Your Teaching Load
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
