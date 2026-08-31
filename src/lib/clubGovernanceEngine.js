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
 * Fetch members of a specific club filtered by tenure (PRESENT_TENURE or PAST_TENURE)
 */
export async function fetchClubMembers(clubId, tenureType = 'PRESENT_TENURE') {
  try {
    const q = query(
      collection(db, 'club_members'),
      where('clubId', '==', clubId),
      where('tenureType', '==', tenureType)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
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
    const snap = await getDocs(collection(db, 'club_members'));
    const list = [];
    snap.forEach(d => {
      const m = d.data();
      if (!deptName || m.department === deptName || m.department?.includes(deptName)) {
        list.push({ id: d.id, ...m });
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
 * Update an existing member record
 */
export async function updateClubMember(memberId, memberData) {
  const docRef = doc(db, 'club_members', memberId);
  const data = {
    ...memberData,
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, data);

  // If in PRESENT_TENURE, update privileges in /club_leads
  if (memberData.tenureType === 'PRESENT_TENURE' && memberData.rollNumber) {
    const leadDocRef = doc(db, 'club_leads', `${memberData.clubId}_${memberData.rollNumber}`);
    await setDoc(leadDocRef, {
      rollNumber: memberData.rollNumber,
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

  return { id: memberId, ...data };
}

/**
 * Delete a club member record
 */
export async function deleteClubMember(memberId) {
  const snap = await getDoc(doc(db, 'club_members', memberId));
  if (snap.exists()) {
    const m = snap.data();
    await deleteDoc(doc(db, 'club_members', memberId));
    
    // Revoke booking rights in /club_leads
    if (m.clubId && m.rollNumber) {
      await deleteDoc(doc(db, 'club_leads', `${m.clubId}_${m.rollNumber}`));
    }
  }
  return true;
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

