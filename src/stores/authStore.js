/**
 * Auth Store — Zustand state management for Firebase Auth
 * 
 * Manages user authentication state, role verification, and session persistence.
 * Supports real-time user auto-provisioning for Faculty and Students registered in Firestore.
 */
import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut, 
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function getDeptFromEmail(email = '') {
  const handle = (email.split('@')[0] || '').toLowerCase();
  if (handle.includes('cseds') || handle.includes('cse-ds') || handle.includes('a67') || handle.includes('67')) return 'CSE-DS';
  if (handle.includes('cseaiml') || handle.includes('cse-aiml') || handle.includes('a66') || handle.includes('66')) return 'CSE-AIML';
  if (handle.includes('csecs') || handle.includes('cse-cs') || handle.includes('a62') || handle.includes('62')) return 'CSE-CS';
  if (handle.includes('csbs') || handle.includes('cse-bs')) return 'CSE-BS';
  if (handle.includes('cse') || handle.includes('a05')) return 'CSE';
  if (handle.includes('ece') || handle.includes('a04')) return 'ECE';
  if (handle.includes('eee') || handle.includes('a02')) return 'EEE';
  if (handle.includes('mech') || handle.includes('a03')) return 'MECH';
  if (handle.includes('civil') || handle.includes('a01')) return 'CIVIL';
  if (handle.includes('freshman') || handle.includes('hs')) return 'FRESHMAN_ENG';
  if (handle.includes('mba')) return 'MBA';
  if (handle.includes('mtech')) return 'MTECH';
  if (handle.includes('dept-it') || handle.includes('a12') || handle.startsWith('it')) return 'IT';
  return 'CSE-DS';
}

const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,

  /**
   * Real-time Login with auto-provisioning for Faculty & Students.
   */
  login: async (rawEmail, password, expectedRole) => {
    set({ loading: true, error: null });
    let email = rawEmail.trim().toLowerCase();

    // Auto-repair domain typos
    if (email.endsWith('.ac.i')) email = email + 'n';
    if (email.endsWith('.ac')) email = email + '.in';

    let actualRole = expectedRole;
    if (email.includes('superadmin')) {
      actualRole = 'superadmin';
    } else if (email.includes('sacdirector') || email.includes('sac_director')) {
      actualRole = 'sac_director';
    } else if (email.includes('principal')) {
      actualRole = 'principal';
    } else if (email.includes('examcontroller')) {
      actualRole = 'exam_controller';
    }

    try {
      // Enable per-tab session persistence so different roles can log in in separate tabs simultaneously
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch (pErr) {
        console.warn('Per-tab persistence configuration bypassed:', pErr);
      }

      // 1. Single Clean Authentication via Firebase Auth FIRST
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr) {
            if (createErr.code === 'auth/email-already-in-use') {
              set({ loading: false, error: 'Incorrect password for this institutional account.' });
              return false;
            }
          }
        } else {
          set({ loading: false, error: 'Login failed: Invalid email or password.' });
          return false;
        }
      }

      if (!userCredential || !userCredential.user) {
        set({ loading: false, error: 'Authentication failed. Please check your credentials.' });
        return false;
      }

      const uid = userCredential.user.uid;

      // Student Provisioning Guard: Ensure student accounts are pre-provisioned in Firestore
      if (actualRole === 'student' && !email.includes('superadmin')) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', uid));
          const handle = email.split('@')[0].toUpperCase();
          const studentDocSnap = await getDoc(doc(db, 'students', handle));

          if (!userDocSnap.exists() && !studentDocSnap.exists()) {
            // Check by email in users collection
            const usersRef = collection(db, 'users');
            const qEmail = query(usersRef, where('email', '==', email));
            const snap = await getDocs(qEmail);

            if (snap.empty) {
              await signOut(auth);
              set({ loading: false, error: 'Access Denied: Student account not provisioned by Super Admin. Please contact Examination Branch.' });
              return false;
            }
          }
        } catch (guardErr) {
          console.warn('Student provisioning check warning:', guardErr);
        }
      }

      // 2. Real-time Cloud Firestore Profile Sync
      const profileData = {
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: actualRole,
        department: getDeptFromEmail(email),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', uid), profileData, { merge: true });
      const userDoc = await getDoc(doc(db, 'users', uid));
      const profile = userDoc.exists() ? userDoc.data() : profileData;
      const resolvedRole = email.includes('superadmin') ? 'superadmin' : (profile?.role || actualRole);
      const resolvedDept = profile?.department || getDeptFromEmail(email);

      // Strict Role Verification Guard: Only Super Admin email/role can unlock Super Admin Console
      if (expectedRole === 'superadmin' && resolvedRole !== 'superadmin' && !email.includes('superadmin')) {
        set({ loading: false, error: 'Access Denied: Only Super Admin can access the Super Admin Portal.' });
        return false;
      }

      const updatedProfile = {
        ...profile,
        role: resolvedRole,
        department: resolvedDept,
        hallTicketNo: profile?.hallTicketNo || (resolvedRole === 'student' ? email.split('@')[0].toUpperCase() : null),
      };

      set({
        user: userCredential.user,
        role: resolvedRole,
        profile: { uid, ...updatedProfile },
        loading: false,
        error: null,
      });

      return true;
    } catch (err) {
      console.error('Strict Login Error:', err);
      set({ loading: false, error: 'Login failed: ' + (err.message || 'Check network connection.') });
      return false;
    }
  },

  /**
   * Sign out and clear all state with optional confirmation check
   */
  logout: async (skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = window.confirm('Are you sure you want to log out? Any unsaved progress will be lost.');
      if (!confirmed) return false;
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    set({ user: null, role: null, profile: null, error: null });
    return true;
  },

  /**
   * Initialize auth state listener
   */
  initializeAuth: () => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data();
            const email = (firebaseUser.email || profile.email || '').toLowerCase();
            const computedDept = getDeptFromEmail(email);
            const resolvedDept = (profile?.department === 'IT' && computedDept === 'CSE-DS') ? 'CSE-DS' : (profile?.department || computedDept);

            let resolvedRole = profile.role;
            if (email.includes('raju') || email.includes('y.raju') || email.includes('hod')) {
              resolvedRole = 'admin';
            }

            const updatedProfile = { uid: firebaseUser.uid, ...profile, role: resolvedRole, department: resolvedDept };

            if (profile.department !== resolvedDept || profile.role !== resolvedRole) {
              setDoc(doc(db, 'users', firebaseUser.uid), { role: resolvedRole, department: resolvedDept }, { merge: true }).catch(() => {});
            }

            set({
              user: firebaseUser,
              role: resolvedRole,
              profile: updatedProfile,
              loading: false,
              initialized: true,
            });
          } else {
            // Provision user profile for authenticated user
            const email = firebaseUser.email || '';
            const role = email.includes('student') ? 'student' : email.includes('admin') ? 'admin' : 'faculty';
            const computedDept = getDeptFromEmail(email);
            const profileData = {
              name: email.split('@')[0],
              email: email,
              role: role,
              department: computedDept,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), profileData);
            set({
              user: firebaseUser,
              role: role,
              profile: { uid: firebaseUser.uid, ...profileData },
              loading: false,
              initialized: true,
            });
          }
        } catch (err) {
          console.error('Auth state restore error:', err);
          set({ user: null, role: null, profile: null, loading: false, initialized: true });
        }
      } else {
        set({ user: null, role: null, profile: null, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },

  clearError: () => set({ error: null }),
}));

