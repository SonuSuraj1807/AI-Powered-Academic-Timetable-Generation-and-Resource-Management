/**
 * VenueAvailabilityCalendar.jsx — Interactive Visual Month Calendar for Venue Availability Matrix
 * 
 * Renders a full-featured monthly grid displaying booked/reserved events per venue across dates and time slots,
 * with color-coded venue badges, free slot indicators, and a daily detail modal.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Building2, Clock, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react';

const VENUE_COLORS = {
  nalandha_auditorium: '#8B5CF6',
  chethana_auditorium: '#10B981',
  cse_seminar_hall: '#3B82F6',
  cseds_seminar_hall: '#F59E0B',
  ece_seminar_hall: '#EC4899',
  it_seminar_hall: '#06B6D4',
  default: '#6366F1',
};

export default function VenueAvailabilityCalendar({ bookings = [], facilities = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // Default Sep 2026
  const [selectedFacilityId, setSelectedFacilityId] = useState('ALL');
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings by selected facility
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedFacilityId !== 'ALL' && b.facilityId !== selectedFacilityId) return false;
      return true;
    });
  }, [bookings, selectedFacilityId]);

  // Map bookings to dates (YYYY-MM-DD)
  const bookingsByDateMap = useMemo(() => {
    const map = {};
    filteredBookings.forEach(b => {
      // Support startDate & endDate range or single date
      const sDateStr = b.startDate || b.date;
      const eDateStr = b.endDate || b.date || sDateStr;

      if (sDateStr && sDateStr.length >= 10) {
        const sD = new Date(sDateStr);
        const eD = new Date(eDateStr.length >= 10 ? eDateStr : sDateStr);

        for (let d = new Date(sD); d <= eD; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          if (!map[key]) map[key] = [];
          map[key].push(b);
        }
      }
    });
    return map;
  }, [filteredBookings]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Padding for previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateKey: null,
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        dateKey,
        bookings: bookingsByDateMap[dateKey] || [],
      });
    }

    // Padding for next month
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateKey: null,
      });
    }

    return days;
  }, [year, month, bookingsByDateMap]);

  return (
    <div className="solid-card" style={{ padding: '24px' }}>
      {/* Calendar Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--accent-primary)' }} />
            {monthNames[month]} {year} — Live Venue Matrix
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.844rem', marginTop: '2px' }}>
            Visual month schedule showing reserved event slots vs available venue dates across VBIT auditoriums.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Month & Year Jump Selector */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              className="input-field"
              value={month}
              onChange={e => setCurrentDate(new Date(year, Number(e.target.value), 1))}
              style={{ width: 'auto', fontSize: '0.813rem', padding: '6px 10px', background: 'var(--bg-elevated)', fontWeight: 700, border: '1px solid var(--accent-primary)' }}
            >
              {monthNames.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={year}
              onChange={e => setCurrentDate(new Date(Number(e.target.value), month, 1))}
              style={{ width: 'auto', fontSize: '0.813rem', padding: '6px 10px', background: 'var(--bg-elevated)', fontWeight: 700, border: '1px solid var(--accent-primary)' }}
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Facility Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-tertiary)' }} />
            <select
              className="input-field"
              value={selectedFacilityId}
              onChange={e => setSelectedFacilityId(e.target.value)}
              style={{ width: 'auto', fontSize: '0.813rem', padding: '6px 12px' }}
            >
              <option value="ALL">All Auditoriums & Venues</option>
              {facilities.map(f => (
                <option key={f.facilityId || f.id} value={f.facilityId || f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Navigation Arrows */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={handlePrevMonth} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }} title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleToday} className="btn btn-secondary btn-sm" style={{ fontSize: '0.781rem', padding: '6px 12px' }}>
              Today
            </button>
            <button onClick={handleNextMonth} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }} title="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '6px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {calendarDays.map((cell, idx) => {
          const hasBookings = cell.bookings && cell.bookings.length > 0;
          const isToday = cell.isCurrentMonth && cell.dateKey === new Date().toISOString().split('T')[0];

          return (
            <div
              key={idx}
              onClick={() => cell.isCurrentMonth && setSelectedDayDetail(cell)}
              style={{
                minHeight: '110px',
                padding: '8px',
                borderRadius: '10px',
                background: !cell.isCurrentMonth
                  ? 'rgba(0,0,0,0.1)'
                  : isToday
                  ? 'rgba(139, 92, 246, 0.12)'
                  : 'var(--bg-elevated)',
                border: isToday
                  ? '2px solid var(--accent-primary)'
                  : cell.isCurrentMonth
                  ? '1px solid var(--border-primary)'
                  : '1px solid transparent',
                opacity: cell.isCurrentMonth ? 1 : 0.35,
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '0.813rem',
                  fontWeight: isToday ? 900 : 700,
                  color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                  width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--accent-primary)' : undefined,
                  color: isToday ? '#fff' : undefined,
                }}>
                  {cell.dayNumber}
                </span>

                {cell.isCurrentMonth && (
                  <span style={{ fontSize: '0.625rem', fontWeight: 600, color: hasBookings ? 'var(--danger)' : 'var(--accent-green)' }}>
                    {hasBookings ? `${cell.bookings.length} Reserved` : '✓ Free'}
                  </span>
                )}
              </div>

              {/* Reserved Cards inside Day Cell */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                {cell.bookings?.slice(0, 2).map((b, bIdx) => {
                  const color = VENUE_COLORS[b.facilityId] || VENUE_COLORS.default;
                  return (
                    <div
                      key={bIdx}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: `${color}25`,
                        borderLeft: `3px solid ${color}`,
                        fontSize: '0.688rem',
                        color: 'var(--text-primary)',
                        lineHeight: '1.2',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <strong style={{ color }}>{b.clubName}</strong>: {b.eventTitle} ({b.startTime} - {b.endTime})
                    </div>
                  );
                })}

                {cell.bookings && cell.bookings.length > 2 && (
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'center' }}>
                    +{cell.bookings.length - 2} more events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Day Breakdown Modal */}
      {selectedDayDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '560px', width: '100%', padding: '24px', border: '1px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                Day Schedule Matrix — {selectedDayDetail.dateKey}
              </h3>
              <button onClick={() => setSelectedDayDetail(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                <X size={18} />
              </button>
            </div>

            {selectedDayDetail.bookings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-green)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                <strong>All Venue Slots Are Completely Available on This Date!</strong>
                <p style={{ fontSize: '0.813rem', marginTop: '4px', color: 'var(--text-secondary)' }}>No auditoriums or seminar halls have been reserved for this day.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  The following venue allocations are active or approved for this date:
                </p>
                {selectedDayDetail.bookings.map((b, idx) => {
                  const color = VENUE_COLORS[b.facilityId] || VENUE_COLORS.default;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '14px', borderRadius: '8px', background: 'var(--bg-elevated)',
                        borderLeft: `4px solid ${color}`, borderTop: '1px solid var(--border-primary)',
                        borderRight: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span className="badge badge-purple">{b.clubName}</span>
                        <span className={`badge badge-${b.status === 'APPROVED' ? 'green' : 'amber'}`}>
                          {b.status === 'APPROVED' ? 'Final Sanctioned' : 'SAC Approved'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.938rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                        {b.eventTitle}
                      </h4>
                      <div style={{ fontSize: '0.813rem', color: color, fontWeight: 700 }}>
                        🏛️ {b.facilityName}
                      </div>
                      <div style={{ fontSize: '0.781rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        ⏰ Time Slot: <strong>{b.startTime} – {b.endTime}</strong> • Expected Attendance: <strong>{b.expectedAttendance}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Booked By: {b.bookedByName} ({b.bookedByRollNumber})
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedDayDetail(null)} className="btn btn-primary">Close Matrix</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
