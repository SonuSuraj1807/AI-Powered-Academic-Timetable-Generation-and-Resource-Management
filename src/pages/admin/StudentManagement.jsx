/**
 * StudentManagement.jsx — Dedicated Admin & Super Admin Hub for Student Account Provisioning & Section Management.
 * Synchronized in real-time with /students and /users Firestore collections.
 */
import { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { GraduationCap, UserPlus, Search, Trash2, Edit2, Check, X, Sparkles, Filter, ShieldCheck, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

function getSecondaryAuth() {
  let secondaryApp;
  if (!getApps().some(app => app.name === 'SecondaryApp')) {
    secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
  } else {
    secondaryApp = getApps().find(app => app.name === 'SecondaryApp');
  }
  return getAuth(secondaryApp);
}

const DEPARTMENTS = [
  { id: 'CSE-DS', name: 'CSE - Data Science' },
  { id: 'CSE', name: 'Computer Science & Engg' },
  { id: 'CSE-AIML', name: 'CSE - AI & ML' },
  { id: 'CSE-CS', name: 'CSE - Cyber Security' },
  { id: 'IT', name: 'Information Technology' },
  { id: 'ECE', name: 'Electronics & Comm' },
  { id: 'EEE', name: 'Electrical & Electronics' },
  { id: 'MECH', name: 'Mechanical Engg' },
  { id: 'CIVIL', name: 'Civil Engg' },
  { id: 'MBA', name: 'Master of Bus. Admin' },
];

export default function StudentManagement() {
  const { profile } = useAuthStore();
  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [seeding, setSeeding] = useState(false);

  // Form states for Create Student Account
  const [stdName, setStdName] = useState('');
  const [stdRoll, setStdRoll] = useState('');
  const [stdEmail, setStdEmail] = useState('');
  const [stdPassword, setStdPassword] = useState('Vbit@2026');
  const [stdDept, setStdDept] = useState(profile?.department || 'CSE-DS');
  const [stdSectionSelect, setStdSectionSelect] = useState('Sec A');
  const [customStdSection, setCustomStdSection] = useState('');
  const [stdYear, setStdYear] = useState('3');
  const [stdSem, setStdSem] = useState('2');
  const [stdRegulation, setStdRegulation] = useState('R22');

  // Edit Student Modal states
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStdName, setEditStdName] = useState('');
  const [editStdDept, setEditStdDept] = useState('CSE-DS');
  const [editStdSectionSelect, setEditStdSectionSelect] = useState('Sec A');
  const [editCustomStdSection, setEditCustomStdSection] = useState('');
  const [editStdYear, setEditStdYear] = useState('4');
  const [editStdSem, setEditStdSem] = useState('1');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const isSuperAdmin = profile?.role === 'superadmin';
  const userDept = profile?.department || 'CSE-DS';

  // Auto-generate email when Roll Number changes
  const handleRollChange = (val) => {
    setStdRoll(val);
    if (val.trim()) {
      setStdEmail(`${val.trim().toLowerCase()}@vbithyd.ac.in`);
    }
  };

  // Real-time synchronization from /students and /users
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (stdSnapshot) => {
      const studentDocMap = {};
      stdSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const rollKey = (data.rollNumber || data.hallTicketNo || docSnap.id).toUpperCase().trim();
        studentDocMap[rollKey] = data;
      });

      const unsubUsers = onSnapshot(collection(db, 'users'), (userSnapshot) => {
        let stds = [];
        const processedRolls = new Set();

        userSnapshot.forEach(docSnap => {
          const d = docSnap.data();
          if (d.role === 'student') {
            const rollKey = (d.rollNumber || d.hallTicketNo || (d.email ? d.email.split('@')[0] : '') || docSnap.id).toUpperCase().trim();
            processedRolls.add(rollKey);
            const stdRecord = studentDocMap[rollKey] || {};

            const resolvedName = (d.name && !d.name.match(/^\d{2}[A-Z\d]+$/i)) ? d.name 
              : (d.fullName && !d.fullName.match(/^\d{2}[A-Z\d]+$/i)) ? d.fullName 
              : stdRecord.name || stdRecord.fullName || d.name || d.fullName || rollKey;

            let sec = stdRecord.section || stdRecord.classSection || d.section || d.classSection || 'Sec A';
            if (!String(sec).startsWith('Sec')) sec = `Sec ${String(sec).trim()}`;

            stds.push({
              id: docSnap.id,
              ...d,
              name: resolvedName,
              fullName: resolvedName,
              rollNumber: rollKey,
              hallTicketNo: rollKey,
              section: sec,
              department: d.department || stdRecord.department || 'CSE-DS',
              year: d.year || stdRecord.year || '3',
              semester: d.semester || stdRecord.semester || '2',
              regulation: d.regulation || stdRecord.regulation || 'R22',
            });
          }
        });

        // Also add any /students records not in /users
        Object.keys(studentDocMap).forEach(rollKey => {
          if (!processedRolls.has(rollKey)) {
            const sData = studentDocMap[rollKey];
            let sec = sData.section || sData.classSection || 'Sec A';
            if (!String(sec).startsWith('Sec')) sec = `Sec ${String(sec).trim()}`;

            stds.push({
              id: `std_${rollKey.toLowerCase()}`,
              ...sData,
              name: sData.name || sData.fullName || rollKey,
              fullName: sData.name || sData.fullName || rollKey,
              rollNumber: rollKey,
              hallTicketNo: rollKey,
              section: sec,
              email: sData.email || `${rollKey.toLowerCase()}@vbithyd.ac.in`,
              department: sData.department || 'CSE-DS',
              year: sData.year || '3',
              semester: sData.semester || '2',
              regulation: sData.regulation || 'R22',
            });
          }
        });

        if (!isSuperAdmin && userDept) {
          stds = stds.filter(s => s.department === userDept);
        }

        stds.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
        setStudentList(stds);
        setLoading(false);
      });

      return () => unsubUsers();
    });

    return () => unsubStudents();
  }, [profile, isSuperAdmin, userDept]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!stdName.trim() || !stdRoll.trim() || !stdEmail.trim() || !stdPassword.trim()) return;

    try {
      const secAuth = getSecondaryAuth();
      let uid = null;
      try {
        const cred = await createUserWithEmailAndPassword(secAuth, stdEmail.trim(), stdPassword);
        uid = cred.user.uid;
      } catch (authErr) {
        console.warn('Auth user already exists or error, writing Firestore record...', authErr);
      }

      const cleanRoll = stdRoll.trim().toUpperCase();
      const docId = uid || `std_${cleanRoll.toLowerCase()}`;

      const finalSec = stdSectionSelect === 'Custom Section' ? (customStdSection.trim() || 'Sec A') : stdSectionSelect;
      const formattedSec = finalSec.startsWith('Sec') ? finalSec : `Sec ${finalSec}`;
      const rawSecLetter = formattedSec.replace(/^Sec\s*/i, '');

      const studentProfile = {
        name: stdName.trim(),
        fullName: stdName.trim(),
        displayName: stdName.trim(),
        email: stdEmail.trim().toLowerCase(),
        rollNumber: cleanRoll,
        hallTicketNo: cleanRoll,
        department: stdDept,
        section: rawSecLetter,
        classSection: formattedSec,
        year: stdYear,
        semester: stdSem,
        regulation: stdRegulation,
        role: 'student',
        createdAt: new Date().toISOString(),
        createdByAdmin: true,
      };

      await setDoc(doc(db, 'users', docId), studentProfile, { merge: true });
      await setDoc(doc(db, 'students', cleanRoll), studentProfile, { merge: true });

      await secAuth.signOut();
      setStdName('');
      setStdRoll('');
      setStdEmail('');
      setCustomStdSection('');
      alert(`Student account (${cleanRoll} - ${formattedSec}) registered successfully!`);
    } catch (err) {
      console.error(err);
      alert('Error registering student: ' + err.message);
    }
  };

  const handleSaveEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmittingEdit(true);
    try {
      const cleanRoll = (editingStudent.rollNumber || editingStudent.hallTicketNo || '').toUpperCase().trim();
      const finalSec = editStdSectionSelect === 'Custom Section' ? (editCustomStdSection.trim() || 'Sec A') : editStdSectionSelect;
      const formattedSec = finalSec.startsWith('Sec') ? finalSec : `Sec ${finalSec}`;
      const rawSecLetter = formattedSec.replace(/^Sec\s*/i, '');

      const updateData = {
        name: editStdName.trim(),
        fullName: editStdName.trim(),
        displayName: editStdName.trim(),
        department: editStdDept,
        section: rawSecLetter,
        classSection: formattedSec,
        year: editStdYear,
        semester: editStdSem,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', editingStudent.id), updateData, { merge: true });
      if (cleanRoll) {
        await setDoc(doc(db, 'students', cleanRoll), updateData, { merge: true });
      }

      alert(`Student profile for ${cleanRoll} updated successfully! Section set to ${formattedSec}.`);
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      alert('Error updating student: ' + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteStudent = async (id, roll) => {
    if (!confirm(`Are you sure you want to remove student account for ${roll}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      if (roll) await deleteDoc(doc(db, 'students', roll.toUpperCase()));
      alert(`Student account ${roll} removed successfully.`);
    } catch (err) {
      console.error(err);
      alert('Error deleting student: ' + err.message);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === studentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(studentList.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected student accounts?`)) return;
    try {
      for (const id of selectedIds) {
        const std = studentList.find(s => s.id === id);
        await deleteDoc(doc(db, 'users', id));
        if (std?.rollNumber) await deleteDoc(doc(db, 'students', std.rollNumber.toUpperCase()));
      }
      setSelectedIds([]);
      alert(`Successfully deleted ${selectedIds.length} student accounts.`);
    } catch (err) {
      console.error(err);
      alert('Error performing bulk deletion: ' + err.message);
    }
  };

  const filteredStudents = studentList.filter(s => {
    const q = filterQuery.toLowerCase();
    const matchesQ = !q || (s.name || '').toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    const matchesD = deptFilter === 'ALL' || s.department === deptFilter;
    return matchesQ && matchesD;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header Banner */}
      <div
        className="solid-card animate-fade-in"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))',
          border: '1px solid var(--accent-purple)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--accent-purple)',
              }}
            >
              <GraduationCap size={26} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div>
              <span className="badge badge-purple" style={{ marginBottom: '4px' }}>Real-time Student Roster Hub</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Student Management & Section Control
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
                Provision student accounts, configure Class Sections (Sec A–F or Custom), and manage institutional login access.
              </p>
            </div>
          </div>

          <div className="badge badge-purple" style={{ fontSize: '0.875rem', padding: '8px 14px', fontWeight: 800 }}>
            Total Registered Students: {studentList.length}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Student Roster Table */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Provisioned Student Accounts ({filteredStudents.length})
              </h3>

              {filteredStudents.length > 0 && (
                <div
                  onClick={handleSelectAll}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.813rem', color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  <div
                    style={{
                      width: '16px', height: '16px', borderRadius: '4px',
                      border: '1px solid var(--border-primary)',
                      background: selectedIds.length === filteredStudents.length ? 'var(--accent-purple)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {selectedIds.length === filteredStudents.length && <Check size={12} color="#fff" />}
                  </div>
                  <span>Select All</span>
                </div>
              )}

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', fontWeight: 700 }}
                >
                  <Trash2 size={14} /> Delete Selected ({selectedIds.length})
                </button>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isSuperAdmin && (
                <select
                  className="input-field"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.813rem', width: '140px' }}
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.id}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                className="input-field"
                placeholder="Search Roll No or Name..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                style={{ maxWidth: '220px', padding: '6px 12px', fontSize: '0.813rem' }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading student accounts...</p>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <GraduationCap size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem' }}>No student accounts found. Use the form on the right to provision a new student account.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredStudents.map(std => {
                const isChecked = selectedIds.includes(std.id);
                return (
                  <div
                    key={std.id}
                    style={{
                      padding: '12px 16px', borderRadius: '10px',
                      background: isChecked ? 'rgba(139, 92, 246, 0.08)' : 'var(--surface-glass)',
                      border: isChecked ? '1px solid var(--accent-purple)' : '1px solid var(--border-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div
                        onClick={() => handleToggleSelect(std.id)}
                        style={{
                          width: '18px', height: '18px', borderRadius: '5px',
                          border: isChecked ? '1px solid var(--accent-purple)' : '1px solid var(--border-primary)',
                          background: isChecked ? 'var(--accent-purple)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        {isChecked && <Check size={13} color="#fff" />}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.938rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{std.rollNumber || std.hallTicketNo}</span>
                          <span>• {std.name || std.fullName}</span>
                          <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 700 }}>
                            {std.section || 'Sec A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                          {std.email} • {std.department || 'CSE-DS'} (Year {std.year || '3'}, Sem {std.semester || '2'}, {std.regulation || 'R22'})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent(std);
                          setEditStdName(std.name || std.fullName || std.rollNumber);
                          setEditStdDept(std.department || 'CSE-DS');
                          const secStr = std.section ? String(std.section).trim() : 'Sec A';
                          if (['Sec A', 'Sec B', 'Sec C', 'Sec D', 'Sec E', 'Sec F'].includes(secStr)) {
                            setEditStdSectionSelect(secStr);
                            setEditCustomStdSection('');
                          } else if (['A', 'B', 'C', 'D', 'E', 'F'].includes(secStr)) {
                            setEditStdSectionSelect(`Sec ${secStr}`);
                            setEditCustomStdSection('');
                          } else {
                            setEditStdSectionSelect('Custom Section');
                            setEditCustomStdSection(secStr);
                          }
                          setEditStdYear(String(std.year || '4'));
                          setEditStdSem(String(std.semester || '1'));
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--accent-blue)', padding: '6px' }}
                        title="Edit Student Name, Section & Details"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(std.id, std.rollNumber)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '6px' }}
                        title="Remove Student Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Create Student Account Form */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} style={{ color: 'var(--accent-purple)' }} />
            Create Student Account
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
            Provision student accounts with assigned Class Section (Sec A–F or Custom). Self-registration is restricted.
          </p>

          <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Kommu Suraj Rao"
                value={stdName}
                onChange={e => setStdName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Roll / Hall Ticket Number *</label>
              <input
                className="input-field"
                placeholder="e.g. 23P61A6794"
                value={stdRoll}
                onChange={e => handleRollChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address *</label>
              <input
                type="email"
                className="input-field"
                placeholder="e.g. 23p61a6794@vbithyd.ac.in"
                value={stdEmail}
                onChange={e => setStdEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Default Password *</label>
              <input
                className="input-field"
                value={stdPassword}
                onChange={e => setStdPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                <select className="input-field" value={stdDept} onChange={e => setStdDept(e.target.value)}>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Class Section *</label>
                <select className="input-field" value={stdSectionSelect} onChange={e => setStdSectionSelect(e.target.value)}>
                  <option value="Sec A">Sec A</option>
                  <option value="Sec B">Sec B</option>
                  <option value="Sec C">Sec C</option>
                  <option value="Sec D">Sec D</option>
                  <option value="Sec E">Sec E</option>
                  <option value="Sec F">Sec F</option>
                  <option value="Custom Section">+ Custom Section</option>
                </select>
              </div>
            </div>

            {stdSectionSelect === 'Custom Section' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Enter Custom Section *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Sec G / DS-1"
                  value={customStdSection}
                  onChange={e => setCustomStdSection(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Regulation</label>
                <select className="input-field" value={stdRegulation} onChange={e => setStdRegulation(e.target.value)}>
                  <option value="R25">R25</option>
                  <option value="R22">R22</option>
                  <option value="R21">R21</option>
                  <option value="R19">R19</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Year</label>
                <select className="input-field" value={stdYear} onChange={e => setStdYear(e.target.value)}>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '10px', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>
              Provision Student Account
            </button>
          </form>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div
          onClick={() => setEditingStudent(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="solid-card animate-fade-in-up"
            style={{ maxWidth: '500px', width: '100%', padding: '26px', border: '1px solid var(--accent-purple)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--accent-purple)' }}>
                Edit Student Profile — {editingStudent.rollNumber || editingStudent.hallTicketNo}
              </h3>
              <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Student Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editStdName}
                  onChange={e => setEditStdName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Department
                  </label>
                  <select className="input-field" value={editStdDept} onChange={e => setEditStdDept(e.target.value)}>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Class Section *
                  </label>
                  <select className="input-field" value={editStdSectionSelect} onChange={e => setEditStdSectionSelect(e.target.value)}>
                    <option value="Sec A">Sec A</option>
                    <option value="Sec B">Sec B</option>
                    <option value="Sec C">Sec C</option>
                    <option value="Sec D">Sec D</option>
                    <option value="Sec E">Sec E</option>
                    <option value="Sec F">Sec F</option>
                    <option value="Custom Section">+ Custom Section</option>
                  </select>
                </div>
              </div>

              {editStdSectionSelect === 'Custom Section' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Enter Custom Section *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sec G / DS-1"
                    value={editCustomStdSection}
                    onChange={e => setEditCustomStdSection(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Academic Year
                  </label>
                  <select className="input-field" value={editStdYear} onChange={e => setEditStdYear(e.target.value)}>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Semester
                  </label>
                  <select className="input-field" value={editStdSem} onChange={e => setEditStdSem(e.target.value)}>
                    <option value="1">1st Sem</option>
                    <option value="2">2nd Sem</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submittingEdit} className="btn btn-primary" style={{ background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>
                  {submittingEdit ? 'Saving...' : 'Save Student Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
