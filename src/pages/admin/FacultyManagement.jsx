import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, firebaseConfig } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Users, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, RefreshCw, CalendarCheck } from 'lucide-react';
import { DEPARTMENTS } from '../../data/curriculumSeed';
import FacultyScheduleModal from '../../components/faculty/FacultyScheduleModal';

const SEED_FACULTY = [
  { name: 'Dr. Y. Raju', designation: 'Professor & HoD', email: 'y.raju@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Dr. N Arjun', designation: 'Associate Professor', email: 'n.arjun@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Dr. P. Punitha', designation: 'Associate Professor', email: 'p.punitha@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Mrs. Moola Lavanya', designation: 'Assistant Professor', email: 'm.lavanya@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Mrs. S. Adilakshmi', designation: 'Assistant Professor', email: 's.adilakshmi@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Bhukya Venkanna', designation: 'Assistant Professor', email: 'b.venkanna@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Raju Vadicherla', designation: 'Assistant Professor', email: 'r.vadicherla@vbit.ac.in', department: 'CSE-DS' },
  { name: 'PULUKURI OSHIN', designation: 'Assistant Professor', email: 'p.oshin@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Haripriya Nakka', designation: 'Assistant Professor', email: 'h.nakka@vbit.ac.in', department: 'CSE-DS' },
  { name: 'K. Spandana', designation: 'Assistant Professor', email: 'k.spandana@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Cheruku Sathyanarayana', designation: 'Assistant Professor', email: 'c.sathyanarayana@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Sasikala Rasamsetty', designation: 'Assistant Professor', email: 's.rasamsetty@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Ms. Ch. Lavanya', designation: 'Assistant Professor', email: 'ch.lavanya@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Karunakar Reddy Palla', designation: 'Assistant Professor', email: 'k.reddy@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Boddupalli Vishali', designation: 'Assistant Professor', email: 'b.vishali@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Maturi Praveen', designation: 'Assistant Professor', email: 'm.praveen@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Gundaram Sampath', designation: 'Assistant Professor', email: 'g.sampath@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Vijay Kumar A', designation: 'Assistant Professor', email: 'vijay.kumar@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Prasanna Kumar Gumpula', designation: 'Assistant Professor', email: 'p.kumar@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Racharla Kalpana', designation: 'Assistant Professor', email: 'r.kalpana@vbit.ac.in', department: 'CSE-DS' },
  { name: 'B. Amrutha Raju', designation: 'Assistant Professor', email: 'b.amrutha@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Palakollu Divya', designation: 'Assistant Professor', email: 'p.divya@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Vanaparthi S R Krishna', designation: 'Assistant Professor', email: 'v.krishna@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Vamshi Krushna Sirikonda', designation: 'Assistant Professor', email: 'v.sirikonda@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Devarakonda Sravan Kumar', designation: 'Assistant Professor', email: 'd.sravan@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Barre Bhasker', designation: 'Assistant Professor', email: 'b.bhasker@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Baburao Vanaparla', designation: 'Assistant Professor', email: 'b.vanaparla@vbit.ac.in', department: 'CSE-DS' },
  { name: 'B Krishna Kumar', designation: 'Assistant Professor', email: 'b.krishna@vbit.ac.in', department: 'CSE-DS' },
  { name: 'Mamatha Cherukupalli', designation: 'Assistant Professor', email: 'm.cherukupalli@vbit.ac.in', department: 'CSE-DS' }
];

const getSecondaryAuth = () => {
  const app = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
  return getAuth(app);
};

