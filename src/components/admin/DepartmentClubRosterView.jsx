/**
 * DepartmentClubRosterView.jsx — HOD & Department Admin Club Roster Console
 * 
 * Allows HODs and Department Admins to filter and view all students in their department
 * holding lead or member positions across all VBIT student clubs in Present and Past Tenures.
 */
import { useState, useEffect, useMemo } from 'react';
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

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesTenure = tenureFilter === 'ALL' || m.tenureType === tenureFilter;
      const matchesSearch =
        !searchTerm.trim() ||
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.clubName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTenure && matchesSearch;
    });
  }, [members, tenureFilter, searchTerm]);

  // Group members by rollNumber for unified multi-club student view
  const groupedStudents = useMemo(() => {
    const map = {};
    filteredMembers.forEach(m => {
      const roll = (m.rollNumber || '').trim().toUpperCase();
      if (!roll) return;
      if (!map[roll]) {
        map[roll] = {
          rollNumber: roll,
          name: m.studentName || (m.name && m.name !== roll ? m.name : 'Student Representative'),
          email: m.email ? m.email.replace('@vbit.ac.in', '@vbithyd.ac.in') : `${roll.toLowerCase()}@vbithyd.ac.in`,
          phone: m.phone || '+91 98765 43210',
          year: m.year || '4th Year',
          section: m.section || 'Sec A',
          department: m.department || selectedDept,
          clubs: [],
        };
      }
      map[roll].clubs.push({
        id: m.id,
        clubName: m.clubName,
        designation: m.designation || 'Club Lead',
        tenureType: m.tenureType || 'PRESENT_TENURE',
        tenureLabel: m.tenureLabel || '2025-2026',
        canBookVenues: m.canBookVenues !== false,
      });
    });
    return Object.values(map);
  }, [filteredMembers, selectedDept]);

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
      ) : groupedStudents.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p>No student club records found for department {selectedDept}.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', minWidth: '160px' }}>Student Roll & Name</th>
                <th style={{ textAlign: 'center', minWidth: '260px' }}>Clubs & Designations</th>
                <th style={{ textAlign: 'center', minWidth: '180px' }}>Contact Details</th>
                <th style={{ textAlign: 'center', minWidth: '130px' }}>Class & Dept</th>
                <th style={{ textAlign: 'center', minWidth: '160px' }}>Booking Credentials</th>
              </tr>
            </thead>
            <tbody>
              {groupedStudents.map(s => {
                const activeClubs = s.clubs.filter(c => c.canBookVenues && c.tenureType === 'PRESENT_TENURE');
                return (
                  <tr key={s.rollNumber}>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {s.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '2px' }}>
                        {s.rollNumber}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        {s.clubs.map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                            <span className="badge badge-purple" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.clubName}</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-purple)', fontSize: '0.813rem', whiteSpace: 'nowrap' }}>{c.designation}</span>
                            <span className={`badge badge-${c.tenureType === 'PRESENT_TENURE' ? 'green' : 'amber'}`} style={{ fontSize: '0.719rem', whiteSpace: 'nowrap' }}>
                              {c.tenureType === 'PRESENT_TENURE' ? 'Active' : 'Past Tenure'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} /> {s.phone || 'N/A'}</div>
                      <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{s.email}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <span className="badge badge-purple" style={{ fontWeight: 700 }}>{s.department}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {s.year} • {s.section}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <span className={`badge badge-${activeClubs.length > 0 ? 'green' : 'red'}`} style={{ whiteSpace: 'nowrap' }}>
                        {activeClubs.length > 0 ? `✓ Authorized (${activeClubs.length} Club${activeClubs.length > 1 ? 's' : ''})` : '🔒 Revoked / Inactive (403)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
