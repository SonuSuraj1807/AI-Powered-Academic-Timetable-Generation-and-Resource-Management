/**
 * VenueOversightView.jsx — Admin & HOD Venue Oversight Console
 * Tracks all facility booking requests across VBIT auditoriums & departmental seminar halls.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Building2, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';

export default function VenueOversightView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'facility_bookings'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBookings(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = 
      b.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.facilityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clubName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookedByRollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_SAC_APPROVAL':
        return <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Pending SAC Review</span>;
      case 'SAC_APPROVED_WAITING_FOR_PRINCIPAL':
        return <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> SAC Approved • Waiting Principal</span>;
      case 'APPROVED':
        return <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Confirmed / Approved</span>;
      case 'REJECTED_BY_SAC':
        return <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Rejected by SAC</span>;
      case 'REJECTED_BY_PRINCIPAL':
        return <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Rejected by Principal</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={22} style={{ color: 'var(--accent-primary)' }} />
          College-Wide Venue & Auditorium Allocation Oversight
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time tracking of auditorium & departmental seminar hall allocation requests across Nalandha, Chethana, and all Departmental Halls.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="solid-card" style={{ padding: '18px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by event, venue, club, or roll number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <select
            className="input-field"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_SAC_APPROVAL">Pending SAC Approval</option>
            <option value="SAC_APPROVED_WAITING_FOR_PRINCIPAL">SAC Approved (Waiting Principal)</option>
            <option value="APPROVED">Approved / Confirmed</option>
            <option value="REJECTED_BY_SAC">Rejected by SAC</option>
            <option value="REJECTED_BY_PRINCIPAL">Rejected by Principal</option>
          </select>
        </div>
      </div>

      {/* Bookings List Table */}
      <div className="solid-card" style={{ padding: '20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading venue allocation requests...</p>
        ) : filteredBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '32px' }}>
            No venue requests found matching current filter criteria.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
              <thead>
                <tr>
                  <th>Venue & Block</th>
                  <th>Event Title & Description</th>
                  <th>Club & Representative</th>
                  <th>Date & Time Slot</th>
                  <th>Expected Crowd</th>
                  <th>Approval State</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => (
                  <tr key={b.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-primary)' }}>{b.facilityName}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.eventTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.description}
                      </div>
                    </td>
                    <td>
                      <div><strong>{b.clubName}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {b.bookedByName} ({b.designation || 'Lead'}) • <span style={{ fontFamily: 'var(--font-mono)' }}>{b.bookedByRollNumber}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Calendar size={13} style={{ color: 'var(--accent-blue)' }} /> {b.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Clock size={12} /> {b.startTime} - {b.endTime}
                      </div>
                    </td>
                    <td><strong>{b.expectedAttendance} Attendees</strong></td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>
                        {b.sacReview && (
                          <div style={{ color: b.sacReview.action === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)' }}>
                            <strong>SAC:</strong> {b.sacReview.action} {b.sacReview.remarks && `("${b.sacReview.remarks}")`}
                          </div>
                        )}
                        {b.principalReview && (
                          <div style={{ color: b.principalReview.action === 'APPROVED' ? 'var(--accent-green)' : 'var(--danger)' }}>
                            <strong>Principal:</strong> {b.principalReview.action} {b.principalReview.remarks && `("${b.principalReview.remarks}")`}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
