import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart3, Users, Clock, Home, CheckCircle2 } from 'lucide-react';

export default function ReportsAnalytics() {
  const [schedules, setSchedules] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSched = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setSchedules(list);
    });

    const unsubFaculty = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setFaculty(list);
      setLoading(false);
    });

    return () => {
      unsubSched();
      unsubFaculty();
    };
  }, []);

  // Compute stats
  const totalSchedules = schedules.length;
  const totalFaculty = faculty.length;

  // Calculate room utilization (dummy logic backed by actual schedules)
  const roomsUsed = new Set(schedules.map(s => s.room).filter(Boolean));
  const totalRooms = 15; // standard department size
  const roomUtilization = totalRooms > 0 ? Math.round((roomsUsed.size / totalRooms) * 100) : 0;

  // Calculate workloads based on published schedules
  const facultyHours = {};
  schedules.forEach(sched => {
    if (!sched.grid) return;
    Object.keys(sched.grid).forEach(day => {
      sched.grid[day].forEach(slot => {
        if (slot && slot.facultyName && slot.type !== 'break' && slot.type !== 'lunch') {
          // Parse faculty names in case multi-faculty was assigned
          const names = slot.facultyName.split(',').map(n => n.trim()).filter(Boolean);
          names.forEach(fac => {
            facultyHours[fac] = (facultyHours[fac] || 0) + 1;
          });
        }
      });
    });
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={24} style={{ color: 'var(--accent-primary)' }} />
          Reports & Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time diagnostics on room utilization, scheduling density, and faculty workloads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="solid-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', color: '#3B82F6' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Active Schedules</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalSchedules}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: '#10B981' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Staff Pool Size</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalFaculty}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', background: 'rgba(232,82,46,0.1)', borderRadius: '12px', color: '#E8522E' }}>
            <Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Room Utilization</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{roomUtilization}%</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Room Usage */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Room Allocation Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from(roomsUsed).map(room => {
              const formattedRoom = String(room).replace(/^Room\s+/i, '');
              return (
                <div key={room} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-glass)', borderRadius: '8px', fontSize: '0.813rem' }}>
                  <span>Room {formattedRoom}</span>
                  <span className="badge badge-green">Allocated</span>
                </div>
              );
            })}
            {roomsUsed.size === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.813rem' }}>No rooms allocated yet.</p>}
          </div>
        </div>

        {/* Faculty Load Chart */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Faculty Teaching Loads (Hours/Week)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.keys(facultyHours).map(fac => (
              <div key={fac} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-glass)', borderRadius: '8px', fontSize: '0.813rem' }}>
                <span>{fac}</span>
                <span style={{ fontWeight: 700 }}>{facultyHours[fac]} periods</span>
              </div>
            ))}
            {Object.keys(facultyHours).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.813rem' }}>No workloads recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
