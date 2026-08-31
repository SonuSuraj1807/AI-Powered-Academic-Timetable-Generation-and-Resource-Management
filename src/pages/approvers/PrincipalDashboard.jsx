/**
 * PrincipalDashboard.jsx — Principal Console (Tier 2 Final Venue Approval)
 * Reviews requests in SAC_APPROVED_WAITING_FOR_PRINCIPAL stage and grants final approval or rejects.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { principalReviewBooking } from '../../lib/facilityBookingEngine';
import { Award, CheckCircle2, XCircle, Clock, Calendar, Users, ShieldCheck, AlertCircle } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function PrincipalDashboard() {
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
      
      setRequests(list.filter(b => b.status === 'SAC_APPROVED_WAITING_FOR_PRINCIPAL'));
      setAllHistory(list.filter(b => b.status !== 'SAC_APPROVED_WAITING_FOR_PRINCIPAL' && b.status !== 'PENDING_SAC_APPROVAL'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setSubmitting(true);
    try {
      await principalReviewBooking(reviewModalBooking.id, actionType, remarks, profile?.email || 'principal@vbit.ac.in');
      alert(`Final Approval ${actionType === 'APPROVED' ? 'Granted! Venue booking is confirmed.' : 'Rejected'}.`);
      setReviewModalBooking(null);
      setRemarks('');
    } catch (err) {
      console.error(err);
      alert('Error submitting final review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Award size={28} style={{ color: 'var(--accent-green)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Principal Office Console — Final Venue Allocation Authority
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tier 2 Final Sanction Hub for VBIT Auditoriums & Departmental Venues (Requires Prior SAC Approval)
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
          <Clock size={16} /> Awaiting Principal Sanction ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn ${activeTab === 'HISTORY' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <CheckCircle2 size={16} /> Decision History ({allHistory.length})
        </button>
      </div>

      {/* Pending Queue */}
      {activeTab === 'PENDING' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading requests awaiting Principal approval...</p>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: 'var(--accent-green)', opacity: 0.8 }} />
              <h3>No Requests Pending Principal Sanction</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>All SAC-approved venue booking requests have been processed.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {requests.map(req => (
                <div
                  key={req.id}
                  className="solid-card"
                  style={{
                    padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
                    background: 'var(--bg-elevated)', borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-purple">{req.clubName}</span>
                      <span className="badge badge-blue">Step 2: Principal Review</span>
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
                      <div>Representative: <strong>{req.bookedByName}</strong> ({req.designation || 'Lead'}) — <span style={{ fontFamily: 'var(--font-mono)' }}>{req.bookedByRollNumber}</span></div>
                    </div>

                    {/* SAC Director Review Badge */}
                    {req.sacReview && (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.781rem', color: 'var(--accent-green)', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={14} /> Tier 1 Approval Granted by SAC Director
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          "{req.sacReview.remarks}" — <span style={{ fontSize: '0.7rem' }}>{new Date(req.sacReview.reviewedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setReviewModalBooking(req); setActionType('APPROVED'); setRemarks(''); }}
                      className="btn btn-primary"
                      style={{ flex: 1, background: 'var(--accent-green)', borderColor: 'var(--accent-green)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={15} /> Grant Final Approval
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
                  <th>Final Status</th>
                  <th>SAC Director Remarks</th>
                  <th>Principal Remarks</th>
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
                    <td><span className={`badge badge-${h.status === 'APPROVED' ? 'green' : 'red'}`}>{h.status}</span></td>
                    <td>{h.sacReview?.remarks || 'N/A'}</td>
                    <td>{h.principalReview?.remarks || 'N/A'}</td>
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
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: `1px solid ${actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)'}` }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '12px', color: actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)' }}>
              {actionType === 'APPROVED' ? 'Grant Final Sanction (Principal Approval)' : 'Reject Venue Allocation Request'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Event: <strong>{reviewModalBooking.eventTitle}</strong> ({reviewModalBooking.clubName}) at <strong>{reviewModalBooking.facilityName}</strong>.
            </p>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Principal Review Remarks *
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={actionType === 'APPROVED' ? 'e.g. Final sanction granted. Maintain college guidelines.' : 'Specify reason for rejection...'}
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
                  className="btn btn-primary"
                  style={{ background: actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)', borderColor: actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)' }}
                >
                  {submitting ? 'Sanctioning...' : actionType === 'APPROVED' ? 'Grant Final Sanction' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
