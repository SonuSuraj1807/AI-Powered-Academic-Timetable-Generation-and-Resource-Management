/**
 * SacDirectorDashboard.jsx — SAC Director Console (Tier 1 Venue Approval & SAC Governance Hub)
 * 
 * Features:
 * 1. Pending SAC Review Queue with Real-time Venue Conflict Radar.
 * 2. Live Venue Availability Matrix: Visual calendar/grid showing all approved and pending events across auditoriums.
 * 3. Review History table.
 * 4. Student Clubs & Tenure Governance: Club Directory CRUD, Member Registry (Phone, Section, Year, Dept, Role),
 *    Present vs Past Tenure views, and Double-Confirmation Tenure Completion Declaration with auto-revocation of booking credentials.
 */
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { fetchFacilities, sacReviewBooking } from '../../lib/facilityBookingEngine';
import VenueAvailabilityCalendar from '../../components/admin/VenueAvailabilityCalendar';
import {
  fetchClubs, addClub, updateClub, deleteClub,
  fetchClubMembers, addClubMember, updateClubMember, deleteClubMember,
  declareTenureCompletion,
  fetchCustomDesignations, addCustomDesignation,
  fetchCustomDepartments, addCustomDepartment,
  fetchCustomCategories, addCustomCategory
} from '../../lib/clubGovernanceEngine';
import {
  Building2, CheckCircle2, XCircle, Clock, Send, Calendar, Users, AlertCircle,
  Plus, Edit2, Trash2, Shield, Search, Phone, GraduationCap, Award, RefreshCw, AlertTriangle, Layers, X
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function SacDirectorDashboard() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'MATRIX' | 'CLUBS' | 'HISTORY'

  // Review Modal State
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [actionType, setActionType] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ----------------------------------------------------
  // CLUB & TENURE GOVERNANCE STATE
  // ----------------------------------------------------
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [tenureView, setTenureView] = useState('PRESENT_TENURE'); // 'PRESENT_TENURE' | 'PAST_TENURE'
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Club Modal State (Add/Edit)
  const [showClubModal, setShowClubModal] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [clubNameInput, setClubNameInput] = useState('');
  const [clubCategoryInput, setClubCategoryInput] = useState('Technical');
  const [clubDescInput, setClubDescInput] = useState('');
  const [clubEstYearInput, setClubEstYearInput] = useState('2025');

  // Member Modal State (Add/Edit)
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberRoll, setMemberRoll] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberYear, setMemberYear] = useState('4th Year');
  const [memberSection, setMemberSection] = useState('Sec A');
  const [memberDept, setMemberDept] = useState('CSE-DS');
  const [memberDesignation, setMemberDesignation] = useState('Student Coordinator / Lead (President)');
  const [memberCanBook, setMemberCanBook] = useState(true);

  // Dynamic Custom Category, Designation & Department State
  const [facilitiesList, setFacilitiesList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [customDesigText, setCustomDesigText] = useState('');
  const [customDeptText, setCustomDeptText] = useState('');

  // Double Confirmation Tenure Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveStep, setArchiveStep] = useState(1); // 1: Label Config, 2: Final Warning
  const [pastTenureLabel, setPastTenureLabel] = useState('2024-2025');
  const [newTenureLabel, setNewTenureLabel] = useState('2025-2026');
  const [archiving, setArchiving] = useState(false);

  // Full Screen Governance Roster Modal State
  const [activeClubModal, setActiveClubModal] = useState(null);

  // Keyboard Esc listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveClubModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Real-time Listeners for facility_bookings & facilities
  useEffect(() => {
    fetchFacilities().then(facs => setFacilitiesList(facs));

    const unsub = onSnapshot(collection(db, 'facility_bookings'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      setAllBookings(list);
      setRequests(list.filter(b => b.status === 'PENDING_SAC_APPROVAL'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Load Clubs, Categories, Designations & Departments when CLUBS tab is opened
  useEffect(() => {
    if (activeTab === 'CLUBS') {
      loadClubs();
    }
  }, [activeTab]);

  const loadClubs = async () => {
    setLoadingClubs(true);
    const list = await fetchClubs();
    setClubs(list);
    if (list.length > 0 && !selectedClub) {
      setSelectedClub(list[0]);
    }
    const cats = await fetchCustomCategories();
    setCategoryList(cats);
    const dList = await fetchCustomDesignations();
    setDesignationList(dList);
    const depts = await fetchCustomDepartments();
    setDeptList(depts);
    setLoadingClubs(false);
  };

  // 3. Load Club Members when selectedClub or tenureView changes
  useEffect(() => {
    if (selectedClub) {
      setLoadingMembers(true);
      fetchClubMembers(selectedClub.id, tenureView).then(list => {
        setClubMembers(list);
        setLoadingMembers(false);
      });
    }
  }, [selectedClub, tenureView]);

  const getMemberHierarchyRank = (designation = '') => {
    const d = (designation || '').toUpperCase();
    if (d.includes('CHAIRPERSON') || d.includes('PRESIDENT') || d.includes('CHIEF LEAD') || d.includes('HEAD LEAD') || d.includes('STUDENT LEAD')) return 1;
    if (d.includes('VICE CHAIR') || d.includes('VICE PRESIDENT') || d.includes('VICE') || d.includes('CO-LEAD') || d.includes('DEPUTY')) return 2;
    if (d.includes('SECRETARY') || d.includes('TREASURER') || d.includes('ADMINISTRATOR') || d.includes('ADMIN')) return 3;
    if (d.includes('REPRESENTATIVE') || d.includes('REP')) return 4;
    return 5;
  };

  const sortedClubMembers = useMemo(() => {
    return [...clubMembers].sort((a, b) => {
      const rankA = getMemberHierarchyRank(a.designation);
      const rankB = getMemberHierarchyRank(b.designation);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [clubMembers]);

  // Review Booking Request
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setSubmitting(true);
    try {
      await sacReviewBooking(reviewModalBooking.id, actionType, remarks, profile?.email || 'sacdirector@vbit.ac.in');
      alert(`Request for "${reviewModalBooking.eventTitle}" ${actionType === 'APPROVED' ? 'Approved & Forwarded to Principal' : 'Rejected'}.`);
      setReviewModalBooking(null);
      setRemarks('');
    } catch (err) {
      console.error(err);
      alert('Error submitting review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Club Add/Edit Submit
  const handleSaveClub = async (e) => {
    e.preventDefault();
    if (!clubNameInput.trim()) return alert('Please enter club name.');
    try {
      let finalCategory = clubCategoryInput;
      if (clubCategoryInput === '__ADD_NEW__') {
        if (!customCategoryText.trim()) return alert('Please enter custom category name.');
        finalCategory = customCategoryText.trim();
        await addCustomCategory(finalCategory);
        if (!categoryList.includes(finalCategory)) {
          setCategoryList([...categoryList, finalCategory]);
        }
      }

      if (editingClub) {
        await updateClub(editingClub.id, {
          name: clubNameInput.trim(),
          category: finalCategory,
          description: clubDescInput,
          establishedYear: clubEstYearInput,
        });
        alert(`Club "${clubNameInput}" updated successfully!`);
      } else {
        const newClub = await addClub({
          name: clubNameInput.trim(),
          category: finalCategory,
          description: clubDescInput,
          establishedYear: clubEstYearInput,
        });
        alert(`New Club "${clubNameInput}" created!`);
        setSelectedClub(newClub);
      }
      setShowClubModal(false);
      setCustomCategoryText('');
      loadClubs();
    } catch (err) {
      console.error(err);
      alert('Error saving club: ' + err.message);
    }
  };

  const handleDeleteClub = async (club) => {
    if (!confirm(`Are you sure you want to delete "${club.name}" from VBIT Club Directory?`)) return;
    try {
      await deleteClub(club.id);
      alert(`Club "${club.name}" deleted.`);
      setSelectedClub(null);
      loadClubs();
    } catch (err) {
      console.error(err);
      alert('Error deleting club: ' + err.message);
    }
  };

  // Member Add/Edit Submit
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberRoll.trim() || !selectedClub) return alert('Please fill in roll number.');

    try {
      let finalDesignation = memberDesignation;
      if (memberDesignation === '__ADD_NEW__') {
        if (!customDesigText.trim()) return alert('Please enter the new custom designation name.');
        finalDesignation = customDesigText.trim();
        await addCustomDesignation(finalDesignation);
        if (!designationList.includes(finalDesignation)) {
          setDesignationList([...designationList, finalDesignation]);
        }
      }

      let finalDept = memberDept;
      if (memberDept === '__ADD_NEW__') {
        if (!customDeptText.trim()) return alert('Please enter the new custom department name.');
        finalDept = customDeptText.trim().toUpperCase();
        await addCustomDepartment(finalDept);
        if (!deptList.includes(finalDept)) {
          setDeptList([...deptList, finalDept]);
        }
      }

      const data = {
        clubId: selectedClub.id,
        clubName: selectedClub.name,
        rollNumber: memberRoll.trim().toUpperCase(),
        name: memberName.trim() || memberRoll.trim().toUpperCase(),
        email: memberEmail.trim() || `${memberRoll.trim().toLowerCase()}@vbit.ac.in`,
        phone: memberPhone.trim() || '+91 98765 43210',
        year: memberYear,
        section: memberSection,
        department: finalDept,
        designation: finalDesignation,
        tenureType: tenureView,
        tenureLabel: selectedClub.currentTenure || '2025-2026',
        canBookVenues: memberCanBook,
      };

      if (editingMember) {
        await updateClubMember(editingMember.id, data);
        alert(`Member ${data.name} (${data.rollNumber}) updated!`);
      } else {
        await addClubMember(selectedClub.id, data);
        alert(`Member ${data.name} (${data.rollNumber}) added to ${selectedClub.name}!`);
      }
      setShowMemberModal(false);
      setCustomDesigText('');
      setCustomDeptText('');
      const list = await fetchClubMembers(selectedClub.id, tenureView);
      setClubMembers(list);
    } catch (err) {
      console.error(err);
      alert('Error saving member: ' + err.message);
    }
  };

  const handleDeleteMember = async (mem) => {
    if (!confirm(`Remove ${mem.name || mem.studentName || mem.rollNumber} (${mem.rollNumber}) from ${selectedClub.name}?`)) return;
    try {
      await deleteClubMember(mem.id, mem.rollNumber, selectedClub.id);
      alert(`Member removed.`);
      const list = await fetchClubMembers(selectedClub.id, tenureView);
      setClubMembers(list);
    } catch (err) {
      console.error(err);
      alert('Error removing member: ' + err.message);
    }
  };

  // Double-Confirmation Tenure Completion Handler
  const handleExecuteTenureCompletion = async () => {
    if (!selectedClub) return;
    setArchiving(true);
    try {
      const res = await declareTenureCompletion(selectedClub.id, pastTenureLabel, newTenureLabel);
      alert(`🎉 Tenure Completion Declared for "${selectedClub.name}"!\n\n` +
            `• ${res.archivedCount} members moved to Past Tenure (${pastTenureLabel}).\n` +
            `• Booking credentials for previous leads revoked (Access set to 403 Forbidden).\n` +
            `• Fresh tenure (${newTenureLabel}) initialized.`);
      setShowArchiveModal(false);
      setArchiveStep(1);
      loadClubs();
      setTenureView('PAST_TENURE');
    } catch (err) {
      console.error(err);
      alert('Error declaring tenure completion: ' + err.message);
    } finally {
      setArchiving(false);
    }
  };

  const approvedBookings = allBookings.filter(b => b.status === 'APPROVED' || b.status === 'SAC_APPROVED_WAITING_FOR_PRINCIPAL');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={30} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Student Activity Centre (SAC) Director Governance Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tier 1 Venue Approval Hub, Real-Time Slot Occupancy Matrix & Student Club Tenure Governance Console
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Clock size={16} /> Pending Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`btn ${activeTab === 'MATRIX' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Calendar size={16} /> Live Venue Availability Matrix ({approvedBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('CLUBS')}
          className={`btn ${activeTab === 'CLUBS' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Award size={16} /> Student Clubs & Tenure Governance
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn ${activeTab === 'HISTORY' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <CheckCircle2 size={16} /> Approval History ({allBookings.length - requests.length})
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PENDING QUEUE */}
      {/* ==================================================== */}
      {activeTab === 'PENDING' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading pending venue requests...</p>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: 'var(--accent-green)', opacity: 0.8 }} />
              <h3>All SAC Reviews Clear!</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>There are currently no venue booking requests waiting for SAC Director approval.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {requests.map(req => (
                <div
                  key={req.id}
                  className="solid-card"
                  style={{
                    padding: '20px', border: '1px solid var(--border-primary)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
                    background: 'var(--bg-elevated)', borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-purple">{req.clubName}</span>
                      <span className="badge badge-amber">Step 1: SAC Pending</span>
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {req.eventTitle}
                    </h3>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
                      🏛️ {req.facilityName}
                    </p>

                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                      <div><Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Requested Window: <strong>{req.date}</strong> ({req.startTime} - {req.endTime})</div>
                      <div><Users size={13} style={{ display: 'inline', marginRight: '4px' }} /> Expected Attendance: <strong>{req.expectedAttendance}</strong></div>
                      <div>Submitted By: <strong>{req.bookedByName}</strong> ({req.designation || 'Lead'}) — <span style={{ fontFamily: 'var(--font-mono)' }}>{req.bookedByRollNumber}</span></div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.781rem', color: 'var(--text-tertiary)' }}>
                      <strong>Description:</strong> {req.description || 'No description provided.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setReviewModalBooking(req); setActionType('APPROVED'); setRemarks(''); }}
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={15} /> Approve & Forward
                    </button>
                    <button
                      onClick={() => { setReviewModalBooking(req); setActionType('REJECTED'); setRemarks(''); }}
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: LIVE VENUE AVAILABILITY MATRIX */}
      {/* ==================================================== */}
      {activeTab === 'MATRIX' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <VenueAvailabilityCalendar bookings={allBookings} facilities={facilitiesList} />
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: STUDENT CLUBS & TENURE GOVERNANCE */}
      {/* ==================================================== */}
      {activeTab === 'CLUBS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Bar */}
          <div className="solid-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} style={{ color: 'var(--accent-primary)' }} />
                VBIT Registered Student Clubs & Organizations
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.844rem', marginTop: '2px' }}>
                Inspect student body clubs in a 3xN grid. Click on any club card to open the full-screen tenure governance roster.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingClub(null);
                setClubNameInput('');
                setClubCategoryInput('Technical');
                setClubDescInput('');
                setClubEstYearInput('2025');
                setShowClubModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add New Student Club
            </button>
          </div>

          {/* 3xN Grid of Club Cards */}
          {loadingClubs ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading student clubs directory...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
              {clubs.map(c => (
                <div
                  key={c.id}
                  className="solid-card card-hover"
                  style={{
                    padding: '16px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-elevated)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.938rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <Award size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </h3>
                      <span className="badge badge-purple" style={{ fontWeight: 700, fontSize: '0.688rem', padding: '2px 6px' }}>{c.category || 'Technical'}</span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.35', height: '32px', overflow: 'hidden' }}>
                      {c.description || 'VBIT Registered Student Body Organization.'}
                    </p>

                    <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Est: <strong>{c.establishedYear || '2020'}</strong></span>
                      <span>•</span>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {c.currentTenure || '2025-2026'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-primary)', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setSelectedClub(c);
                        setActiveClubModal(c);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      <Users size={13} /> Inspect Roster ➔
                    </button>

                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => {
                          setEditingClub(c);
                          setClubNameInput(c.name);
                          setClubCategoryInput(c.category || 'Technical');
                          setClubDescInput(c.description || '');
                          setClubEstYearInput(c.establishedYear || '2025');
                          setShowClubModal(true);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 6px' }}
                        title="Edit Club"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteClub(c)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 6px', color: 'var(--danger)' }}
                        title="Delete Club"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full-Screen Backdrop Blur Roster Governance Modal */}
          {activeClubModal && (
            <div
              onClick={() => setActiveClubModal(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                className="solid-card animate-fade-in-up"
                style={{
                  maxWidth: '1200px',
                  width: '95vw',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '28px',
                  borderRadius: '16px',
                  border: '1px solid var(--accent-primary)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  margin: 'auto',
                }}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        {activeClubModal.name}
                      </h2>
                      <span className="badge badge-purple" style={{ fontSize: '0.813rem' }}>{activeClubModal.category}</span>
                      <button
                        onClick={() => {
                          setEditingClub(activeClubModal);
                          setClubNameInput(activeClubModal.name);
                          setClubCategoryInput(activeClubModal.category || 'Technical');
                          setClubDescInput(activeClubModal.description || '');
                          setClubEstYearInput(activeClubModal.establishedYear || '2025');
                          setShowClubModal(true);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteClub(activeClubModal)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                      {activeClubModal.description || 'VBIT Registered Student Body Organization.'} • Established: {activeClubModal.establishedYear || '2020'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setArchiveStep(1);
                        setPastTenureLabel(activeClubModal.currentTenure || '2024-2025');
                        setNewTenureLabel('2025-2026');
                        setShowArchiveModal(true);
                      }}
                      className="btn btn-primary"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.813rem' }}
                    >
                      <RefreshCw size={15} /> Declare Tenure Completion & Archive
                    </button>

                    <button
                      onClick={() => setActiveClubModal(null)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px 10px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-secondary)' }}
                      title="Close Modal (Esc or Click Backdrop)"
                    >
                      <X size={22} />
                    </button>
                  </div>
                </div>

                {/* Tenure Filter Sub-Tabs & Add Member Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setTenureView('PRESENT_TENURE')}
                      className={`btn btn-sm ${tenureView === 'PRESENT_TENURE' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Present Tenure ({activeClubModal.currentTenure || '2025-2026'})
                    </button>
                    <button
                      onClick={() => setTenureView('PAST_TENURE')}
                      className={`btn btn-sm ${tenureView === 'PAST_TENURE' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Past Tenure Records
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setEditingMember(null);
                      setMemberRoll('');
                      setMemberName('');
                      setMemberEmail('');
                      setMemberPhone('+91 98765 43210');
                      setMemberYear('4th Year');
                      setMemberSection('Sec A');
                      setMemberDept('CSE-DS');
                      setMemberDesignation('Student Coordinator / Lead');
                      setMemberCanBook(true);
                      setShowMemberModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Add Student Member
                  </button>
                </div>

                {/* Member Roster Table */}
                {loadingMembers ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>Loading member roster...</p>
                ) : sortedClubMembers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.938rem' }}>No members registered in {tenureView === 'PRESENT_TENURE' ? 'Present Tenure' : 'Past Tenure'}. Click "Add Student Member" to add coordinators and leads.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'center' }}>Student Roll & Name</th>
                          <th style={{ textAlign: 'center' }}>Club Designation</th>
                          <th style={{ textAlign: 'center' }}>Class & Dept</th>
                          <th style={{ textAlign: 'center' }}>Contact Details</th>
                          <th style={{ textAlign: 'center' }}>Booking Privileges</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedClubMembers.map(m => (
                          <tr key={m.id}>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                {m.studentName || m.name}
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '2px' }}>
                                {m.rollNumber}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--accent-purple)', fontSize: '0.875rem' }}>
                                {m.designation}
                              </div>
                              <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                Tenure: {m.tenureLabel || '2025-2026'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <span className="badge badge-purple" style={{ fontWeight: 700 }}>{m.department}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {m.year} • {m.section}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <div><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} /> {m.phone || 'N/A'}</div>
                              <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{m.email}</div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <span className={`badge badge-${m.canBookVenues !== false && tenureView === 'PRESENT_TENURE' ? 'green' : 'red'}`} style={{ whiteSpace: 'nowrap' }}>
                                {m.canBookVenues !== false && tenureView === 'PRESENT_TENURE' ? '✓ Authorized Lead' : '🔒 Revoked (403)'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => {
                                    setEditingMember(m);
                                    setMemberRoll(m.rollNumber || '');
                                    setMemberName(m.name || '');
                                    setMemberEmail(m.email || '');
                                    setMemberPhone(m.phone || '');
                                    setMemberYear(m.year || '4th Year');
                                    setMemberSection(m.section || 'Sec A');
                                    setMemberDept(m.department || 'CSE-DS');
                                    setMemberDesignation(m.designation || 'Lead');
                                    setMemberCanBook(m.canBookVenues !== false);
                                    setShowMemberModal(true);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 8px' }}
                                  title="Edit Member"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(m)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 8px', color: 'var(--danger)' }}
                                  title="Delete Member"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: REVIEW HISTORY */}
      {/* ==================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="solid-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.813rem' }}>
              <thead>
                <tr>
                  <th>Event & Club</th>
                  <th>Facility</th>
                  <th>Date & Slot</th>
                  <th>Status</th>
                  <th>SAC Review Remarks</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.filter(b => b.status !== 'PENDING_SAC_APPROVAL').map(h => (
                  <tr key={h.id}>
                    <td>
                      <strong>{h.eventTitle}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.clubName} ({h.bookedByName})</div>
                    </td>
                    <td>{h.facilityName}</td>
                    <td>{h.date} ({h.startTime} - {h.endTime})</td>
                    <td><span className={`badge badge-${h.status.includes('REJECTED') ? 'red' : h.status === 'APPROVED' ? 'green' : 'blue'}`}>{h.status}</span></td>
                    <td>{h.sacReview?.remarks || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REVIEW MODAL */}
      {/* ==================================================== */}
      {reviewModalBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: `1px solid ${actionType === 'APPROVED' ? 'var(--accent-primary)' : 'var(--danger)'}` }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '12px', color: actionType === 'APPROVED' ? 'var(--accent-primary)' : 'var(--danger)' }}>
              {actionType === 'APPROVED' ? 'Approve & Forward to Principal' : 'Reject Venue Allocation Request'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Event: <strong>{reviewModalBooking.eventTitle}</strong> ({reviewModalBooking.clubName}) at <strong>{reviewModalBooking.facilityName}</strong>.
            </p>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  SAC Director Review Remarks *
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={actionType === 'APPROVED' ? 'e.g. Recommended for college event schedule.' : 'Specify reason for rejection...'}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setReviewModalBooking(null)} className="btn btn-ghost">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn ${actionType === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ background: actionType === 'REJECTED' ? 'var(--danger)' : undefined, color: actionType === 'REJECTED' ? '#fff' : undefined }}
                >
                  {submitting ? 'Processing...' : actionType === 'APPROVED' ? 'Confirm & Forward to Principal' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CLUB ADD/EDIT MODAL */}
      {/* ==================================================== */}
      {showClubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '480px', width: '100%', padding: '24px', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px' }}>
              {editingClub ? 'Edit Student Club Details' : 'Add New VBIT Student Club'}
            </h3>
            <form onSubmit={handleSaveClub} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Club Name *</label>
                <input type="text" className="input-field" placeholder="e.g. ABHEDYA, IEEE VBIT SB" value={clubNameInput} onChange={e => setClubNameInput(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Category *</label>
                  <select className="input-field" value={clubCategoryInput} onChange={e => setClubCategoryInput(e.target.value)}>
                    {categoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="__ADD_NEW__">➕ Add Custom Category...</option>
                  </select>
                  {clubCategoryInput === '__ADD_NEW__' && (
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Type custom category (e.g. Fine Arts)..."
                      value={customCategoryText}
                      onChange={e => setCustomCategoryText(e.target.value)}
                      style={{ marginTop: '6px', border: '1px solid var(--accent-primary)' }}
                      required
                    />
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Established Year</label>
                  <input type="text" className="input-field" placeholder="e.g. 2018" value={clubEstYearInput} onChange={e => setClubEstYearInput(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea className="input-field" rows={2} placeholder="Brief objective of the club..." value={clubDescInput} onChange={e => setClubDescInput(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowClubModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingClub ? 'Update Club' : 'Create Club'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MEMBER ADD/EDIT MODAL */}
      {/* ==================================================== */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '520px', width: '100%', padding: '24px', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px' }}>
              {editingMember ? `Edit Member — ${editingMember.name}` : `Add Student Member to ${selectedClub?.name}`}
            </h3>
            <form onSubmit={handleSaveMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Roll Number *</label>
                  <input type="text" className="input-field" placeholder="e.g. 23P61A6794" value={memberRoll} onChange={e => setMemberRoll(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Student Name *</label>
                  <input type="text" className="input-field" placeholder="Full Name" value={memberName} onChange={e => setMemberName(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone Number *</label>
                  <input type="text" className="input-field" placeholder="+91 98765 43210" value={memberPhone} onChange={e => setMemberPhone(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department *</label>
                  <select className="input-field" value={memberDept} onChange={e => setMemberDept(e.target.value)}>
                    {deptList.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="__ADD_NEW__">➕ Add Custom Department...</option>
                  </select>
                  {memberDept === '__ADD_NEW__' && (
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Type custom dept (e.g. AI & DS)..."
                      value={customDeptText}
                      onChange={e => setCustomDeptText(e.target.value)}
                      style={{ marginTop: '6px', border: '1px solid var(--accent-primary)' }}
                      required
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Academic Year</label>
                  <select className="input-field" value={memberYear} onChange={e => setMemberYear(e.target.value)}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Class Section</label>
                  <input type="text" className="input-field" placeholder="e.g. Sec B" value={memberSection} onChange={e => setMemberSection(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Club Designation *</label>
                <select className="input-field" value={memberDesignation} onChange={e => setMemberDesignation(e.target.value)}>
                  {designationList.map(des => <option key={des} value={des}>{des}</option>)}
                  <option value="__ADD_NEW__">➕ Add Custom Designation...</option>
                </select>
                {memberDesignation === '__ADD_NEW__' && (
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Type custom designation (e.g. Documentation Lead)..."
                    value={customDesigText}
                    onChange={e => setCustomDesigText(e.target.value)}
                    style={{ marginTop: '6px', border: '1px solid var(--accent-primary)' }}
                    required
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input type="checkbox" id="mem-book-right" checked={memberCanBook} onChange={e => setMemberCanBook(e.target.checked)} />
                <label htmlFor="mem-book-right" style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Grant Venue Booking Authorization Credentials
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingMember ? 'Update Member' : 'Save Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DOUBLE CONFIRMATION TENURE COMPLETION MODAL */}
      {/* ==================================================== */}
      {showArchiveModal && selectedClub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '520px', width: '100%', padding: '26px', border: '2px solid #F59E0B' }}>
            
            {archiveStep === 1 ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={22} /> Step 1/2: Declare Tenure Completion
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  You are about to declare tenure completion for <strong>{selectedClub.name}</strong>. Please specify the past tenure label and the new tenure label.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Label for Completed Tenure (Archiving To Past) *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 2024-2025"
                      value={pastTenureLabel}
                      onChange={e => setPastTenureLabel(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Label for New Upcoming Tenure *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 2025-2026"
                      value={newTenureLabel}
                      onChange={e => setNewTenureLabel(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowArchiveModal(false)} className="btn btn-ghost">Cancel</button>
                  <button
                    onClick={() => {
                      if (!pastTenureLabel.trim() || !newTenureLabel.trim()) return alert('Please specify both tenure labels.');
                      setArchiveStep(2);
                    }}
                    className="btn btn-primary"
                    style={{ background: '#F59E0B', border: 'none' }}
                  >
                    Next: Re-Confirm Action ➔
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={24} /> Step 2/2: CRITICAL DOUBLE CONFIRMATION
                </h3>

                <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.844rem', marginBottom: '16px', lineHeight: 1.5 }}>
                  <strong>⚠️ Warning — Governance Action:</strong>
                  <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                    <li>All active Present Tenure members of <strong>{selectedClub.name}</strong> will be moved to <strong>Past Tenure ({pastTenureLabel})</strong>.</li>
                    <li>Active venue booking credentials for previous leads will be <strong>REVOKED IMMEDIATELY</strong>.</li>
                    <li>Student dashboards for outgoing leads will render <strong>403 Forbidden</strong> until new tenure credentials are officially appointed!</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setArchiveStep(1)} className="btn btn-ghost">Back</button>
                  <button
                    onClick={handleExecuteTenureCompletion}
                    disabled={archiving}
                    className="btn btn-primary"
                    style={{ background: 'var(--danger)', border: 'none' }}
                  >
                    {archiving ? 'Executing Archive...' : 'YES, CONFIRM TENURE COMPLETION & REVOKE CREDENTIALS'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

