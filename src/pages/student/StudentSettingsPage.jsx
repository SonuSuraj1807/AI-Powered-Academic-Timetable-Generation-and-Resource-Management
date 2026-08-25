/**
 * StudentSettingsPage — Profile (Read-Only) and Password settings for Student.
 * Student academic profile details are locked by Administration.
 */
import { useState } from 'react';
import { Settings, Lock, Save, GraduationCap, ShieldAlert } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { auth, db } from '../../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getStudentYear, getStudentSection } from './StudentDashboard';

export default function StudentSettingsPage() {
  const { profile } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMsg('Error: Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }
      if (profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), { password: newPassword });
      }
      setMsg('Password updated successfully!');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setMsg('Error updating password: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const studentEmail = profile?.email || '23p61a6794@vbit.ac.in';
  const studentRollNo = studentEmail.split('@')[0].toUpperCase();
  const studentYear = getStudentYear(studentRollNo);
  const studentSec = getStudentSection(studentRollNo);
  const studentName = (profile?.name && profile.name.toUpperCase() !== 'STUDENT') ? profile.name : studentRollNo;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} style={{ color: 'var(--accent-green)' }} />
          Student Account & Security Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          View institutional profile details and manage your account password.
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

      {/* Institutional Read-Only Lock Banner */}
      <div style={{
        padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
        background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)',
        display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.813rem',
      }}>
        <ShieldAlert size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Official Academic Profile Locked:</strong> Student personal & academic credentials (Name, Roll Number, Branch, Section) are officially managed by the Institution Administration. Students cannot modify academic records. To request updates, contact the Exam Branch or Department Admin.
        </div>
      </div>

      <form onSubmit={handleSavePassword} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
          <GraduationCap size={18} style={{ color: 'var(--accent-green)' }} /> Official Institutional Profile (Read-Only)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name 🔒</label>
            <input className="input-field" value={studentName} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Hall Ticket / Roll Number 🔒</label>
            <input className="input-field" value={studentRollNo} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Institutional Email 🔒</label>
            <input className="input-field" value={studentEmail} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Department / Branch 🔒</label>
            <input className="input-field" value={profile?.department || 'CSE-DS'} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Year, Section & Regulation 🔒</label>
            <input className="input-field" value={`Year ${studentYear} Sec ${studentSec} (${profile?.regulation || 'R22'})`} disabled style={{ opacity: 0.7, background: 'var(--bg-elevated)', cursor: 'not-allowed' }} />
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', marginTop: '12px' }}>
          <Lock size={18} style={{ color: 'var(--accent-amber)' }} /> Change Account Password
        </h3>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>New Password</label>
          <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password (min. 6 characters)" minLength={6} />
          <span style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>Default password is vbit1234. Change it to secure your student portal.</span>
        </div>

        <button type="submit" disabled={saving || !newPassword.trim()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: '10px 20px', marginTop: '8px' }}>
          <Save size={16} /> {saving ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
