/**
 * SubstitutionListPage — Real-Time Faculty Substitution Exchange supporting Single Period & Full-Day Leave Coverage.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import useAuthStore from '../../stores/authStore';
import { UserCheck, Calendar, Clock, Plus, CheckCircle2, AlertCircle, Send, Sparkles, Layers } from 'lucide-react';
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
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [requestMode, setRequestMode] = useState('FULL_DAY'); // 'FULL_DAY' or 'SINGLE_PERIOD'
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodSlot, setPeriodSlot] = useState(VBIT_PERIODS[0]);
  const [section, setSection] = useState('CSE-DS A');
  const [subject, setSubject] = useState('Data Structures');
  const [reason, setReason] = useState('Casual Leave / Official Duty');

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
    try {
      if (requestMode === 'FULL_DAY') {
        // Create full day coverage requests for all scheduled slots
        await addDoc(collection(db, 'substitutions'), {
          requesterName: profile?.name || profile?.displayName || 'Faculty Member',
          requesterEmail: profile?.email || '',
          requesterUid: profile?.uid || '',
          date: requestDate,
          periodSlot: 'Full Day Absence (All Scheduled Classes)',
          isFullDay: true,
          section,
          subject: `${subject} & Scheduled Classes`,
          reason,
          status: 'OPEN',
          claimedBy: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'substitutions'), {
          requesterName: profile?.name || profile?.displayName || 'Faculty Member',
          requesterEmail: profile?.email || '',
          requesterUid: profile?.uid || '',
          date: requestDate,
          periodSlot,
          isFullDay: false,
          section,
          subject,
          reason,
          status: 'OPEN',
          claimedBy: null,
          createdAt: new Date().toISOString(),
        });
      }

      setShowRequestForm(false);
      setReason('');
      alert('Substitution request published in real time! Available colleagues can now claim to cover your classes.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit substitution request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimSubstitution = async (subId) => {
    if (!confirm('Would you like to volunteer as substitute instructor for this request?')) return;
    try {
      await updateDoc(doc(db, 'substitutions', subId), {
        status: 'CLAIMED',
        claimedByName: profile?.name || profile?.displayName || 'Substitute Instructor',
        claimedByEmail: profile?.email || '',
        claimedByUid: profile?.uid || '',
        claimedAt: new Date().toISOString(),
      });
      alert('Thank you! You have been assigned as the substitute instructor.');
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
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
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
              <input type="text" className="input-field" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. CSE-DS A" required />
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
                      onClick={() => handleClaimSubstitution(sub.id)}
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
