/**
 * ManageClubLeads.jsx — Admin & HOD Console for managing student venue booking privileges by Roll Number.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Users, UserPlus, ShieldCheck, ShieldAlert, Trash2, Search, Sparkles, CheckCircle2, Award } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import DepartmentClubRosterView from './DepartmentClubRosterView';

const DESIGNATION_OPTIONS = [
  'Hospitality Lead',
  'Secretary',
  'Representative',
  'Chairperson',
  'Vice-Chairperson',
  'Event Coordinator',
  'Technical Lead',
  'Student Coordinator',
  'Custom Designation',
];

export default function ManageClubLeads() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [department, setDepartment] = useState('CSE-DS');
  const [clubName, setClubName] = useState('ABHEDYA');
  const [designationSelect, setDesignationSelect] = useState('Hospitality Lead');
  const [customDesignation, setCustomDesignation] = useState('');

  // Real-time synchronization with /club_leads
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'club_leads'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setLeads(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) return alert('Please enter student roll number.');
    
    setSubmitting(true);
    const cleanRoll = rollNumber.trim().toUpperCase();
    const finalDesignation = designationSelect === 'Custom Designation' ? customDesignation : designationSelect;

    try {
      const docId = `lead_${cleanRoll}`;
      await setDoc(doc(db, 'club_leads', docId), {
        rollNumber: cleanRoll,
        email: `${cleanRoll.toLowerCase()}@vbit.ac.in`,
        studentName: studentName.trim() || cleanRoll,
        department,
        clubName: clubName.trim() || 'College Club',
        designation: finalDesignation || 'Club Lead',
        grantedBy: profile?.email || 'Admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      setShowModal(false);
      setRollNumber('');
      setStudentName('');
      setCustomDesignation('');
      alert(`Booking privilege granted successfully to Roll Number ${cleanRoll} (${finalDesignation})!`);
    } catch (err) {
      console.error(err);
      alert('Failed to grant booking privilege: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (lead) => {
    try {
      await updateDoc(doc(db, 'club_leads', lead.id), {
        isActive: !lead.isActive
      });
    } catch (err) {
      console.error(err);
      alert('Error updating status: ' + err.message);
    }
  };

  const handleRevoke = async (leadId, roll) => {
    if (!confirm(`Are you sure you want to revoke venue booking access for ${roll}?`)) return;
    try {
      await deleteDoc(doc(db, 'club_leads', leadId));
      alert(`Access revoked for ${roll}.`);
    } catch (err) {
      console.error(err);
      alert('Error revoking access: ' + err.message);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.clubName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent-primary)' }} />
            Manage Student Venue Booking Privileges
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Grant, update, or revoke auditorium & facility booking privileges for Club Leads, Hospitality Leads, Secretaries, and Representatives by Roll Number.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={16} /> Grant Student Booking Privilege
        </button>
      </div>

      {/* Roster Controls */}
      <div className="solid-card" style={{ padding: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by Roll Number (e.g. 23P61A6794), Name, or Club..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Total Authorized Student Reps: {leads.length}
          </div>
        </div>
      </div>

      {/* Authorized Roster Table */}
      <div className="solid-card" style={{ padding: '20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading authorized student roster...</p>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>No student leads found. Click "Grant Student Booking Privilege" to authorize a student by Roll Number.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Club / Organization</th>
                  <th>Designation</th>
                  <th>Granted By</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {lead.rollNumber}
                      </span>
                    </td>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{lead.studentName}</strong></td>
                    <td><span className="badge badge-blue">{lead.department}</span></td>
                    <td><span className="badge badge-purple">{lead.clubName}</span></td>
                    <td><strong>{lead.designation || 'Club Lead'}</strong></td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{lead.grantedBy}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(lead)}
                        className={`badge badge-${lead.isActive !== false ? 'green' : 'amber'}`}
                        style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Click to toggle active privilege"
                      >
                        {lead.isActive !== false ? 'Active Privilege' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevoke(lead.id, lead.rollNumber)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '4px 8px' }}
                        title="Revoke Booking Privilege"
                      >
                        <Trash2 size={14} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Student Club Roster View (HOD & Admin) */}
      <DepartmentClubRosterView />

      {/* Grant Privilege Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} style={{ color: 'var(--accent-primary)' }} />
              Grant Student Venue Booking Privilege
            </h3>

            <form onSubmit={handleAddLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Student Roll Number *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 23P61A6794"
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Student Full Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. SURAJ"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Department
                  </label>
                  <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                    {['CSE-DS', 'CSE', 'CSE-AIML', 'CSE-CS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Club / Organization
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ABHEDYA / IEEE"
                    value={clubName}
                    onChange={e => setClubName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Student Role / Designation
                </label>
                <select className="input-field" value={designationSelect} onChange={e => setDesignationSelect(e.target.value)}>
                  {DESIGNATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {designationSelect === 'Custom Designation' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Enter Custom Designation *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Logistics Head / Hospitality Lead"
                    value={customDesignation}
                    onChange={e => setCustomDesignation(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Granting...' : 'Authorize Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
