/**
 * SacDirectorDashboard.jsx — SAC Director Console (Tier 1 Venue Approval)
 * Reviews incoming requests in PENDING_SAC_APPROVAL stage and forwards to Principal or rejects.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { sacReviewBooking } from '../../lib/facilityBookingEngine';
import { Building2, CheckCircle2, XCircle, Clock, Send, Calendar, Users, AlertCircle, MessageSquare } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function SacDirectorDashboard() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'HISTORY'
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [actionType, setActionType] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'facility_bookings'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      setRequests(list.filter(b => b.status === 'PENDING_SAC_APPROVAL'));
      setAllHistory(list.filter(b => b.status !== 'PENDING_SAC_APPROVAL'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setSubmitting(true);
    try {
      await sacReviewBooking(reviewModalBooking.id, actionType, remarks, profile?.email || 'sacdirector@vbit.ac.in');
      alert(`Request for "${reviewModalBooking.eventTitle}" ${actionType === 'APPROVED' ? 'Approved & Forwarded to Principal' : 'Rejected'}.`);
      setReviewModalBooking(null);
      setRemarks('');
    } catch (err) {
      console.error(err);
      alert('Error submitting review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={28} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Student Activity Centre (SAC) Director Console
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tier 1 Multi-Level Approval Hub for VBIT Auditoriums & Departmental Venues
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Clock size={16} /> Pending SAC Review ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn ${activeTab === 'HISTORY' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <CheckCircle2 size={16} /> Review History ({allHistory.length})
        </button>
      </div>

      {/* Pending Queue */}
      {activeTab === 'PENDING' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading pending venue requests...</p>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: 'var(--accent-green)', opacity: 0.8 }} />
              <h3>All SAC Reviews Clear!</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>There are currently no venue booking requests waiting for SAC Director approval.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {requests.map(req => (
                <div
                  key={req.id}
                  className="solid-card"
                  style={{
                    padding: '20px', border: '1px solid var(--border-primary)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
                    background: 'var(--bg-elevated)', borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-purple">{req.clubName}</span>
                      <span className="badge badge-amber">Step 1: SAC Pending</span>
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {req.eventTitle}
                    </h3>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
                      🏛️ {req.facilityName}
                    </p>

                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                      <div><Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Date: <strong>{req.date}</strong> ({req.startTime} - {req.endTime})</div>
                      <div><Users size={13} style={{ display: 'inline', marginRight: '4px' }} /> Expected Attendance: <strong>{req.expectedAttendance}</strong></div>
                      <div>Submitted By: <strong>{req.bookedByName}</strong> ({req.designation || 'Lead'}) — <span style={{ fontFamily: 'var(--font-mono)' }}>{req.bookedByRollNumber}</span></div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.781rem', color: 'var(--text-tertiary)' }}>
                      <strong>Description:</strong> {req.description || 'No description provided.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setReviewModalBooking(req); setActionType('APPROVED'); setRemarks(''); }}
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={15} /> Approve & Forward
                    </button>
                    <button
                      onClick={() => { setReviewModalBooking(req); setActionType('REJECTED'); setRemarks(''); }}
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'HISTORY' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
              <thead>
                <tr>
                  <th>Event & Club</th>
                  <th>Facility</th>
                  <th>Date & Slot</th>
                  <th>Status</th>
                  <th>SAC Review Remarks</th>
                </tr>
              </thead>
              <tbody>
                {allHistory.map(h => (
                  <tr key={h.id}>
                    <td>
                      <strong>{h.eventTitle}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.clubName} ({h.bookedByName})</div>
                    </td>
                    <td>{h.facilityName}</td>
                    <td>{h.date} ({h.startTime} - {h.endTime})</td>
                    <td><span className={`badge badge-${h.status.includes('REJECTED') ? 'red' : h.status === 'APPROVED' ? 'green' : 'blue'}`}>{h.status}</span></td>
                    <td>{h.sacReview?.remarks || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: `1px solid ${actionType === 'APPROVED' ? 'var(--accent-primary)' : 'var(--danger)'}` }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '12px', color: actionType === 'APPROVED' ? 'var(--accent-primary)' : 'var(--danger)' }}>
              {actionType === 'APPROVED' ? 'Approve & Forward to Principal' : 'Reject Venue Allocation Request'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Event: <strong>{reviewModalBooking.eventTitle}</strong> ({reviewModalBooking.clubName}) at <strong>{reviewModalBooking.facilityName}</strong>.
            </p>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  SAC Director Review Remarks *
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={actionType === 'APPROVED' ? 'e.g. Recommended for college event schedule.' : 'Specify reason for rejection...'}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setReviewModalBooking(null)} className="btn btn-ghost">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn ${actionType === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ background: actionType === 'REJECTED' ? 'var(--danger)' : undefined, color: actionType === 'REJECTED' ? '#fff' : undefined }}
                >
                  {submitting ? 'Processing...' : actionType === 'APPROVED' ? 'Confirm & Forward to Principal' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
