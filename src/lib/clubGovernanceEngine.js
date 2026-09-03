/**
 * clubGovernanceEngine.js — Student Activity Centre (SAC) Club & Tenure Governance Engine
 * 
 * Manages VBIT student clubs (/student_clubs) and member rosters (/club_members).
 * Supports multi-club memberships, Present vs Past Tenure archiving, phone numbers, class sections,
 * and SAC Director exclusive tenure completion declaration with automatic booking privilege revocation.
 */
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch
} from 'firebase/firestore';

export const DEFAULT_VBIT_CLUBS = [
  {
    id: 'abhedya',
    name: 'ABHEDYA',
    category: 'Cultural',
    description: 'VBIT Flagship Cultural & Event Management Club',
    establishedYear: '2015',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'ieee_vbit_sb',
    name: 'IEEE VBIT SB',
    category: 'Technical',
    description: 'IEEE Student Branch VBIT - Technical Innovation & Symposia',
    establishedYear: '2006',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'gdsc_vbit',
    name: 'GDSC VBIT',
    category: 'Technical',
    description: 'Google Developer Student Club - Software & Cloud Development',
    establishedYear: '2019',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'stuti',
    name: 'STUTI',
    category: 'Cultural',
    description: 'Music, Dance & Fine Arts Society of VBIT',
    establishedYear: '2012',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'robotics_club',
    name: 'ROBOTICS CLUB',
    category: 'Technical',
    description: 'Robotics, IoT & Embedded Hardware Innovation Cell',
    establishedYear: '2017',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'eco_club',
    name: 'ECO CLUB',
    category: 'Social',
    description: 'Environmental Protection, Green Campus & Sustainability',
    establishedYear: '2016',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'sportiva',
    name: 'SPORTIVA',
    category: 'Sports',
    description: 'VBIT Annual Sports & Athletics Council',
    establishedYear: '2010',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
  {
    id: 'literary_club',
    name: 'LITERARY CLUB',
    category: 'Literary',
    description: 'Debating, Model UN & Creative Writing Society',
    establishedYear: '2014',
    status: 'ACTIVE',
    currentTenure: '2025-2026',
  },
];

/**
 * Seed default VBIT student clubs if collection /student_clubs is empty
 */
export async function seedDefaultClubs() {
  try {
    const snap = await getDocs(collection(db, 'student_clubs'));
    if (snap.empty) {
      for (const club of DEFAULT_VBIT_CLUBS) {
        await setDoc(doc(db, 'student_clubs', club.id), {
          ...club,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Error seeding default clubs:', err);
  }
}

/**
 * Fetch all registered VBIT student clubs
 */
export async function fetchClubs() {
  try {
    await seedDefaultClubs();
    const snap = await getDocs(collection(db, 'student_clubs'));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('Error fetching clubs:', err);
    return DEFAULT_VBIT_CLUBS;
  }
}

/**
 * Add a new student club (SAC Director CRUD)
 */
export async function addClub(clubData) {
  const clubId = clubData.id || clubData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const docRef = doc(db, 'student_clubs', clubId);
  const data = {
    id: clubId,
    name: clubData.name.trim(),
    category: clubData.category || 'General',
    description: clubData.description || '',
    establishedYear: clubData.establishedYear || '2025',
    status: 'ACTIVE',
    currentTenure: clubData.currentTenure || '2025-2026',
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

/**
 * Update an existing student club
 */
export async function updateClub(clubId, clubData) {
  const docRef = doc(db, 'student_clubs', clubId);
  const data = {
    ...clubData,
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, data);
  return { id: clubId, ...data };
}

/**
 * Delete a student club
 */
export async function deleteClub(clubId) {
  await deleteDoc(doc(db, 'student_clubs', clubId));
  return true;
}

/**
 * Helper to fetch real student accounts from /students and /users
 * Maps rollNumber -> { name, email, phone, department, year, section }
 */
async function getStudentProfilesMap() {
  const map = new Map();
  try {
    const snapStudents = await getDocs(collection(db, 'students'));
    snapStudents.forEach(docSnap => {
      const d = docSnap.data();
      const roll = (d.hallTicketNo || d.rollNumber || '').trim().toUpperCase();
      if (roll) {
        let email = d.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
        if (email.endsWith('@vbit.ac.in')) email = email.replace('@vbit.ac.in', '@vbithyd.ac.in');
        map.set(roll, {
          name: d.name || d.displayName || d.fullName || roll,
          email,
          phone: d.phone || d.phoneNumber || '+91 98765 43210',
          department: d.department || 'CSE-DS',
          section: d.section || 'Sec A',
          year: d.year || '4th Year',
        });
      }
    });

    const snapUsers = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    snapUsers.forEach(docSnap => {
      const d = docSnap.data();
      const roll = (d.hallTicketNo || (d.email ? d.email.split('@')[0] : '')).trim().toUpperCase();
      if (roll && !map.has(roll)) {
        let email = d.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
        if (email.endsWith('@vbit.ac.in')) email = email.replace('@vbit.ac.in', '@vbithyd.ac.in');
        map.set(roll, {
          name: d.name || d.displayName || d.fullName || roll,
          email,
          phone: d.phone || d.phoneNumber || '+91 98765 43210',
          department: d.department || 'CSE-DS',
          section: d.section || 'Sec A',
          year: d.year || '4th Year',
        });
      }
    });
  } catch (err) {
    console.warn('Student profiles lookup warning:', err);
  }
  return map;
}

/**
 * Fetch members of a specific club filtered by tenure (PRESENT_TENURE or PAST_TENURE)
 */
export async function fetchClubMembers(clubId, tenureType = 'PRESENT_TENURE') {
  try {
    const list = [];
    const seenRolls = new Set();
    const studentMap = await getStudentProfilesMap();

    // 1. Fetch from /club_members
    const q1 = query(
      collection(db, 'club_members'),
      where('clubId', '==', clubId),
      where('tenureType', '==', tenureType)
    );
    const snap1 = await getDocs(q1);
    snap1.forEach(d => {
      const m = d.data();
      const roll = (m.rollNumber || '').trim().toUpperCase();
      if (roll) seenRolls.add(roll);

      const realProf = studentMap.get(roll);
      const resolvedName = realProf?.name || m.studentName || m.name || roll;
      let resolvedEmail = realProf?.email || m.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
      if (resolvedEmail.endsWith('@vbit.ac.in')) {
        resolvedEmail = resolvedEmail.replace('@vbit.ac.in', '@vbithyd.ac.in');
      }

      list.push({
        id: d.id,
        ...m,
        rollNumber: roll,
        name: resolvedName,
        studentName: resolvedName,
        email: resolvedEmail,
        phone: realProf?.phone || m.phone || '+91 98765 43210',
      });
    });

    // 2. If PRESENT_TENURE, also check /club_leads for matching club
    if (tenureType === 'PRESENT_TENURE') {
      let clubName = null;
      try {
        const clubSnap = await getDoc(doc(db, 'student_clubs', clubId));
        if (clubSnap.exists()) clubName = clubSnap.data().name;
      } catch (e) {}

      const snapLeads = await getDocs(collection(db, 'club_leads'));
      snapLeads.forEach(d => {
        const l = d.data();
        const matchesClub = l.clubId === clubId || (clubName && l.clubName === clubName);
        const roll = (l.rollNumber || '').trim().toUpperCase();
        if (matchesClub && roll && !seenRolls.has(roll) && l.isActive !== false) {
          seenRolls.add(roll);
          const cleanDocId = d.id.startsWith('lead_') ? d.id : `lead_${d.id}`;
          const realProf = studentMap.get(roll);
          const resolvedName = realProf?.name || l.studentName || l.name || roll;
          let resolvedEmail = realProf?.email || l.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
          if (resolvedEmail.endsWith('@vbit.ac.in')) {
            resolvedEmail = resolvedEmail.replace('@vbit.ac.in', '@vbithyd.ac.in');
          }

          list.push({
            id: cleanDocId,
            clubId,
            clubName: l.clubName || clubName || 'Student Club',
            rollNumber: roll,
            name: resolvedName,
            studentName: resolvedName,
            designation: l.designation || 'Club Lead',
            department: realProf?.department || l.department || 'CSE-DS',
            email: resolvedEmail,
            phone: realProf?.phone || l.phone || '+91 98765 43210',
            year: realProf?.year || '4th Year',
            section: realProf?.section || 'Sec A',
            tenureType: 'PRESENT_TENURE',
            tenureLabel: '2025-2026',
            canBookVenues: true,
          });
        }
      });
    }

    return list;
  } catch (err) {
    console.error('Error fetching club members:', err);
    return [];
  }
}

/**
 * Fetch all club members in a specific department for HOD & Dept Admin visibility
 */
export async function fetchDepartmentClubMembers(deptName) {
  try {
    const list = [];
    const seenKeys = new Set();
    const studentMap = await getStudentProfilesMap();

    const matchesDept = (dept1, targetDept) => {
      if (!targetDept || targetDept === 'ALL') return true;
      if (!dept1) return false;
      return dept1.trim().toUpperCase() === targetDept.trim().toUpperCase();
    };

    // 1. Fetch from /club_members
    const snap1 = await getDocs(collection(db, 'club_members'));
    snap1.forEach(d => {
      const m = d.data();
      const roll = (m.rollNumber || '').trim().toUpperCase();
      const realProf = studentMap.get(roll);
      const studentDept = realProf?.department || m.department;

      if (matchesDept(studentDept, deptName)) {
        const key = `${roll}_${m.clubName}_${m.tenureType || 'PRESENT_TENURE'}`;
        seenKeys.add(key);
        const resolvedName = realProf?.name || m.studentName || m.name || roll;
        let resolvedEmail = realProf?.email || m.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
        if (resolvedEmail.endsWith('@vbit.ac.in')) {
          resolvedEmail = resolvedEmail.replace('@vbit.ac.in', '@vbithyd.ac.in');
        }

        list.push({
          id: d.id,
          ...m,
          rollNumber: roll,
          name: resolvedName,
          studentName: resolvedName,
          email: resolvedEmail,
          phone: realProf?.phone || m.phone || '+91 98765 43210',
        });
      }
    });

    // 2. Fetch from /club_leads
    const snap2 = await getDocs(collection(db, 'club_leads'));
    snap2.forEach(d => {
      const l = d.data();
      const roll = (l.rollNumber || '').trim().toUpperCase();
      const realProf = studentMap.get(roll);
      const studentDept = realProf?.department || l.department;

      if (matchesDept(studentDept, deptName)) {
        const key = `${roll}_${l.clubName}_PRESENT_TENURE`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const resolvedName = realProf?.name || l.studentName || l.name || roll;
          let resolvedEmail = realProf?.email || l.email || `${roll.toLowerCase()}@vbithyd.ac.in`;
          if (resolvedEmail.endsWith('@vbit.ac.in')) {
            resolvedEmail = resolvedEmail.replace('@vbit.ac.in', '@vbithyd.ac.in');
          }

          list.push({
            id: `lead_${d.id}`,
            rollNumber: roll,
            name: resolvedName,
            studentName: resolvedName,
            clubName: l.clubName,
            designation: l.designation || 'Club Lead',
            department: studentDept || deptName || 'CSE-DS',
            email: resolvedEmail,
            phone: realProf?.phone || l.phone || '+91 98765 43210',
            year: realProf?.year || '4th Year',
            section: realProf?.section || 'Sec A',
            tenureType: 'PRESENT_TENURE',
            tenureLabel: '2025-2026',
            canBookVenues: l.isActive !== false,
          });
        }
      }
    });

    return list;
  } catch (err) {
    console.error('Error fetching department club members:', err);
    return [];
  }
}

/**
 * Add a student member to a club with full details (Phone, Class, Section, Year, Dept, Role)
 * Supports multi-club memberships cleanly.
 */
export async function addClubMember(clubId, memberData) {
  const rollNumber = (memberData.rollNumber || '').trim().toUpperCase();
  const tenureType = memberData.tenureType || 'PRESENT_TENURE';
  const memberDocId = `member_${clubId}_${rollNumber}_${tenureType}`;

  const docRef = doc(db, 'club_members', memberDocId);
  const data = {
    id: memberDocId,
    clubId,
    clubName: memberData.clubName || 'Student Club',
    rollNumber,
    name: (memberData.name || rollNumber).trim(),
    email: memberData.email || `${rollNumber.toLowerCase()}@vbit.ac.in`,
    phone: memberData.phone || '+91 98765 43210',
    year: memberData.year || '4th Year',
    section: memberData.section || 'Sec A',
    department: memberData.department || 'CSE-DS',
    designation: memberData.designation || 'Core Committee Member',
    roleCategory: memberData.roleCategory || 'LEAD', // 'LEAD' | 'CO_LEAD' | 'SECRETARY' | 'CORE' | 'MEMBER'
    tenureType,
    tenureLabel: memberData.tenureLabel || '2025-2026',
    canBookVenues: memberData.canBookVenues !== false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });

  // Sync venue booking privilege into /club_leads if lead/co-lead/secretary in PRESENT_TENURE
  if (tenureType === 'PRESENT_TENURE' && data.canBookVenues) {
    const leadDocRef = doc(db, 'club_leads', `${clubId}_${rollNumber}`);
    await setDoc(leadDocRef, {
      rollNumber,
      email: data.email,
      name: data.name,
      clubName: data.clubName,
      designation: data.designation,
      department: data.department,
      phone: data.phone,
      isActive: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return data;
}

/**
 * Update an existing member record (Safe setDoc merge)
 */
export async function updateClubMember(memberId, memberData) {
  try {
    const cleanId = String(memberId).replace(/^(lead_)+/, '');
    const data = {
      ...memberData,
      updatedAt: new Date().toISOString(),
    };

    // Use setDoc merge to guarantee no "No document to update" error!
    await setDoc(doc(db, 'club_members', cleanId), data, { merge: true });
    if (memberId !== cleanId) {
      await setDoc(doc(db, 'club_members', memberId), data, { merge: true }).catch(() => {});
    }

    // If in PRESENT_TENURE, update privileges in /club_leads
    if (memberData.tenureType === 'PRESENT_TENURE' && memberData.rollNumber) {
      const leadDocId = `${memberData.clubId || 'club'}_${memberData.rollNumber.toUpperCase()}`;
      await setDoc(doc(db, 'club_leads', leadDocId), {
        rollNumber: memberData.rollNumber.toUpperCase(),
        email: memberData.email,
        name: memberData.name,
        clubName: memberData.clubName,
        designation: memberData.designation,
        department: memberData.department,
        phone: memberData.phone,
        isActive: memberData.canBookVenues !== false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await setDoc(doc(db, 'club_leads', memberData.rollNumber.toUpperCase()), {
        rollNumber: memberData.rollNumber.toUpperCase(),
        email: memberData.email,
        name: memberData.name,
        clubName: memberData.clubName,
        designation: memberData.designation,
        department: memberData.department,
        phone: memberData.phone,
        isActive: memberData.canBookVenues !== false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return { id: cleanId, ...data };
  } catch (err) {
    console.error('Error in updateClubMember:', err);
    throw err;
  }
}

/**
 * Delete a club member record and revoke privileges in /club_leads
 */
export async function deleteClubMember(memberId, rollNumber = '', clubId = '') {
  try {
    const cleanId = String(memberId).replace(/^(lead_)+/, '');

    // 1. Delete from /club_members
    await deleteDoc(doc(db, 'club_members', memberId)).catch(() => {});
    await deleteDoc(doc(db, 'club_members', cleanId)).catch(() => {});

    // 2. Delete from /club_leads
    await deleteDoc(doc(db, 'club_leads', memberId)).catch(() => {});
    await deleteDoc(doc(db, 'club_leads', cleanId)).catch(() => {});

    // 3. Clean up by rollNumber
    const targetRoll = (rollNumber || cleanId.split('_').pop() || memberId.split('_').pop() || '').toUpperCase();
    const targetClub = clubId || (cleanId.includes('_') ? cleanId.split('_')[0] : '');

    if (targetClub && targetRoll) {
      await deleteDoc(doc(db, 'club_leads', `${targetClub}_${targetRoll}`)).catch(() => {});
      await deleteDoc(doc(db, 'club_members', `member_${targetClub}_${targetRoll}_PRESENT_TENURE`)).catch(() => {});
    }

    if (targetRoll && targetRoll.length >= 6) {
      await deleteDoc(doc(db, 'club_leads', targetRoll)).catch(() => {});
      const qLeads = query(collection(db, 'club_leads'), where('rollNumber', '==', targetRoll));
      const snapLeads = await getDocs(qLeads);
      snapLeads.forEach(async docSnap => {
        await deleteDoc(doc(db, 'club_leads', docSnap.id)).catch(() => {});
      });

      const qMembers = query(collection(db, 'club_members'), where('rollNumber', '==', targetRoll));
      const snapMembers = await getDocs(qMembers);
      snapMembers.forEach(async docSnap => {
        await deleteDoc(doc(db, 'club_members', docSnap.id)).catch(() => {});
      });
    }

    return true;
  } catch (err) {
    console.error('Error in deleteClubMember:', err);
    return false;
  }
}

/**
 * Declare Tenure Completion & Archive to Past Tenure (SAC Director Exclusive Action)
 * 
 * 1. Moves all active PRESENT_TENURE members of the club to PAST_TENURE under pastTenureLabel (e.g. 2024-2025).
 * 2. Automatically revokes booking access in /club_leads for those members (setting isActive: false).
 * 3. Results in 403 Forbidden message on student dashboards until new tenure leads are appointed!
 */
export async function declareTenureCompletion(clubId, pastTenureLabel = '2024-2025', newTenureLabel = '2025-2026') {
  const batch = writeBatch(db);

  // 1. Fetch current PRESENT_TENURE members
  const presentMembers = await fetchClubMembers(clubId, 'PRESENT_TENURE');

  for (const m of presentMembers) {
    const memberRef = doc(db, 'club_members', m.id);
    
    // Transition member to PAST_TENURE
    batch.update(memberRef, {
      tenureType: 'PAST_TENURE',
      tenureLabel: pastTenureLabel,
      canBookVenues: false,
      archivedAt: new Date().toISOString(),
    });

    // Revoke venue booking privilege in /club_leads (causes 403 Forbidden)
    if (m.rollNumber) {
      const leadRef = doc(db, 'club_leads', `${clubId}_${m.rollNumber}`);
      batch.update(leadRef, {
        isActive: false,
        archivedTenure: pastTenureLabel,
        revokedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Update club record with new tenure label
  const clubRef = doc(db, 'student_clubs', clubId);
  batch.update(clubRef, {
    currentTenure: newTenureLabel,
    lastTenureArchivedAt: new Date().toISOString(),
    lastArchivedTenureLabel: pastTenureLabel,
  });

  await batch.commit();
  return { archivedCount: presentMembers.length, pastTenureLabel, newTenureLabel };
}

/**
 * Dynamic Custom Designations Registry
 */
export const DEFAULT_DESIGNATIONS = [
  'Student Coordinator / Lead (President)',
  'Co-Lead / Vice President',
  'Hospitality Lead / Secretary / Treasurer',
  'Core Committee Member',
  'Documentation Lead',
  'PR & Media Lead',
  'Design Lead',
  'Logistics Coordinator',
  'General Member',
];

export async function fetchCustomDesignations() {
  try {
    const snap = await getDocs(collection(db, 'club_designations'));
    const list = [...DEFAULT_DESIGNATIONS];
    snap.forEach(d => {
      const name = d.data().name;
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  } catch (err) {
    console.error('Error fetching custom designations:', err);
    return DEFAULT_DESIGNATIONS;
  }
}

export async function addCustomDesignation(designationName) {
  const name = designationName.trim();
  if (!name) return;
  const docId = `desig_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  await setDoc(doc(db, 'club_designations', docId), {
    name,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return name;
}

/**
 * Dynamic Custom Departments Registry
 */
export const DEFAULT_DEPARTMENTS = [
  'CSE-DS',
  'CSE',
  'CSE-AIML',
  'CSE-CS',
  'CSE-BS',
  'IT',
  'ECE',
  'EEE',
  'MECH',
  'CIVIL',
  'FRESHMAN_ENG',
  'MBA',
  'MTECH',
];

export async function fetchCustomDepartments() {
  try {
    const snap = await getDocs(collection(db, 'custom_departments'));
    const list = [...DEFAULT_DEPARTMENTS];
    snap.forEach(d => {
      const name = d.data().name;
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  } catch (err) {
    console.error('Error fetching custom departments:', err);
    return DEFAULT_DEPARTMENTS;
  }
}

export async function addCustomDepartment(deptName) {
  const name = deptName.trim().toUpperCase();
  if (!name) return;
  const docId = `dept_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  await setDoc(doc(db, 'custom_departments', docId), {
    name,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return name;
}

/**
 * Dynamic Custom Club Categories Registry
 */
export const DEFAULT_CLUB_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Social',
  'Literary',
  'Professional',
];

export async function fetchCustomCategories() {
  try {
    const snap = await getDocs(collection(db, 'club_categories'));
    const list = [...DEFAULT_CLUB_CATEGORIES];
    snap.forEach(d => {
      const name = d.data().name;
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  } catch (err) {
    console.error('Error fetching custom categories:', err);
    return DEFAULT_CLUB_CATEGORIES;
  }
}

export async function addCustomCategory(categoryName) {
  const name = categoryName.trim();
  if (!name) return;
  const docId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  await setDoc(doc(db, 'club_categories', docId), {
    name,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return name;
}


