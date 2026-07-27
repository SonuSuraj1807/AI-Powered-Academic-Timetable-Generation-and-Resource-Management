/**
 * SubstitutionListPage — Dedicated Faculty portal page to view assigned substitution classes & real-time alerts.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import useAuthStore from '../../stores/authStore';
import { UserCheck, Calendar, Clock, AlertCircle, CheckCircle2, Bell } from 'lucide-react';

export default function SubstitutionListPage() {
  const { user } = useAuthStore();
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUID', '==', user.uid),
      where('type', '==', 'substitution')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSubstitutions(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserCheck size={24} style={{ color: 'var(--accent-primary)' }} />
          My Substitution Assignments
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          View classes assigned to you as a substitute instructor across sections.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading substitution assignments...
        </div>
      ) : substitutions.length === 0 ? (
        <div className="solid-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--success)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No Substitution Duties Assigned
          </h3>
          <p style={{ fontSize: '0.813rem' }}>You currently have no pending substitute classes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {substitutions.map(sub => (
            <div
              key={sub.id}
              className="solid-card"
              style={{
                padding: '20px',
                borderLeft: '4px solid var(--accent-blue)',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} style={{ color: 'var(--accent-amber)' }} />
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{sub.title}</span>
                </div>
                <span className="badge badge-blue">
                  {new Date(sub.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sub.body}
              </p>

              {sub.metadata?.slots && sub.metadata.slots.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '4px' }}>
                  {sub.metadata.slots.map((slot, i) => (
                    <div key={i} style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', fontSize: '0.813rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{slot.periodLabel} • Sec {slot.section}</div>
                      <div>{slot.subjectName} ({slot.subjectCode})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Year {slot.year} • Room {slot.room || '301'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
