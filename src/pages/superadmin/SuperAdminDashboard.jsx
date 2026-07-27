import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Shield, Building2, Users, Calendar, Cpu, Sparkles, Plus, Trash2, Edit2, KeyRound } from 'lucide-react';
import { DEPARTMENTS } from '../../data/curriculumSeed';

export default function SuperAdminDashboard() {
  const [schedules, setSchedules] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departmentAdmins, setDepartmentAdmins] = useState([]);
  const [activeDept, setActiveDept] = useState('ALL');

  // New Department Admin form state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminDept, setNewAdminDept] = useState('CSE');

  useEffect(() => {
    const unsubSched = onSnapshot(collection(db, 'schedules'), snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSchedules(list);
    });

    const unsubFaculty = onSnapshot(collection(db, 'faculty'), snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setFaculty(list);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.role === 'admin') {
          list.push({ id: d.id, ...data });
        }
      });
      setDepartmentAdmins(list);
    });

    return () => {
      unsubSched();
      unsubFaculty();
      unsubUsers();
    };
  }, []);

  const filteredSchedules = activeDept === 'ALL' 
    ? schedules 
    : schedules.filter(s => s.department === activeDept);

  const filteredFaculty = activeDept === 'ALL'
    ? faculty
    : faculty.filter(f => f.department === activeDept);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Super Admin Banner */}
      <div style={{
        padding: '24px', borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.05))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: '#8B5CF6', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)',
          }}>
            <Shield size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Institutional Super Admin Console
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
              Full college-wide governance, departmental admin provisioning, and global schedule monitoring.
            </p>
          </div>
        </div>

        {/* Global Department Filter Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-glass)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
          <Building2 size={16} style={{ color: '#8B5CF6' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Scope:</span>
          <select
            value={activeDept}
            onChange={e => setActiveDept(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#8B5CF6', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <option value="ALL">All Departments (College-wide)</option>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
          </select>
        </div>
      </div>

      {/* College-wide Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '14px', color: '#8B5CF6' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Departments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{DEPARTMENTS.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', color: '#3B82F6' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Published Timetables</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{filteredSchedules.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '14px', color: '#10B981' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Teaching Staff</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{filteredFaculty.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '14px', color: '#F59E0B' }}>
            <KeyRound size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Department Admins</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{departmentAdmins.length}</div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Department Admin Provisioning + Global Timetable Monitor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Department Admin Governance */}
        <div className="solid-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={20} style={{ color: '#8B5CF6' }} />
            Department Admin Provisioning
          </h3>
          <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Manage departmental admins. Each departmental admin is strictly restricted to managing their own department.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {departmentAdmins.map(admin => (
              <div key={admin.id} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.938rem' }}>{admin.name || admin.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{admin.email}</div>
                </div>
                <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                  Dept: {admin.department || 'CSE-DS'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Timetable Monitor */}
        <div className="solid-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} style={{ color: '#3B82F6' }} />
            College-wide Schedule Registry
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredSchedules.map(sched => (
              <div key={sched.id} style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {sched.department} — Year {sched.year} Sec {sched.section}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Regulation: {sched.regulation} • Room {sched.room || '301'}
                  </div>
                </div>
                <span className="badge badge-green">Published</span>
              </div>
            ))}
            {filteredSchedules.length === 0 && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No published schedules found for this scope.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
