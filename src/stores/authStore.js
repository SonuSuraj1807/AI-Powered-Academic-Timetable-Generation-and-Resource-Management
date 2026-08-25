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
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function getDeptFromEmail(email = '') {
  const lower = email.toLowerCase();
  if (lower.includes('cseds') || lower.includes('cse-ds')) return 'CSE-DS';
  if (lower.includes('cseaiml') || lower.includes('cse-aiml')) return 'CSE-AIML';
  if (lower.includes('csecs') || lower.includes('cse-cs')) return 'CSE-CS';
  if (lower.includes('csbs') || lower.includes('cse-bs')) return 'CSE-BS';
  if (lower.includes('cse')) return 'CSE';
  if (lower.includes('ece')) return 'ECE';
  if (lower.includes('eee')) return 'EEE';
  if (lower.includes('mech')) return 'MECH';
  if (lower.includes('civil')) return 'CIVIL';
  if (lower.includes('freshman') || lower.includes('hs')) return 'FRESHMAN_ENG';
  if (lower.includes('mba')) return 'MBA';
  if (lower.includes('mtech')) return 'MTECH';
  if (lower.includes('it')) return 'IT';
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
    const email = rawEmail.trim().toLowerCase();

    try {
      let userCredential = null;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr) {
        // If account doesn't exist in Firebase Auth yet, create it on-the-fly
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/user-disabled'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr) {
            console.error('Real-time auth provision error:', createErr);
            set({ loading: false, error: 'Authentication failed. Please check your credentials or password length (min 6 chars).' });
            return false;
          }
        } else {
          throw authErr;
        }
      }

      const uid = userCredential.user.uid;

      // Infer role & department from email patterns
      let actualRole = expectedRole;
      if (email.startsWith('superadmin')) actualRole = 'superadmin';
      else if (email.startsWith('examcontroller') || email.includes('exam')) actualRole = 'exam_controller';

      let userDoc = await getDoc(doc(db, 'users', uid));

      if (!userDoc.exists()) {
        let name = email.split('@')[0].toUpperCase();
        let dept = getDeptFromEmail(email);

        try {
          const facQuery = query(collection(db, 'faculty'), where('email', '==', email));
          const facSnap = await getDocs(facQuery);
          if (!facSnap.empty) {
            name = facSnap.docs[0].data().name;
            dept = facSnap.docs[0].data().department || dept;
          }
        } catch (facErr) {
          console.warn('Faculty lookup bypassed:', facErr);
        }

        const profileData = {
          name,
          email,
          role: actualRole,
          department: dept,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', uid), profileData);
        userDoc = await getDoc(doc(db, 'users', uid));
      }

      const profile = userDoc.data();

      // Ensure profile department and role align
      const updatedProfile = {
        ...profile,
        role: actualRole,
        department: profile.department || getDeptFromEmail(email)
      };

      if (profile.role !== actualRole || !profile.department) {
        await setDoc(doc(db, 'users', uid), updatedProfile, { merge: true });
      }

      set({
        user: userCredential.user,
        role: actualRole,
        profile: { uid, ...updatedProfile },
        loading: false,
        error: null,
      });
      return true;
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please check credentials.';
      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.';
      }
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  /**
   * Sign out and clear all state
   */
  logout: async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    set({ user: null, role: null, profile: null, error: null });
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
            set({
              user: firebaseUser,
              role: profile.role,
              profile: { uid: firebaseUser.uid, ...profile },
              loading: false,
              initialized: true,
            });
          } else {
            // Provision user profile for authenticated user
            const email = firebaseUser.email || '';
            const role = email.includes('student') ? 'student' : email.includes('admin') ? 'admin' : 'faculty';
            const profileData = {
              name: email.split('@')[0],
              email: email,
              role: role,
              department: 'CSE-DS',
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

export default useAuthStore;
