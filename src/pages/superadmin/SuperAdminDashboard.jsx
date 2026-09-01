import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Shield, Building2, Users, Calendar, KeyRound, Plus, Trash2, Edit2, CheckCircle2, UserCheck, Search, X, Check, Eye, EyeOff } from 'lucide-react';
import { DEPARTMENTS } from '../../data/curriculumSeed';
import useNotificationStore from '../../stores/notificationStore';
import FacultyManagement from '../admin/FacultyManagement';

export default function SuperAdminDashboard() {
  const [schedules, setSchedules] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departmentAdmins, setDepartmentAdmins] = useState([]);
  const [activeDept, setActiveDept] = useState('ALL');
  const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'faculty' | 'schedules'

  // New Department Admin Form State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDept, setAdminDept] = useState('CSE');
  const [adminPassword, setAdminPassword] = useState('vbit1234');
  const [showProvisionPassword, setShowProvisionPassword] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState('');

  // Admin Edit Modal / State
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminDept, setEditAdminDept] = useState('CSE');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Faculty Directory Search State
  const [facSearchQuery, setFacSearchQuery] = useState('');

  // New Faculty Registration Form State (Global)
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facDept, setFacDept] = useState('CSE');
  const [facDesig, setFacDesig] = useState('Assistant Professor');
  const [facExp, setFacExp] = useState(5);
  const [facMaxHours, setFacMaxHours] = useState(16);
  const [isSubmittingFac, setIsSubmittingFac] = useState(false);
  const [facSuccess, setFacSuccess] = useState('');

  // Timetable Monitor Department Dropdown Filter
  const [monitorDeptFilter, setMonitorDeptFilter] = useState('ALL');

  const sendNotification = useNotificationStore(state => state.sendNotification);

  useEffect(() => {
    // Real-time Firestore snapshot listeners
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
        if (data.role === 'admin' || data.role === 'exam_controller') {
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

  // Create Department Admin Account in Firestore
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminName) return;
    setIsSubmittingAdmin(true);
    setAdminSuccess('');

    try {
      const emailLower = adminEmail.trim().toLowerCase();
      const adminId = `user_${emailLower.replace(/[^a-z0-9]/g, '_')}`;

      await setDoc(doc(db, 'users', adminId), {
        name: adminName.trim(),
        email: emailLower,
        role: 'admin',
        department: adminDept,
        password: adminPassword,
        createdAt: new Date().toISOString(),
      });

      // Send real-time system notification
      await sendNotification({
        title: 'Department Admin Provisioned',
        message: `Admin credential ${emailLower} created for Department of ${adminDept}.`,
        type: 'info',
        targetRole: 'admin',
        targetDepartment: adminDept,
      });

      setAdminSuccess(`Department Admin ${adminName} (${adminDept}) successfully provisioned!`);
      setAdminName('');
      setAdminEmail('');
    } catch (err) {
      console.error('Error creating admin:', err);
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Open Edit Admin Modal
  const handleStartEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.name || '');
    setEditAdminEmail(admin.email || '');
    setEditAdminDept(admin.department || 'CSE');
    setEditAdminPassword(admin.password || 'vbit1234');
  };

  // Save Edit Admin
  const handleSaveEditAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      await updateDoc(doc(db, 'users', editingAdmin.id), {
        name: editAdminName.trim(),
        email: editAdminEmail.trim().toLowerCase(),
        department: editAdminDept,
        password: editAdminPassword,
      });
      setEditingAdmin(null);
    } catch (err) {
      console.error('Error updating admin:', err);
      alert('Error updating admin: ' + err.message);
    }
  };

  // Delete Admin
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to revoke this admin credential?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  // Register New Faculty Member Globally
  const handleRegisterFaculty = async (e) => {
    e.preventDefault();
    if (!facName || !facEmail) return;
    setIsSubmittingFac(true);
    setFacSuccess('');

    try {
      const emailLower = facEmail.trim().toLowerCase();
      const facId = `fac_${emailLower.replace(/[^a-z0-9]/g, '_')}`;

      const newFacData = {
        id: facId,
        name: facName.trim(),
        email: emailLower,
        department: facDept,
        designation: facDesig,
        experienceYears: Number(facExp),
        maxWeeklyHours: Number(facMaxHours),
        createdAt: new Date().toISOString(),
      };

      // Write to both /faculty and /users
      await setDoc(doc(db, 'faculty', facId), newFacData);
      await setDoc(doc(db, 'users', facId), {
        ...newFacData,
        role: 'faculty',
      });

      // Send notification to Department Admin Portal
      await sendNotification({
        title: 'New Faculty Registered',
        message: `Super Admin registered ${facName} (${facDesig}) under Department of ${facDept}.`,
        type: 'success',
        targetRole: 'admin',
        targetDepartment: facDept,
      });

      setFacSuccess(`Faculty member ${facName} registered under ${facDept} in real-time!`);
      setFacName('');
      setFacEmail('');
    } catch (err) {
      console.error('Error registering faculty:', err);
    } finally {
      setIsSubmittingFac(false);
    }
  };

  // Scope & Search Filtered Lists
  const filteredSchedules = useMemo(() => {
    const scopeList = activeDept === 'ALL' ? schedules : schedules.filter(s => s.department === activeDept);
    if (monitorDeptFilter === 'ALL') return scopeList;
    return scopeList.filter(s => s.department === monitorDeptFilter);
  }, [schedules, activeDept, monitorDeptFilter]);

  const filteredFaculty = useMemo(() => {
    const scopeList = activeDept === 'ALL' ? faculty : faculty.filter(f => f.department === activeDept);
    if (!facSearchQuery.trim()) return scopeList;
    const q = facSearchQuery.trim().toLowerCase();
    return scopeList.filter(f => 
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      (f.department && f.department.toLowerCase().includes(q))
    );
  }, [faculty, activeDept, facSearchQuery]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Super Admin Banner */}
      <div style={{
        padding: '24px', borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(99, 102, 241, 0.08))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: '#8B5CF6', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
          }}>
            <Shield size={30} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Institutional Super Admin Control Console
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
              College-wide governance across all 13 departments, real-time departmental admin provisioning, and global schedule monitoring.
            </p>
          </div>
        </div>

        {/* Global Scope Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-glass)', padding: '8px 16px', borderRadius: '14px', border: '1px solid var(--border-primary)' }}>
          <Building2 size={18} style={{ color: '#8B5CF6' }} />
          <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Institutional Scope:</span>
          <select
            value={activeDept}
            onChange={e => setActiveDept(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#8B5CF6', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <option value="ALL">All 13 Departments (College-Wide)</option>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name} [{d.id}]</option>)}
          </select>
        </div>
      </div>

      {/* College-wide Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.12)', borderRadius: '14px', color: '#8B5CF6' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Academic Units</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{DEPARTMENTS.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '14px', color: '#3B82F6' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Published Timetables</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{schedules.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '14px', color: '#10B981' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Teaching Staff</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{faculty.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '14px', color: '#F59E0B' }}>
            <KeyRound size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Department Admins</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{departmentAdmins.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', pb: '12px' }}>
        <button
          onClick={() => setActiveTab('admins')}
          className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '10px 20px' }}
        >
          <KeyRound size={16} /> Department Admins Provisioning ({departmentAdmins.length})
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`btn ${activeTab === 'faculty' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '10px 20px' }}
        >
          <UserCheck size={16} /> Global Faculty Directory ({faculty.length})
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`btn ${activeTab === 'schedules' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '10px 20px' }}
        >
          <Calendar size={16} /> Institutional Timetable Registry ({schedules.length})
        </button>
      </div>

      {/* TAB 1: Department Admin Provisioning (FULL CRUD) */}
      {activeTab === 'admins' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          {/* Create Admin Form */}
          <div className="solid-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={20} style={{ color: '#8B5CF6' }} />
              Provision Department Admin Credential
            </h3>
            <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Create real login credentials for any department administrator. The departmental admin will operate strictly within their assigned department scope.
            </p>

            {adminSuccess && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#10B981', fontSize: '0.813rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {adminSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>Admin Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. ECE Admin"
                  className="input-field"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. eceadmin@vbithyd.ac.in"
                  className="input-field"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>Assigned Department</label>
                <select
                  className="input-field"
                  value={adminDept}
                  onChange={e => setAdminDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name} [{d.id}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>Default Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showProvisionPassword ? 'text' : 'password'}
                    required
                    className="input-field"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowProvisionPassword(!showProvisionPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px'
                    }}
                    title={showProvisionPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showProvisionPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isSubmittingAdmin} className="btn btn-primary" style={{ marginTop: '8px' }}>
                {isSubmittingAdmin ? 'Provisioning...' : 'Provision Admin Credential'}
              </button>
            </form>
          </div>

          {/* Active Department Administrators List (WITH EDIT & DELETE CRUD) */}
          <div className="solid-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <KeyRound size={20} style={{ color: '#8B5CF6' }} />
              Active Department Administrators ({departmentAdmins.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto' }}>
              {departmentAdmins.map(admin => (
                <div key={admin.id} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.938rem', color: 'var(--text-primary)' }}>{admin.name || admin.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{admin.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                      {admin.role === 'exam_controller' ? 'Exam Controller' : `Dept: ${admin.department || 'CSE'}`}
                    </span>
                    <button 
                      onClick={() => handleStartEditAdmin(admin)}
                      className="btn btn-ghost" 
                      style={{ padding: '6px', color: '#3B82F6' }}
                      title="Edit Admin Account"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(admin.id)} 
                      className="btn btn-ghost" 
                      style={{ padding: '6px', color: 'var(--danger)' }}
                      title="Revoke Admin Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {departmentAdmins.length === 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No active department administrators found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="solid-card" style={{ maxWidth: '480px', width: '100%', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} style={{ color: '#3B82F6' }} /> Edit Department Admin
              </h3>
              <button onClick={() => setEditingAdmin(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input
                  className="input-field"
                  value={editAdminName}
                  onChange={e => setEditAdminName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  value={editAdminEmail}
                  onChange={e => setEditAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Assigned Department</label>
                <select
                  className="input-field"
                  value={editAdminDept}
                  onChange={e => setEditAdminDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name} [{d.id}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showEditPassword ? 'text' : 'password'}
                    value={editAdminPassword}
                    onChange={e => setEditAdminPassword(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px'
                    }}
                    title={showEditPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditingAdmin(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Global Faculty Registration & Directory */}
      {activeTab === 'faculty' && (
        <FacultyManagement />
      )}

      {/* TAB 3: Institutional Timetable Monitor (WITH DEPARTMENT DROPDOWN FILTER) */}
      {activeTab === 'schedules' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} style={{ color: '#3B82F6' }} />
              Institutional Timetable Monitor ({filteredSchedules.length} Published)
            </h3>

            {/* Department Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-glass)', padding: '6px 14px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <Building2 size={16} style={{ color: '#3B82F6' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Filter Department:</span>
              <select
                value={monitorDeptFilter}
                onChange={e => setMonitorDeptFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#3B82F6', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <option value="ALL">Show All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name} [{d.id}]</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredSchedules.map(sched => (
              <div key={sched.id} style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-purple" style={{ fontWeight: 700 }}>{sched.department}</span>
                  <span className="badge badge-green">Published</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
                  Year {sched.year} Section {sched.section}
                </div>
                <div style={{ fontSize: '0.781rem', color: 'var(--text-tertiary)' }}>
                  Regulation: {sched.regulation} • Room: {sched.room || '301'}
                </div>
              </div>
            ))}
            {filteredSchedules.length === 0 && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '20px 0' }}>No published schedules found for the selected department filter.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
