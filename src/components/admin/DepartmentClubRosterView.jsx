/**
 * DepartmentClubRosterView.jsx — HOD & Department Admin Club Roster Console
 * 
 * Allows HODs and Department Admins to filter and view all students in their department
 * holding lead or member positions across all VBIT student clubs in Present and Past Tenures.
 */
import { useState, useEffect } from 'react';
import { fetchDepartmentClubMembers, fetchClubs } from '../../lib/clubGovernanceEngine';
import { Users, Phone, Award, Search, Filter, ShieldCheck, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function DepartmentClubRosterView() {
  const { profile } = useAuthStore();
  const userDept = profile?.department || 'CSE-DS';

  const [members, setMembers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(userDept);
  const [tenureFilter, setTenureFilter] = useState('ALL'); // 'ALL' | 'PRESENT_TENURE' | 'PAST_TENURE'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClubs().then(cList => setClubs(cList));
    loadDeptMembers(selectedDept);
  }, [selectedDept]);

  const loadDeptMembers = async (dept) => {
    setLoading(true);
    const list = await fetchDepartmentClubMembers(dept);
    setMembers(list);
    setLoading(false);
  };

  const filteredMembers = members.filter(m => {
    const matchesTenure = tenureFilter === 'ALL' || m.tenureType === tenureFilter;
    const matchesSearch =
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.clubName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTenure && matchesSearch;
  });

  return (
    <div className="solid-card" style={{ padding: '24px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--accent-primary)' }} />
            Department Student Club Roster & Privilege Overview
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.844rem', marginTop: '2px' }}>
            Inspect students in <strong>{selectedDept}</strong> holding coordinator, lead, or core committee roles across all VBIT student clubs.
          </p>
        </div>

        {/* Dept Selector for Super Admin or Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="input-field"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{ width: 'auto', fontSize: '0.813rem' }}
          >
            {['CSE-DS', 'CSE', 'CSE-AIML', 'CSE-CS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA'].map(d => (
              <option key={d} value={d}>Dept: {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by student name, roll number, or club..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '0.813rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTenureFilter('ALL')}
            className={`btn btn-sm ${tenureFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          >
            All Tenures ({members.length})
          </button>
          <button
            onClick={() => setTenureFilter('PRESENT_TENURE')}
            className={`btn btn-sm ${tenureFilter === 'PRESENT_TENURE' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Present Tenure
          </button>
          <button
            onClick={() => setTenureFilter('PAST_TENURE')}
            className={`btn btn-sm ${tenureFilter === 'PAST_TENURE' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Past Tenure
          </button>
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading department club roster...</p>
      ) : filteredMembers.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p>No student club records found for department {selectedDept}.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
            <thead>
              <tr>
                <th>Student Roll & Name</th>
                <th>Club Name</th>
                <th>Club Designation</th>
                <th>Contact Details</th>
                <th>Class & Year</th>
                <th>Tenure Record</th>
                <th>Booking Credentials</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {m.studentName || (m.name && m.name !== m.rollNumber ? m.name : 'Student Lead')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '2px' }}>
                      {m.rollNumber}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-purple">{m.clubName}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.designation}</strong>
                  </td>
                  <td>
                    <div><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} /> {m.phone || 'N/A'}</div>
                    <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)' }}>{m.email}</div>
                  </td>
                  <td>
                    {m.year} • {m.section}
                  </td>
                  <td>
                    <span className={`badge badge-${m.tenureType === 'PRESENT_TENURE' ? 'green' : 'amber'}`}>
                      {m.tenureType === 'PRESENT_TENURE' ? `Active (${m.tenureLabel || '2025-2026'})` : `Past (${m.tenureLabel || '2024-2025'})`}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${m.canBookVenues !== false && m.tenureType === 'PRESENT_TENURE' ? 'green' : 'red'}`}>
                      {m.canBookVenues !== false && m.tenureType === 'PRESENT_TENURE' ? 'Authorized Booking Lead' : 'Revoked (403)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
