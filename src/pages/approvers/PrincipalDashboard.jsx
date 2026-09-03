import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { principalReviewBooking } from '../../lib/facilityBookingEngine';
import { Award, CheckCircle2, XCircle, Clock, Calendar, Users, ShieldCheck, FileCheck2, X, Building2 } from 'lucide-react';
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
      await principalReviewBooking(reviewModalBooking.id, actionType, remarks, profile?.email || 'principal@vbithyd.ac.in');
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

  const approvedCount = allHistory.filter(h => h.status === 'APPROVED').length;
  const rejectedCount = allHistory.filter(h => h.status.includes('REJECTED')).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header Banner */}
      <div
        className="solid-card animate-fade-in"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
          border: '1px solid var(--accent-green)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--accent-green)',
            }}
          >
            <Award size={26} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '4px' }}>Tier-2 Executive Sanction Authority</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Principal Office Console — Final Venue Allocation Authority
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
              Final Sanction Hub for VBIT Auditoriums & Departmental Venues (Requires Prior SAC Approval).
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="solid-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Awaiting Principal Sanction</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--text-primary)' }}>{requests.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck2 size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Final Approved Bookings</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--accent-green)' }}>{approvedCount}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rejected / Cancelled</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--danger)' }}>{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={16} /> Awaiting Principal Sanction ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn ${activeTab === 'HISTORY' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <CheckCircle2 size={16} /> Decision History ({allHistory.length})
        </button>
      </div>

      {/* Pending Queue Tab */}
      {activeTab === 'PENDING' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading requests awaiting Principal approval...</p>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={44} style={{ margin: '0 auto 12px', color: 'var(--accent-green)', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>No Requests Pending Principal Sanction</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
                All venue allocation requests submitted by SAC Director have been processed.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {requests.map(req => (
                <div
                  key={req.id}
                  className="solid-card animate-fade-in-up"
                  style={{
                    padding: '20px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-purple" style={{ fontWeight: 700 }}>{req.clubName}</span>
                      <span className="badge badge-blue">Step 2: Principal Review</span>
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {req.eventTitle}
                    </h3>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px' }}>
                      🏛️ {req.facilityName}
                    </p>

                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      <div><Calendar size={13} style={{ display: 'inline', marginRight: '6px' }} /> Date: <strong>{req.date}</strong> ({req.startTime} - {req.endTime})</div>
                      <div><Users size={13} style={{ display: 'inline', marginRight: '6px' }} /> Expected Attendance: <strong>{req.expectedAttendance} Attendees</strong></div>
                      <div>Representative: <strong>{req.bookedByName}</strong> ({req.designation || 'Lead'}) — <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>{req.bookedByRollNumber}</span></div>
                    </div>

                    {/* SAC Director Review Badge */}
                    {req.sacReview && (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.781rem', color: 'var(--accent-green)', marginBottom: '8px' }}>
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
          {allHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Building2 size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p>No decision history records available.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', minWidth: '220px' }}>Event & Club</th>
                    <th style={{ textAlign: 'center', minWidth: '160px' }}>Facility</th>
                    <th style={{ textAlign: 'center', minWidth: '180px' }}>Date & Slot</th>
                    <th style={{ textAlign: 'center', minWidth: '160px' }}>Final Status</th>
                    <th style={{ textAlign: 'center', minWidth: '180px' }}>SAC Director Remarks</th>
                    <th style={{ textAlign: 'center', minWidth: '180px' }}>Principal Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {allHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{h.eventTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 700, marginTop: '2px' }}>
                          {h.clubName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({h.bookedByName || h.bookedByRollNumber})</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '14px 10px', fontWeight: 600 }}>{h.facilityName}</td>
                      <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <div style={{ fontWeight: 700 }}>{h.date}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{h.startTime} - {h.endTime}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <span
                          className={`badge badge-${h.status === 'APPROVED' ? 'green' : 'red'}`}
                          style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
                        >
                          {h.status === 'APPROVED' ? '✓ APPROVED' : `❌ ${h.status}`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '14px 10px', color: 'var(--text-secondary)' }}>
                        {h.sacReview?.remarks || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '14px 10px', color: 'var(--text-secondary)' }}>
                        {h.principalReview?.remarks || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalBooking && (
        <div
          onClick={() => setReviewModalBooking(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 10100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="solid-card animate-fade-in-up"
            style={{ maxWidth: '520px', width: '100%', padding: '26px', border: `1px solid ${actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)'}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 900, margin: 0, color: actionType === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)' }}>
                {actionType === 'APPROVED' ? 'Grant Final Sanction (Principal Approval)' : 'Reject Venue Allocation Request'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalBooking(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
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