export default function FacultyManagement() {
  const [searchParams] = useSearchParams();
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterQuery, setFilterQuery] = useState(searchParams.get('q') || '');
  const [selectedFacultyModal, setSelectedFacultyModal] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('CSE-DS');
  const [designation, setDesignation] = useState('Assistant Professor');

  // Edit states
  const [isEditing, setIsEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('CSE-DS');
  const [editDesignation, setEditDesignation] = useState('Assistant Professor');

  // Real-time syncing with Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setFacultyList(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSeedFaculty = async () => {
    if (!confirm('This will seed the 29 VBIT CSE-DS faculty members and auto-create secure accounts in Firebase Auth. Proceed?')) return;
    setSeeding(true);
    let count = 0;
    try {
      const secAuth = getSecondaryAuth();
      for (const f of SEED_FACULTY) {
        const exists = facultyList.some(fac => fac.email.toLowerCase() === f.email.toLowerCase());
        if (!exists) {
          try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(secAuth, f.email, 'Password@123');
            const uid = userCredential.user.uid;

            // Write details to faculty registry
            await setDoc(doc(db, 'faculty', uid), {
              name: f.name,
              email: f.email,
              department: f.department,
              designation: f.designation,
              workloadHours: 0,
              uid: uid,
            });

            // Save role to users collection
            await setDoc(doc(db, 'users', uid), {
              name: f.name,
              email: f.email,
              role: 'faculty',
              department: f.department,
              designation: f.designation,
            });

            count++;
          } catch (authErr) {
            console.error(`Auth creation failed for ${f.name}:`, authErr);
            if (authErr.code === 'auth/email-already-in-use') {
              const tempUid = `fac_${f.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`;
              await setDoc(doc(db, 'faculty', tempUid), {
                name: f.name,
                email: f.email,
                department: f.department,
                designation: f.designation,
                workloadHours: 0,
                uid: tempUid,
              });
              await setDoc(doc(db, 'users', tempUid), {
                name: f.name,
                email: f.email,
                role: 'faculty',
                department: f.department,
                designation: f.designation,
              });
              count++;
            }
          }
        }
      }
      await secAuth.signOut();
      alert(`Seeder complete! Successfully registered ${count} faculty profiles. Default Login Password: Password@123`);
    } catch (err) {
      console.error('Seeding error:', err);
      alert('Error seeding faculty pool: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    try {
      const secAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'faculty', uid), {
        name: name.trim(),
        email: email.trim(),
        department,
        designation,
        workloadHours: 0,
        uid: uid,
      });

      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email: email.trim(),
        role: 'faculty',
        department,
        designation,
      });

      await secAuth.signOut();
      setName('');
      setEmail('');
      setPassword('');
      alert('Faculty member registered successfully in Auth & Firestore!');
    } catch (err) {
      console.error(err);
      alert('Error adding faculty: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this faculty member?')) return;
    try {
      await deleteDoc(doc(db, 'faculty', id));
      // Also delete from users table
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error(err);
      alert('Error deleting faculty: ' + err.message);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateDoc(doc(db, 'faculty', id), {
        name: editName.trim(),
        email: editEmail.trim(),
        designation: editDesignation,
        department: editDepartment,
      });
      // Also update in users collection
      await updateDoc(doc(db, 'users', id), {
        name: editName.trim(),
        email: editEmail.trim(),
        designation: editDesignation,
        department: editDepartment,
      });
      setIsEditing(null);
    } catch (err) {
      console.error(err);
      alert('Error updating faculty: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} style={{ color: 'var(--accent-primary)' }} />
            Faculty Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Add, update, and manage teaching staff. Synchronized in real-time with Firestore.
          </p>
        </div>
        <button
          disabled={seeding}
          onClick={handleSeedFaculty}
          className="btn btn-primary animate-pulse"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          {seeding ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {seeding ? 'Seeding Faculty Pool...' : 'Seed VBIT DS Faculty Pool'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Faculty List Card */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              Registered Faculty ({facultyList.filter(f => !filterQuery || f.name.toLowerCase().includes(filterQuery.toLowerCase()) || f.email.toLowerCase().includes(filterQuery.toLowerCase())).length})
            </h3>

            {/* Filter Search Input */}
            <input
              type="text"
              className="input-field"
              placeholder="Search faculty name or email..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{ maxWidth: '240px', padding: '6px 12px', fontSize: '0.813rem' }}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading faculty members...</p>
          ) : facultyList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No faculty members registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {facultyList
                .filter(f => !filterQuery || f.name.toLowerCase().includes(filterQuery.toLowerCase()) || f.email.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((f) => (
                <div key={f.id} style={{
                  display: 'flex', justifyItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '10px',
                  background: 'var(--surface-glass)', border: '1px solid var(--border-primary)'
                }}>
                  {isEditing === f.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginRight: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} placeholder="Name" />
                        <input className="input-field" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ flex: 1 }} placeholder="Email" />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select className="input-field" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}>
                          {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
                        </select>
                        <select className="input-field" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}>
                          <option value="Professor & HoD">Professor & HoD</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setSelectedFacultyModal(f)}
                      style={{ cursor: 'pointer', flex: 1 }}
                      title="Click to view detailed subject assignments & weekly time slot schedule"
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.938rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {f.name}
                        <CalendarCheck size={14} style={{ opacity: 0.6 }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{f.email} • {f.designation} ({f.department})</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isEditing === f.id ? (
                      <>
                        <button onClick={() => handleSaveEdit(f.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--success)' }}>
                          <Check size={16} />
                        </button>
                        <button onClick={() => setIsEditing(null)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--text-muted)' }}>
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => {
                          setIsEditing(f.id);
                          setEditName(f.name);
                          setEditEmail(f.email);
                          setEditDepartment(f.department || 'CSE-DS');
                          setEditDesignation(f.designation || 'Assistant Professor');
                        }} className="btn btn-ghost" style={{ padding: '6px' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(f.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Faculty Form */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            Add Faculty
          </h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Kumar Swamy" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address</label>
              <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. kumar@vbit.ac.in" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Portal Password</label>
              <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set initial password" required minLength={6} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
              <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Designation</label>
              <select className="input-field" value={designation} onChange={e => setDesignation(e.target.value)}>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Add Member
            </button>
          </form>
        </div>
      </div>

      {/* Detailed Faculty Schedule & Substitutions Modal */}
      <FacultyScheduleModal
        faculty={selectedFacultyModal}
        isOpen={!!selectedFacultyModal}
        onClose={() => setSelectedFacultyModal(null)}
      />
    </div>
  );
}
