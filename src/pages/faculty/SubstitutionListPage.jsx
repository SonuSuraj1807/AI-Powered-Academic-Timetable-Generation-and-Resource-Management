import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import { UserCheck, Calendar, Clock, Plus, CheckCircle2, AlertCircle, Send, Sparkles, Layers, User, Users } from 'lucide-react';
import { TIME_SLOTS } from '../../data/curriculumSeed';

const VBIT_PERIODS = [
  'Period 1 (09:50 AM - 10:40 AM)',
  'Period 2 (10:40 AM - 11:30 AM)',
  'Period 3 (11:30 AM - 12:20 PM)',
  'Period 4 (12:20 PM - 01:10 PM)',
  'Period 5 (01:50 PM - 02:40 PM)',
  'Period 6 (02:40 PM - 03:30 PM)',
  'Period 7 (03:30 PM - 04:20 PM)',
];

export default function SubstitutionListPage() {
  const { profile } = useAuthStore();
  const sendNotification = useNotificationStore(state => state.sendNotification);
  const [substitutions, setSubstitutions] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [requestMode, setRequestMode] = useState('FULL_DAY'); // 'FULL_DAY' or 'SINGLE_PERIOD'
  const [targetType, setTargetType] = useState('ALL_FACULTY'); // 'ALL_FACULTY' or 'SPECIFIC_FACULTY'
  const [selectedFacultyEmail, setSelectedFacultyEmail] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodSlot, setPeriodSlot] = useState(VBIT_PERIODS[0]);
  const [section, setSection] = useState('CSE-DS Sec A');
  const [subject, setSubject] = useState('Data Structures');
  const [reason, setReason] = useState('Casual Leave / Official Duty');

  // Fetch faculty members in the department
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'faculty'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setFacultyList(list);
    });
    return () => unsub();
  }, []);

  // Real-time synchronization with Cloud Firestore /substitutions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'substitutions'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setSubstitutions(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isSpecific = targetType === 'SPECIFIC_FACULTY' && selectedFacultyEmail;
    const targetFac = facultyList.find(f => f.email === selectedFacultyEmail);

    try {
      const docData = {
        requesterName: profile?.name || profile?.displayName || 'Faculty Member',
        requesterEmail: profile?.email || '',
        requesterUid: profile?.uid || '',
        requesterDept: profile?.department || 'CSE-DS',
        date: requestDate,
        periodSlot: requestMode === 'FULL_DAY' ? 'Full Day Absence (All Scheduled Classes)' : periodSlot,
        isFullDay: requestMode === 'FULL_DAY',
        section,
        subject: requestMode === 'FULL_DAY' ? `${subject} & Scheduled Classes` : subject,
        reason,
        targetType,
        targetFacultyEmail: isSpecific ? selectedFacultyEmail : null,
        targetFacultyName: isSpecific ? (targetFac?.name || selectedFacultyEmail) : 'All Department Faculty',
        status: 'OPEN',
        claimedBy: null,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'substitutions'), docData);

      // Send real-time notification to target faculty/department
      await sendNotification({
        title: `Substitution Request 🔄 (${isSpecific ? 'Direct Request' : 'Open Coverage'})`,
        message: `${profile?.name || 'A colleague'} requested coverage for ${subject} (${section}) on ${requestDate}.`,
        type: 'warning',
        targetRole: 'faculty',
        targetDepartment: profile?.department || 'CSE-DS',
        targetEmail: isSpecific ? selectedFacultyEmail : null,
      });

      setShowRequestForm(false);
      setReason('');
      alert(`Substitution request published successfully! ${isSpecific ? `Direct request sent to ${targetFac?.name || selectedFacultyEmail}.` : 'Broadcasted to all department colleagues.'}`);
    } catch (err) {
      console.error(err);
      alert('Failed to submit substitution request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimSubstitution = async (sub) => {
    if (!confirm(`Would you like to volunteer as substitute instructor for ${sub.requesterName}'s class (${sub.subject})?`)) return;
    try {
      const claimerName = profile?.name || profile?.displayName || 'Substitute Instructor';

      await updateDoc(doc(db, 'substitutions', sub.id), {
        status: 'CLAIMED',
        claimedByName: claimerName,
        claimedByEmail: profile?.email || '',
        claimedByUid: profile?.uid || '',
        claimedAt: new Date().toISOString(),
      });

      // 1. Notify the requester faculty
      await sendNotification({
        title: `Substitution Accepted! ✅`,
        message: `${claimerName} has agreed to cover your class for ${sub.subject} (${sub.section}) on ${sub.date}.`,
        type: 'success',
        targetRole: 'faculty',
        targetEmail: sub.requesterEmail,
      });

      // 2. Notify ONLY the students of the affected class section
      const parsedDept = sub.requesterDept || profile?.department || 'CSE-DS';
      const parsedSec = sub.section?.includes('Sec') ? sub.section.split('Sec')[1].trim() : (sub.section || 'A');

      await sendNotification({
        title: `Class Instructor Substitution Notice 📚`,
        message: `Attention ${sub.section} Students: Your ${sub.subject} class on ${sub.date} (${sub.periodSlot}) will be taken by substitute instructor ${claimerName}.`,
        type: 'info',
        targetRole: 'student',
        targetDepartment: parsedDept,
        targetSection: parsedSec,
      });

      alert('Thank you! You have been assigned as the substitute instructor. Notification sent to requester & affected class students.');
    } catch (err) {
      console.error(err);
      alert('Error claiming substitution: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={24} style={{ color: 'var(--accent-primary)' }} />
            Faculty Substitution Exchange
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Submit Full-Day Leave or Single-Period substitution requests live to your colleagues.
          </p>
        </div>

        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Request Substitution
        </button>
      </div>

      {/* Request Substitution Form Modal / Section */}
      {showRequestForm && (
        <div className="solid-card animate-fade-in-up" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent-primary)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} style={{ color: 'var(--accent-primary)' }} /> Submit Substitution Request
          </h3>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRequestMode('FULL_DAY')}
              className={`btn ${requestMode === 'FULL_DAY' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.813rem', padding: '8px 16px' }}
            >
              📅 Full Day Leave Coverage
            </button>
            <button
              type="button"
              onClick={() => setRequestMode('SINGLE_PERIOD')}
              className={`btn ${requestMode === 'SINGLE_PERIOD' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.813rem', padding: '8px 16px' }}
            >
              ⏰ Specific Period Coverage
            </button>
          </div>

          {/* Target Recipient Selector (2 Options) */}
          <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              🎯 Target Recipient (Request Scope)
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTargetType('ALL_FACULTY')}
                className={`btn ${targetType === 'ALL_FACULTY' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.813rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={14} /> Open to All Department Faculty
              </button>
              <button
                type="button"
                onClick={() => setTargetType('SPECIFIC_FACULTY')}
                className={`btn ${targetType === 'SPECIFIC_FACULTY' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.813rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <User size={14} /> Direct Specific Faculty Request
              </button>
            </div>

            {targetType === 'SPECIFIC_FACULTY' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Select Faculty Member to Request
                </label>
                <select
                  className="input-field"
                  value={selectedFacultyEmail}
                  onChange={e => setSelectedFacultyEmail(e.target.value)}
                  required
                >
                  <option value="">-- Select Faculty Member --</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.email}>{f.name} ({f.department || 'CSE-DS'} • {f.email})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <form onSubmit={handleCreateRequest} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Absence Date</label>
              <input type="date" className="input-field" value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
            </div>

            {requestMode === 'SINGLE_PERIOD' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>VBIT Official Period</label>
                <select className="input-field" value={periodSlot} onChange={e => setPeriodSlot(e.target.value)}>
                  {VBIT_PERIODS.map((slot, i) => (
                    <option key={i} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department & Section</label>
              <input type="text" className="input-field" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. CSE-DS Sec A" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Primary Subject</label>
              <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Data Structures" required />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason for Leave / Absence</label>
              <input type="text" className="input-field" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Casual Leave / Conference / Health Emergency" required />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowRequestForm(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Publishing...' : 'Publish Substitution Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Real-time Substitutions Board */}
      <div className="solid-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px' }}>
          Live Substitution Exchange Directory ({substitutions.length})
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Syncing substitution requests in real time...</p>
        ) : substitutions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4, color: 'var(--success)' }} />
            <p style={{ fontSize: '0.875rem' }}>No open substitution requests currently found in database.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {substitutions.map(sub => {
              const isMine = sub.requesterEmail?.toLowerCase() === profile?.email?.toLowerCase();
              return (
                <div
                  key={sub.id}
                  style={{
                    padding: '18px', borderRadius: '12px',
                    background: 'var(--surface-glass)',
                    border: '1px solid var(--border-primary)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge badge-${sub.status === 'CLAIMED' ? 'green' : 'amber'}`}>
                        {sub.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{sub.date}</span>
                    </div>

                    <div style={{ fontSize: '0.938rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sub.subject} ({sub.section})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '2px' }}>
                      {sub.periodSlot}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Requested by: <strong>{sub.requesterName}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Target: {sub.targetFacultyName || 'All Department Faculty'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Reason: {sub.reason}
                    </div>

                    {sub.claimedByName && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: 'var(--accent-green-subtle)' }}>
                        ✅ Covered by: <strong>{sub.claimedByName}</strong>
                      </div>
                    )}
                  </div>

                  {sub.status === 'OPEN' && !isMine && (
                    <button
                      onClick={() => handleClaimSubstitution(sub)}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Sparkles size={14} /> Cover This Class
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
