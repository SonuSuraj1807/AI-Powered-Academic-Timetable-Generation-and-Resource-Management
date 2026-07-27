import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { BookOpen, Plus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { ALL_CURRICULUM, DEPARTMENTS } from '../../data/curriculumSeed';

export default function CurriculumRegistryPage() {
  const [dbSubjects, setDbSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for adding
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('theory');
  const [credits, setCredits] = useState(3);
  const [regulation, setRegulation] = useState('R25');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [department, setDepartment] = useState('CSE-DS');

  // Custom regulation input states
  const [customRegulation, setCustomRegulation] = useState('');
  const [isAddingCustomReg, setIsAddingCustomReg] = useState(false);
  const [editCustomRegulation, setEditCustomRegulation] = useState('');
  const [isEditingCustomReg, setIsEditingCustomReg] = useState(false);

  // Editing states
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('theory');
  const [editCredits, setEditCredits] = useState(3);
  const [editRegulation, setEditRegulation] = useState('R25');
  const [editYear, setEditYear] = useState(1);
  const [editSemester, setEditSemester] = useState(1);
  const [editDepartment, setEditDepartment] = useState('CSE-DS');

  const uniqueRegulations = useMemo(() => {
    const regs = new Set(['R25', 'R22']);
    dbSubjects.forEach(s => {
      if (s.regulation) regs.add(s.regulation);
    });
    return Array.from(regs);
  }, [dbSubjects]);

  // Real-time syncing with Firestore with auto-seeding
  useEffect(() => {
    let unsubscribe = () => {};
    
    const checkAndSeedThenSync = async () => {
      try {
        const snap = await getDocs(collection(db, 'curriculum_registry'));
        
        // 1. Automatic Cleanup of Redundancies/Duplicates
        const seen = new Set();
        const duplicatesToDelete = [];
        snap.forEach(doc => {
          const sub = doc.data();
          const key = `${sub.code}_${sub.regulation}_Y${sub.year}_Sem${sub.semester}_${sub.department}`;
          if (seen.has(key)) {
            duplicatesToDelete.push(doc.ref);
          } else {
            seen.add(key);
          }
        });
        if (duplicatesToDelete.length > 0) {
          console.log(`Cleaning up ${duplicatesToDelete.length} duplicate subjects...`);
          // Batch delete duplicates (Firestore limit is 500 per batch, so slice if needed)
          const batch = writeBatch(db);
          duplicatesToDelete.forEach(ref => batch.delete(ref));
          await batch.commit();
        }

        // 2. Deterministic Seeding if empty
        if (snap.empty || (snap.size - duplicatesToDelete.length) === 0) {
          console.log('Registry empty. Seeding Firestore with curriculum definitions...');
          const batch = writeBatch(db);
          ALL_CURRICULUM.forEach((sub) => {
            const docId = `${sub.code}_${sub.regulation}_Y${sub.year}_Sem${sub.semester}_${sub.department}`;
            const docRef = doc(db, 'curriculum_registry', docId);
            batch.set(docRef, { ...sub });
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Error seeding/cleaning registry:', err);
      }

      unsubscribe = onSnapshot(collection(db, 'curriculum_registry'), (snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Sort by Year (1 to 4) -> Semester (1 to 2) -> Subject Code alphabetically
        list.sort((a, b) => {
          const yearA = Number(a.year) || 0;
          const yearB = Number(b.year) || 0;
          if (yearA !== yearB) return yearA - yearB;

          const semA = Number(a.semester) || 0;
          const semB = Number(b.semester) || 0;
          if (semA !== semB) return semA - semB;

          return a.code.localeCompare(b.code);
        });
        setDbSubjects(list);
        setLoading(false);
      });
    };

    checkAndSeedThenSync();
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    try {
      await addDoc(collection(db, 'curriculum_registry'), {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        credits: Number(credits),
        regulation,
        year: Number(year),
        semester: Number(semester),
        department,
      });
      setCode('');
      setName('');
      setCustomRegulation('');
      setIsAddingCustomReg(false);
      alert('Subject added to registry successfully!');
    } catch (err) {
      console.error(err);
      alert('Error adding subject: ' + err.message);
    }
  };

  const handleStartEdit = (sub) => {
    setEditingId(sub.id);
    setEditCode(sub.code);
    setEditName(sub.name);
    setEditType(sub.type);
    setEditCredits(sub.credits);
    setEditRegulation(sub.regulation);
    setEditYear(sub.year);
    setEditSemester(sub.semester);
    setEditDepartment(sub.department);
  };

  const handleSaveEdit = async (id) => {
    if (!editCode.trim() || !editName.trim()) return;
    try {
      await updateDoc(doc(db, 'curriculum_registry', id), {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        type: editType,
        credits: Number(editCredits),
        regulation: editRegulation,
        year: Number(editYear),
        semester: Number(editSemester),
        department: editDepartment,
      });
      setEditingId(null);
      setEditCustomRegulation('');
      setIsEditingCustomReg(false);
    } catch (err) {
      console.error(err);
      alert('Error updating subject: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this subject from the registry?')) return;
    try {
      await deleteDoc(doc(db, 'curriculum_registry', id));
    } catch (err) {
      console.error(err);
      alert('Error deleting subject: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={24} style={{ color: 'var(--accent-primary)' }} />
          Curriculum Registry
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Manage your institution\'s curriculum, add new subjects, and edit existing offerings in real-time.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Main List */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Registered Subjects Directory</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading registry...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dbSubjects.map((sub) => (
                <div key={sub.id} style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface-glass)', border: '1px solid var(--border-primary)'
                }}>
                  {editingId === sub.id ? (
                    // Editing Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                        <input className="input-field" value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="Code" style={{ fontSize: '0.75rem', padding: '6px' }} />
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Subject Name" style={{ fontSize: '0.75rem', padding: '6px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        <select className="input-field" value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '0.72rem', padding: '4px' }}>
                          <option value="theory">Theory</option>
                          <option value="lab">Lab</option>
                          <option value="elective">Elective</option>
                        </select>
                        <input className="input-field" type="number" step="0.5" value={editCredits} onChange={e => setEditCredits(e.target.value)} placeholder="Credits" style={{ fontSize: '0.72rem', padding: '4px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <select 
                            className="input-field" 
                            value={isEditingCustomReg ? 'CUSTOM' : editRegulation} 
                            onChange={e => {
                              if (e.target.value === 'CUSTOM') {
                                setIsEditingCustomReg(true);
                                setEditRegulation('');
                              } else {
                                setIsEditingCustomReg(false);
                                setEditRegulation(e.target.value);
                              }
                            }} 
                            style={{ fontSize: '0.72rem', padding: '4px' }}
                          >
                            {uniqueRegulations.map(r => <option key={r} value={r}>{r}</option>)}
                            <option value="CUSTOM">+ Custom...</option>
                          </select>
                          {isEditingCustomReg && (
                            <input 
                              className="input-field" 
                              value={editCustomRegulation} 
                              onChange={e => {
                                setEditCustomRegulation(e.target.value.toUpperCase());
                                setEditRegulation(e.target.value.toUpperCase());
                              }}
                              placeholder="Name" 
                              style={{ fontSize: '0.65rem', padding: '2px 4px', marginTop: '3px' }}
                              required 
                            />
                          )}
                        </div>
                        <select className="input-field" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} style={{ fontSize: '0.72rem', padding: '4px' }}>
                          {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input className="input-field" type="number" value={editYear} onChange={e => setEditYear(Number(e.target.value))} placeholder="Year" style={{ fontSize: '0.72rem', padding: '4px' }} />
                        <input className="input-field" type="number" value={editSemester} onChange={e => setEditSemester(Number(e.target.value))} placeholder="Semester" style={{ fontSize: '0.72rem', padding: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button onClick={() => handleSaveEdit(sub.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display View
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', marginRight: '10px' }}>
                          {sub.code}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{sub.name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {sub.regulation} • Year {sub.year} Sem {sub.semester} • {sub.credits} credits • {sub.type} ({sub.department})
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleStartEdit(sub)} className="btn btn-ghost" style={{ padding: '6px' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {dbSubjects.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No subjects in directory.</p>
              )}
            </div>
          )}
        </div>

        {/* Add Registry Form */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            Register Subject
          </h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Subject Code</label>
              <input className="input-field" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 22CS3111" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Subject Name</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Design & Analysis of Algorithms" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</label>
                <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab</option>
                  <option value="elective">Elective</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Credits</label>
                <input className="input-field" type="number" step="0.5" value={credits} onChange={e => setCredits(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Regulation</label>
                <select 
                  className="input-field" 
                  value={isAddingCustomReg ? 'CUSTOM' : regulation} 
                  onChange={e => {
                    if (e.target.value === 'CUSTOM') {
                      setIsAddingCustomReg(true);
                      setRegulation('');
                    } else {
                      setIsAddingCustomReg(false);
                      setRegulation(e.target.value);
                    }
                  }}
                >
                  {uniqueRegulations.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value="CUSTOM">+ Add Custom Regulation...</option>
                </select>
                {isAddingCustomReg && (
                  <input 
                    className="input-field" 
                    style={{ marginTop: '6px' }}
                    value={customRegulation}
                    onChange={e => {
                      setCustomRegulation(e.target.value.toUpperCase());
                      setRegulation(e.target.value.toUpperCase());
                    }}
                    placeholder="Type new regulation (e.g. R26)" 
                    required 
                  />
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Year</label>
                <input className="input-field" type="number" min="1" max="4" value={year} onChange={e => setYear(Number(e.target.value))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Semester</label>
                <input className="input-field" type="number" min="1" max="2" value={semester} onChange={e => setSemester(Number(e.target.value))} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Add Subject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
