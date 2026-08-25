/**
 * StudentSettingsPage — Profile, academic info, and password settings for Student.
 */
import { useState } from 'react';
import { Settings, User, Lock, Save, GraduationCap } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function StudentSettingsPage() {
  const { profile, user } = useAuthStore();
  const [name, setName] = useState(profile?.name || profile?.displayName || '');
  const [hallTicketNo, setHallTicketNo] = useState(profile?.hallTicketNo || '23P61A6701');
  const [section, setSection] = useState(profile?.section || 'CSE-DS A');
  const [regulation, setRegulation] = useState(profile?.regulation || 'R22');

  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          name,
          hallTicketNo,
          section,
          regulation,
          updatedAt: new Date().toISOString(),
        });
      }

      if (newPassword.trim() && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword.trim());
      }

      setMsg('Student settings saved successfully in Firestore database!');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setMsg('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} style={{ color: 'var(--accent-green)' }} />
          Student Account Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Update your student profile and academic details.
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

      <form onSubmit={handleSaveProfile} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
          <GraduationCap size={18} style={{ color: 'var(--accent-green)' }} /> Academic Profile
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Hall Ticket Number</label>
            <input className="input-field" value={hallTicketNo} onChange={e => setHallTicketNo(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Registered Email</label>
            <input className="input-field" value={profile?.email || ''} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Section & Branch</label>
            <input className="input-field" value={section} onChange={e => setSection(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Regulation</label>
            <input className="input-field" value={regulation} onChange={e => setRegulation(e.target.value)} />
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', marginTop: '12px' }}>
          <Lock size={18} style={{ color: 'var(--accent-amber)' }} /> Password Security
        </h3>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>New Password (Leave blank to keep current)</label>
          <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" minLength={6} />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: '10px 20px', marginTop: '8px' }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