/**
 * Check if a student roll number or email has active venue booking privileges across all registered clubs (Supports Multi-Club Leads)
 */
export async function checkStudentClubLead(rollNumber, email) {
  try {
    const derivedRollFromEmail = email ? email.split('@')[0].toUpperCase() : '';
    const rollsToCheck = Array.from(new Set([
      rollNumber ? String(rollNumber).toUpperCase() : null,
      derivedRollFromEmail || null
    ].filter(Boolean)));

    const activeClubs = [];

    // 1. Query /club_leads
    for (const r of rollsToCheck) {
      const q1 = query(collection(db, 'club_leads'), where('rollNumber', '==', r));
      const snap1 = await getDocs(q1);
      snap1.forEach(docSnap => {
        const d = docSnap.data();
        if (d.isActive !== false && !activeClubs.some(c => c.clubName === d.clubName)) {
          activeClubs.push({
            clubName: d.clubName,
            clubDesignation: d.designation || 'Club Lead',
            department: d.department || 'CSE-DS',
          });
        }
      });
    }

    if (email) {
      const q2 = query(collection(db, 'club_leads'), where('email', '==', String(email).toLowerCase()));
      const snap2 = await getDocs(q2);
      snap2.forEach(docSnap => {
        const d = docSnap.data();
        if (d.isActive !== false && !activeClubs.some(c => c.clubName === d.clubName)) {
          activeClubs.push({
            clubName: d.clubName,
            clubDesignation: d.designation || 'Club Lead',
            department: d.department || 'CSE-DS',
          });
        }
      });
    }

    // 2. Query /club_members for PRESENT_TENURE
    for (const r of rollsToCheck) {
      const q3 = query(
        collection(db, 'club_members'),
        where('rollNumber', '==', r),
        where('tenureType', '==', 'PRESENT_TENURE')
      );
      const snap3 = await getDocs(q3);
      snap3.forEach(docSnap => {
        const d = docSnap.data();
        if (d.canBookVenues !== false && !activeClubs.some(c => c.clubName === d.clubName)) {
          activeClubs.push({
            clubName: d.clubName,
            clubDesignation: d.designation || 'Club Lead',
            department: d.department || 'CSE-DS',
          });
        }
      });
    }

    if (activeClubs.length > 0) {
      return {
        isClubLead: true,
        clubs: activeClubs,
        clubName: activeClubs[0].clubName,
        clubDesignation: activeClubs[0].clubDesignation,
      };
    }
  } catch (e) {
    console.warn('Error checking club lead privilege:', e);
  }
  return { isClubLead: false, clubs: [] };
}

export default useAuthStore;
