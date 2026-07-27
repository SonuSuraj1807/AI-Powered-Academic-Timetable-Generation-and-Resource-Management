/**
 * GlobalSearchModal — Real-time search across schedules, faculty, and subjects.
 */
import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, Calendar, Users, BookOpen, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearchModal({ searchQuery, setSearchQuery, isOpen, onClose }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [curriculum, setCurriculum] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubSched = onSnapshot(collection(db, 'schedules'), snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSchedules(list);
    });

    const unsubFac = onSnapshot(collection(db, 'faculty'), snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setFaculty(list);
    });

    const unsubCurr = onSnapshot(collection(db, 'curriculum_registry'), snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCurriculum(list);
    });

    return () => {
      unsubSched();
      unsubFac();
      unsubCurr();
    };
  }, [isOpen]);

  if (!isOpen || !searchQuery.trim()) return null;

  const queryLower = searchQuery.toLowerCase().trim();

  // Filter matching results
  const matchedFaculty = faculty.filter(f => 
    f.name.toLowerCase().includes(queryLower) ||
    f.email.toLowerCase().includes(queryLower) ||
    f.department.toLowerCase().includes(queryLower)
  );

  const matchedSchedules = schedules.filter(s => 
    s.id.toLowerCase().includes(queryLower) ||
    s.department.toLowerCase().includes(queryLower) ||
    `section ${s.section}`.toLowerCase().includes(queryLower) ||
    `year ${s.year}`.toLowerCase().includes(queryLower) ||
    (s.room && s.room.toLowerCase().includes(queryLower))
  );

  const matchedSubjects = curriculum.filter(c => 
    c.name.toLowerCase().includes(queryLower) ||
    c.code.toLowerCase().includes(queryLower)
  );

  const totalResults = matchedFaculty.length + matchedSchedules.length + matchedSubjects.length;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '80px', paddingLeft: '20px', paddingRight: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '650px',
          width: '100%',
          maxHeight: '520px',
          boxShadow: 'var(--shadow-2xl)',
          display: 'flex', flexDirection: 'column', gap: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', pb: '12px', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '0.938rem', fontWeight: 700 }}>Search Results ({totalResults})</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
        </div>

        {/* Results Body */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
          {totalResults === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.875rem' }}>No results found matching "{searchQuery}"</p>
            </div>
          ) : (
            <>
              {/* Faculty Results */}
              {matchedFaculty.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} /> Faculty Members ({matchedFaculty.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchedFaculty.map(f => (
                      <div
                        key={f.id}
                        onClick={() => { navigate(`/admin/faculty?q=${encodeURIComponent(f.name)}`); onClose(); }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', background: 'var(--surface-glass)',
                          border: '1px solid var(--border-primary)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{f.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{f.designation} • {f.department} • {f.email}</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedules Results */}
              {matchedSchedules.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> Published Timetables ({matchedSchedules.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchedSchedules.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { navigate('/admin/schedules'); onClose(); }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', background: 'var(--surface-glass)',
                          border: '1px solid var(--border-primary)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.department} — Year {s.year} Sec {s.section}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Regulation: {s.regulation} • Room: {s.room || '301'}</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Results */}
              {matchedSubjects.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} /> Curriculum Subjects ({matchedSubjects.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchedSubjects.map(c => (
                      <div
                        key={c.id || c.code}
                        onClick={() => { navigate('/admin/curriculum'); onClose(); }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', background: 'var(--surface-glass)',
                          border: '1px solid var(--border-primary)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.code} — {c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.type} • {c.credits} cr • Year {c.year} Sem {c.semester}</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
