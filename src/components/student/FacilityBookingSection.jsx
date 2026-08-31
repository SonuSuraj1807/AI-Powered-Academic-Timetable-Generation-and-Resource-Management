/**
 * FacilityBookingSection.jsx — Student Facility & Auditorium Booking Portal
 * Features interactive multi-step booking form, conflict checking, RBAC restriction guard (403 Forbidden for non-leads),
 * and a 4-Step Visual Progress Tracker timeline for submitted requests.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { fetchFacilities, checkSlotConflict, submitBookingRequest } from '../../lib/facilityBookingEngine';
import { checkStudentClubLead } from '../../stores/authStore';
import { Building2, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Sparkles, Send, Users, ChevronRight } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function FacilityBookingSection() {
  const { profile } = useAuthStore();
  const derivedRoll = profile?.email ? profile.email.split('@')[0].toUpperCase() : '';
  const studentRoll = derivedRoll || profile?.hallTicketNo || '';
  const studentEmail = profile?.email || '';

  const [leadPrivilege, setLeadPrivilege] = useState(null); // { isClubLead, clubName, clubDesignation }
  const [checkingLead, setCheckingLead] = useState(true);

  const [facilities, setFacilities] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeTab, setActiveTab] = useState('TRACKER'); // 'TRACKER' | 'NEW_BOOKING'

  // Booking Form State
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [expectedAttendance, setExpectedAttendance] = useState('200');
  const [description, setDescription] = useState('');

  const [conflictChecking, setConflictChecking] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // 1. Check Student Club Lead privilege from Firestore /club_leads
  useEffect(() => {
    async function verifyPrivilege() {
      if (!studentRoll && !studentEmail) {
        setLeadPrivilege({ isClubLead: false });
        setCheckingLead(false);
        return;
      }
      const res = await checkStudentClubLead(studentRoll, studentEmail);
      setLeadPrivilege(res);
      setCheckingLead(false);
    }
    verifyPrivilege();
  }, [studentRoll, studentEmail]);

  // 2. Fetch facilities & listen to real-time student bookings
  useEffect(() => {
    fetchFacilities().then(list => {
      setFacilities(list);
      if (list.length > 0) setSelectedFacilityId(list[0].facilityId);
    });

    if (studentRoll) {
      const q = query(
        collection(db, 'facility_bookings'),
        where('bookedByRollNumber', '==', studentRoll.toUpperCase())
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setMyBookings(list);
        setLoadingBookings(false);
      });
      return () => unsub();
    } else {
      setLoadingBookings(false);
    }
  }, [studentRoll]);

  // 3. Real-time conflict checker when date/time/venue changes
  useEffect(() => {
    if (selectedFacilityId && eventDate && startTime && endTime) {
      setConflictChecking(true);
      checkSlotConflict(selectedFacilityId, eventDate, startTime, endTime).then(res => {
        setConflictResult(res);
        setConflictChecking(false);
      });
    } else {
      setConflictResult(null);
    }
  }, [selectedFacilityId, eventDate, startTime, endTime]);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) {
      return alert('Please fill in event title and date.');
    }
    if (conflictResult?.hasConflict) {
      return alert('Cannot submit request: Venue is already booked during this time window.');
    }

    setSubmitting(true);
    setSubmitMsg('');

    try {
      const fac = facilities.find(f => f.facilityId === selectedFacilityId);
      await submitBookingRequest({
        facilityId: selectedFacilityId,
        facilityName: fac?.name || 'VBIT Auditorium',
        bookedByRollNumber: studentRoll,
        bookedByName: profile?.name || studentRoll,
        clubName: leadPrivilege?.clubName || 'Student Club',
        designation: leadPrivilege?.clubDesignation || 'Hospitality Lead',
        eventTitle,
        date: eventDate,
        startTime,
        endTime,
        expectedAttendance,
        description,
      });

      setSubmitMsg('🎉 Venue allocation request submitted successfully! Pending SAC Director Approval.');
      setEventTitle('');
      setDescription('');
      setActiveTab('TRACKER');
    } catch (err) {
      console.error(err);
      alert('Error submitting venue request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Render 403 Forbidden if student does not have authorized booking privilege
  if (checkingLead) {
    return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Verifying venue booking access privileges...</div>;
  }

  if (!leadPrivilege?.isClubLead) {
    return (
      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '24px' }}>
        <div className="solid-card" style={{ padding: '36px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            403 Forbidden — Facility Booking Access Restricted
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '560px', margin: '0 auto 16px', lineHeight: 1.6 }}>
            Default student accounts have read-only access to academic schedules. Auditorium & Departmental Venue booking privileges are strictly restricted to authorized <strong>Hospitality Leads</strong>, <strong>Secretaries</strong>, <strong>Representatives</strong>, and <strong>Club Leads</strong>.
          </p>
          <div style={{ display: 'inline-block', background: 'var(--bg-elevated)', padding: '10px 16px', borderRadius: '8px', fontSize: '0.813rem', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}>
            To request booking privileges, contact your Department Admin or HOD with your Roll Number (<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{studentRoll}</span>).
          </div>
        </div>
      </div>
    );
  }

  // 5. Visual Progress Tracker Component (4 Steps)
  const renderVisualProgressTracker = (b) => {
    let currentStep = 1; // 1: Submitted, 2: SAC Approved, 3: Principal Approved, 4: Confirmed
    let isRejected = false;
    let rejectedLabel = '';

    if (b.status === 'PENDING_SAC_APPROVAL') currentStep = 1;
    else if (b.status === 'SAC_APPROVED_WAITING_FOR_PRINCIPAL') currentStep = 2;
    else if (b.status === 'APPROVED') currentStep = 4;
    else if (b.status === 'REJECTED_BY_SAC') { isRejected = true; rejectedLabel = 'Rejected by SAC Director'; }
    else if (b.status === 'REJECTED_BY_PRINCIPAL') { isRejected = true; rejectedLabel = 'Rejected by Principal'; }

    const steps = [
      { num: 1, title: 'Submitted', desc: 'Request Logged' },
      { num: 2, title: 'SAC Review', desc: b.sacReview?.action === 'APPROVED' ? 'SAC Approved ✅' : 'Pending SAC' },
      { num: 3, title: 'Principal Review', desc: b.principalReview?.action === 'APPROVED' ? 'Principal Approved ✅' : 'Awaiting Principal' },
      { num: 4, title: 'Confirmed', desc: b.status === 'APPROVED' ? 'Booking Active 🎉' : 'Final Sanction' },
    ];

    return (
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Visual Approval Progress Timeline:
        </div>

        {isRejected ? (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={18} />
            <div>
              <strong>{rejectedLabel}:</strong> {b.principalReview?.remarks || b.sacReview?.remarks || 'No reason provided.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', position: 'relative' }}>
            {steps.map((s, idx) => {
              const isCompleted = currentStep > s.num || (currentStep === 4 && s.num === 4);
              const isCurrent = currentStep === s.num && currentStep !== 4;

              return (
                <div key={s.num} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800,
                    background: isCompleted ? 'var(--accent-green)' : isCurrent ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: isCompleted || isCurrent ? '#fff' : 'var(--text-tertiary)',
                    border: `2px solid ${isCompleted ? 'var(--accent-green)' : isCurrent ? 'var(--accent-primary)' : 'var(--border-primary)'}`
                  }}>
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCompleted || isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
      {/* Banner */}
      <div className="solid-card" style={{ padding: '20px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '6px' }}>
              Authorized Rep: {leadPrivilege.clubName} ({leadPrivilege.clubDesignation})
            </span>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={24} style={{ color: 'var(--accent-primary)' }} />
              Facility & Auditorium Allocation Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
              Two-Tier Multi-Level Approval Workflow (SAC Director $\rightarrow$ Principal) with real-time slot conflict detection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('TRACKER')}
              className={`btn ${activeTab === 'TRACKER' ? 'btn-primary' : 'btn-ghost'}`}
            >
              My Booking Requests ({myBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('NEW_BOOKING')}
              className={`btn ${activeTab === 'NEW_BOOKING' ? 'btn-primary' : 'btn-ghost'}`}
            >
              + New Venue Booking
            </button>
          </div>
        </div>
      </div>

      {submitMsg && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', background: 'var(--accent-green-subtle)', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.875rem' }}>
          {submitMsg}
        </div>
      )}

      {/* Booking Tracker Tab */}
      {activeTab === 'TRACKER' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            Active & Past Booking Requests ({myBookings.length})
          </h2>

          {loadingBookings ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading booking requests...</p>
          ) : myBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>You have not submitted any venue booking requests yet.</p>
              <button onClick={() => setActiveTab('NEW_BOOKING')} className="btn btn-primary" style={{ marginTop: '12px' }}>
                Create First Venue Request
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {myBookings.map(b => (
                <div key={b.id} className="solid-card" style={{ padding: '20px', background: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {b.eventTitle}
                      </h3>
                      <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 700 }}>
                        🏛️ {b.facilityName}
                      </p>
                    </div>

                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      <div><Calendar size={13} style={{ display: 'inline' }} /> Date: <strong>{b.date}</strong></div>
                      <div><Clock size={12} style={{ display: 'inline' }} /> Time: <strong>{b.startTime} - {b.endTime}</strong></div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    <strong>Expected Attendance:</strong> {b.expectedAttendance} Attendees • <strong>Club:</strong> {b.clubName} ({b.designation || 'Lead'})
                  </div>

                  {renderVisualProgressTracker(b)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Booking Form Tab */}
      {activeTab === 'NEW_BOOKING' && (
        <form onSubmit={handleSubmitBooking} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            New Auditorium & Venue Allocation Request
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Select Venue / Auditorium *
              </label>
              <select className="input-field" value={selectedFacilityId} onChange={e => setSelectedFacilityId(e.target.value)}>
                {facilities.map(f => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.name} ({f.locationBlock}) — Cap: {f.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Event Title / Name *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. ABHEDYA Cultural Fest / AI Hackathon"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Event Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Start Time *
              </label>
              <input
                type="time"
                className="input-field"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                End Time *
              </label>
              <input
                type="time"
                className="input-field"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Expected Attendance *
              </label>
              <input
                type="number"
                className="input-field"
                value={expectedAttendance}
                onChange={e => setExpectedAttendance(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Slot Conflict Check Status Banner */}
          {eventDate && (
            <div>
              {conflictChecking ? (
                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>Checking real-time slot conflict against timetable & existing bookings...</div>
              ) : conflictResult?.hasConflict ? (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Slot Conflict Warning:</strong> Venue is already reserved for "{conflictResult.conflictingBooking.eventTitle}" ({conflictResult.conflictingBooking.startTime} - {conflictResult.conflictingBooking.endTime}).
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> Venue Slot Available for Requested Time Window!
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Event Description & Requirements
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Brief details about the event, required stage setup, or guest details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" onClick={() => setActiveTab('TRACKER')} className="btn btn-ghost">Cancel</button>
            <button
              type="submit"
              disabled={submitting || conflictResult?.hasConflict}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
