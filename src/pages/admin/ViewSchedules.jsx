import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { Calendar, Trash2, FileSpreadsheet, Download, RefreshCw, Eye } from 'lucide-react';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import { TIME_SLOTS } from '../../data/curriculumSeed';
import { exportToExcel } from '../../lib/export/excelExporter';
import { exportToPDF } from '../../lib/export/pdfExporter';

import useAuthStore from '../../stores/authStore';

export default function ViewSchedules() {
  const profile = useAuthStore(state => state.profile);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'exam_controller';
  const userDept = profile?.department;

  // Real-time syncing with Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort in ascending order of year, department, section
      list.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.department !== b.department) return a.department.localeCompare(b.department);
        return a.section.localeCompare(b.section);
      });
      setSchedules(list);
      setLoading(false);
      
      // Keep selected schedule in sync if it changes
      if (selectedSchedule) {
        const updated = list.find(s => s.id === selectedSchedule.id);
        setSelectedSchedule(updated || null);
      }
    });
    return () => unsubscribe();
  }, [selectedSchedule]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to unpublish/delete this schedule?')) return;
    try {
      await deleteDoc(doc(db, 'schedules', id));
      if (selectedSchedule?.id === id) {
        setSelectedSchedule(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting schedule: ' + err.message);
    }
  };

  const handleExportExcel = (sched) => {
    const timeConfig = sched.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
    exportToExcel(sched, timeConfig, `${sched.department}_Y${sched.year}_Sem${sched.semester}_Sec${sched.section}_Timetable`);
  };

  const handleExportPDF = (sched) => {
    const timeConfig = sched.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
    exportToPDF(sched, timeConfig, `${sched.department}_Y${sched.year}_Sem${sched.semester}_Sec${sched.section}_Timetable`);
  };

  const displaySchedules = isSuperAdmin 
    ? schedules 
    : (userDept ? schedules.filter(s => s.department === userDept) : schedules);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={24} style={{ color: 'var(--accent-primary)' }} />
          View Published Schedules
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Browse, inspect, export, or delete academic timetables. Synchronized in real-time.
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        {/* Published Directory (Full Width) */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Published Directory ({displaySchedules.length})</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading timetables...</p>
          ) : displaySchedules.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No published timetables found for this scope.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {displaySchedules.map(sched => (
                <div 
                  key={sched.id} 
                  style={{
                    padding: '16px', borderRadius: '12px',
                    background: 'var(--surface-glass)',
                    border: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 200ms ease',
                  }}
                  onClick={() => setSelectedSchedule(sched)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.938rem', color: 'var(--text-primary)' }}>
                      {sched.department} Year {sched.year} Sec {sched.section}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Room: {sched.room} • Sem {sched.semester}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedSchedule(sched)} className="btn btn-primary btn-sm" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} title="Preview">
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleDelete(sched.id)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--danger)' }} title="Unpublish">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Overlay for Preview */}
        {selectedSchedule && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }} onClick={() => setSelectedSchedule(null)}>
            <div style={{
              background: '#0F172A', border: '1px solid var(--border-primary)',
              borderRadius: '16px', width: '100%', maxWidth: '1100px',
              maxHeight: '90vh', overflowY: 'auto', padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              position: 'relative'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    📅 {selectedSchedule.department} Year {selectedSchedule.year} Sec {selectedSchedule.section} Timetable
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Room: {selectedSchedule.room} • Semester {selectedSchedule.semester}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => handleExportExcel(selectedSchedule)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={14} /> Export Excel
                  </button>
                  <button onClick={() => handleExportPDF(selectedSchedule)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={14} /> Export PDF
                  </button>
                  <button onClick={() => setSelectedSchedule(null)} className="btn btn-ghost btn-sm" style={{ fontWeight: 700, fontSize: '1.2rem', padding: '4px 12px' }}>
                    ×
                  </button>
                </div>
              </div>

              {/* Timetable Grid View */}
              <div style={{ overflowX: 'auto' }}>
                <TimetableGrid 
                  schedule={selectedSchedule}
                  timeConfig={selectedSchedule.year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR}
                  showHeader={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
