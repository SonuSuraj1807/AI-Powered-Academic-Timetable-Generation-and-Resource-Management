import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, getDocs, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { UserCheck, Sparkles, AlertTriangle, CheckCircle2, Search, Calendar, ShieldCheck, Clock } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { findSubstitutes } from '../../lib/scheduling/SmartSwapEngine';

export default function SubstitutionEnginePage() {
  const { user } = useAuthStore();
  const [facultyList, setFacultyList] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedAbsentId, setSelectedAbsentId] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [candidates, setCandidates] = useState([]);
  const [affectedSlots, setAffectedSlots] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const unsubFac = onSnapshot(collection(db, 'faculty'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setFacultyList(list);
    });

    const unsubSched = onSnapshot(collection(db, 'schedules'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSchedules(list);
      setLoading(false);
    });

    return () => {
      unsubFac();
      unsubSched();
    };
  }, []);

  const handleSearchSubstitutes = () => {
    if (!selectedAbsentId) {
      alert('Please select an absent faculty member.');
      return;
    }
    setIsSearching(true);

    const absentFaculty = facultyList.find(f => (f.uid || f.id) === selectedAbsentId);

    // Find affected slots for absent faculty on the selected day
    const affected = [];
    schedules.forEach(sched => {
      if (!sched.grid || !sched.grid[selectedDay]) return;
      sched.grid[selectedDay].forEach((slot, idx) => {
        if (!slot) return;
        const isMatch =
          slot.facultyId === selectedAbsentId ||
          (Array.isArray(slot.facultyIds) && slot.facultyIds.includes(selectedAbsentId)) ||
          (absentFaculty && slot.facultyName && (
            slot.facultyName.toLowerCase().includes(absentFaculty.name.toLowerCase()) ||
            absentFaculty.name.toLowerCase().includes(slot.facultyName.toLowerCase())
          ));

        if (isMatch) {
          affected.push({
            scheduleId: sched.id,
            department: sched.department,
            regulation: sched.regulation,
            year: sched.year,
            section: sched.section,
            day: selectedDay,
            periodIndex: idx,
            periodLabel: `Period ${idx + 1}`,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
            type: slot.type,
          });
        }
      });
    });

    setAffectedSlots(affected);

    if (affected.length === 0) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }

    // Run SmartSwapEngine
    const ranked = findSubstitutes({
      absentFacultyId: selectedAbsentId,
      affectedSlots: affected,
      allFaculty: facultyList,
      allSchedules: schedules,
      weekStart: new Date(),
    });

    setCandidates(ranked);
    setIsSearching(false);
  };

  const handleAssignSubstitute = async () => {
    if (!selectedSubstituteId || affectedSlots.length === 0) return;
    setIsAssigning(true);

    const subFaculty = facultyList.find(f => f.uid === selectedSubstituteId || f.id === selectedSubstituteId);
    const absentFaculty = facultyList.find(f => f.uid === selectedAbsentId || f.id === selectedAbsentId);

    try {
      // 1. Update published schedules in Firestore with the substitute name & tag
      for (const slot of affectedSlots) {
        const targetSchedule = schedules.find(s => s.id === slot.scheduleId);
        if (targetSchedule && targetSchedule.grid && targetSchedule.grid[slot.day]) {
          const newGrid = JSON.parse(JSON.stringify(targetSchedule.grid));
          newGrid[slot.day][slot.periodIndex] = {
            ...newGrid[slot.day][slot.periodIndex],
            facultyId: subFaculty.uid || subFaculty.id,
            facultyName: subFaculty.name,
            originalFacultyName: absentFaculty?.name,
            isSubstitution: true,
          };

          await updateDoc(doc(db, 'schedules', slot.scheduleId), { grid: newGrid });
        }
      }

      // 2. Dispatch real-time notification to substitute faculty's portal
      await addDoc(collection(db, 'notifications'), {
        recipientUID: subFaculty.uid || subFaculty.id,
        recipientEmail: subFaculty.email,
        type: 'substitution',
        title: '🚨 Faculty Substitution Assigned',
        body: `You have been assigned as substitute for ${absentFaculty?.name || 'a colleague'} on ${selectedDay} for ${affectedSlots.length} period(s): ${affectedSlots.map(s => `${s.subjectCode} (Sec ${s.section})`).join(', ')}.`,
        status: 'unread',
        timestamp: new Date().toISOString(),
        metadata: {
          absentFacultyName: absentFaculty?.name,
          day: selectedDay,
          periodsCount: affectedSlots.length,
          slots: affectedSlots,
        },
      });

      alert(`Successfully assigned ${subFaculty.name} as substitute! Real-time notification delivered to their portal.`);
      setSelectedSubstituteId('');
      setAffectedSlots([]);
      setCandidates([]);
    } catch (err) {
      console.error('Error assigning substitute:', err);
      alert('Failed to assign substitute: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserCheck size={24} style={{ color: 'var(--accent-primary)' }} />
          Faculty Substitution Engine & Real-Time Dispatcher
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Constraint-aware substitution engine. Finds free, expert faculty and dispatches real-time alerts directly to their portal.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Form & Search Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector Card */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} style={{ color: 'var(--accent-blue)' }} />
              Select Absence Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Absent Faculty Member
                </label>
                <select
                  className="input-field"
                  value={selectedAbsentId}
                  onChange={e => setSelectedAbsentId(e.target.value)}
                >
                  <option value="">-- Select Absent Faculty --</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.uid || f.id}>{f.name} ({f.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Day of Absence
                </label>
                <select
                  className="input-field"
                  value={selectedDay}
                  onChange={e => setSelectedDay(e.target.value)}
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSearchSubstitutes}
              disabled={isSearching || !selectedAbsentId}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {isSearching ? 'Searching Free Faculty...' : '🔍 Find Optimal Substitutes'}
            </button>
          </div>

          {/* Affected Classes View */}
          {affectedSlots.length > 0 && (
            <div className="solid-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-amber)' }}>
                ⚠️ Affected Classes for {facultyList.find(f => (f.uid || f.id) === selectedAbsentId)?.name} on {selectedDay} ({affectedSlots.length} periods)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {affectedSlots.map((slot, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{slot.periodLabel} • Section {slot.section}</div>
                    <div>{slot.subjectName} ({slot.subjectCode})</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Year {slot.year} • {slot.department}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ranked Candidates */}
          {candidates.length > 0 && (
            <div className="solid-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
                ⭐ AI-Ranked Substitute Recommendations
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {candidates.map(cand => {
                  const isSelected = selectedSubstituteId === cand.facultyId;
                  return (
                    <div
                      key={cand.facultyId}
                      onClick={() => cand.canCoverAll && setSelectedSubstituteId(cand.facultyId)}
                      style={{
                        padding: '14px 16px', borderRadius: '12px',
                        background: isSelected ? 'var(--accent-blue-subtle)' : cand.canCoverAll ? 'var(--surface-glass)' : 'rgba(239, 68, 68, 0.05)',
                        border: `1.5px solid ${isSelected ? 'var(--accent-blue)' : cand.canCoverAll ? 'var(--border-primary)' : 'rgba(239, 68, 68, 0.2)'}`,
                        cursor: cand.canCoverAll ? 'pointer' : 'not-allowed',
                        opacity: cand.canCoverAll ? 1 : 0.6,
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.938rem' }}>{cand.facultyName}</span>
                          <span className="badge badge-primary">{cand.department}</span>
                          {cand.canCoverAll ? (
                            <span className="badge badge-green">100% Available</span>
                          ) : (
                            <span className="badge badge-red">Schedule Conflict</span>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--accent-blue)' }}>
                          Score: {cand.score}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {cand.matchReasons.map((r, idx) => (
                          <span key={idx} style={{ color: 'var(--success)', fontWeight: 500 }}>✓ {r}</span>
                        ))}
                        {cand.conflicts.map((c, idx) => (
                          <span key={idx} style={{ color: 'var(--danger)', fontWeight: 500 }}>✕ {c}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Confirm & Dispatch */}
        <div className="solid-card" style={{ padding: '20px', sticky: 'top', top: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            Confirm & Dispatch
          </h3>

          {!selectedSubstituteId ? (
            <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
              Select an available candidate from the list to assign and dispatch substitution alerts.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', background: 'var(--accent-blue-subtle)', borderRadius: '10px', fontSize: '0.813rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>Selected Substitute:</div>
                <div style={{ fontSize: '0.938rem', fontWeight: 800 }}>
                  {candidates.find(c => c.facultyId === selectedSubstituteId)?.facultyName}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Assigning will instantly update the official timetable grid and send a push notification to their personal faculty portal.
              </div>

              <button
                onClick={handleAssignSubstitute}
                disabled={isAssigning}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {isAssigning ? 'Dispatching Notification...' : '🚀 Confirm & Send Portal Notification'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
