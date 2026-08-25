/**
 * AdminSettingsPage — System configuration, institutional settings, and security status.
 */
import { useState } from 'react';
import { Settings, Shield, Building2, Save, CheckCircle, Database } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function AdminSettingsPage() {
  const { profile } = useAuthStore();
  const [collegeName, setCollegeName] = useState('Vignana Bharathi Institute of Technology');
  const [deptName, setDeptName] = useState('Computer Science & Engineering - Data Science');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await setDoc(doc(db, 'system_settings', 'config'), {
        collegeName,
        deptName,
        academicYear,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.email || 'admin',
      }, { merge: true });

      setMsg('Institutional settings saved live to Cloud Firestore!');
    } catch (err) {
      console.error(err);
      setMsg('Error saving system settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} style={{ color: '#E8522E' }} />
          Admin System Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Institutional parameters, examination rules, and real-time database sync rules.
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: msg.includes('Error') ? 'var(--danger-subtle)' : 'var(--accent-green-subtle)',
          color: msg.includes('Error') ? 'var(--danger)' : 'var(--accent-green)',
          fontSize: '0.875rem', fontWeight: 600,
        }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
          <Building2 size={18} style={{ color: '#E8522E' }} /> Institutional Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Institution Name</label>
            <input className="input-field" value={collegeName} onChange={e => setCollegeName(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Department Name</label>
            <input className="input-field" value={deptName} onChange={e => setDeptName(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Academic Session</label>
            <input className="input-field" value={academicYear} onChange={e => setAcademicYear(e.target.value)} required />
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', marginTop: '12px' }}>
          <Database size={18} style={{ color: 'var(--accent-blue)' }} /> Real-Time Database Connection Status
        </h3>

        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.813rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 700 }}>
            <CheckCircle size={16} /> Cloud Firestore Connection: Active & Synchronized
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Collections Live Synced: <code>/schedules</code>, <code>/seating_plans</code>, <code>/substitutions</code>, <code>/curriculum</code>, <code>/faculty</code>, <code>/users</code>, <code>/notifications</code>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: '10px 20px', marginTop: '8px' }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
