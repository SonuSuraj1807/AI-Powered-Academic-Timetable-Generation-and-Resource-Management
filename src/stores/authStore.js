/**
 * Auth Store — Zustand state management for Firebase Auth
 * 
 * Manages user authentication state, role verification, and session persistence.
 * Supports three portal roles: admin, faculty, student.
 */
import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,

  /**
   * Login via email/password with role verification.
   * Checks that the user's Firestore profile role matches the portal they're logging into.
   */
  login: async (email, password, expectedRole) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Fetch user profile from Firestore to verify role
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        await signOut(auth);
        set({ loading: false, error: 'Account not registered in the system. Contact your administrator.' });
        return false;
      }

      const profile = userDoc.data();
      
      // Allow superadmin access or match expectedRole
      if (expectedRole !== 'superadmin' && profile.role !== expectedRole) {
        await signOut(auth);
        set({ 
          loading: false, 
          error: `This account is registered as "${profile.role}". Please use the correct login portal.` 
        });
        return false;
      }

      if (expectedRole === 'superadmin' && profile.role !== 'superadmin') {
        await signOut(auth);
        set({
          loading: false,
          error: 'Access denied: Requires Institutional Super Admin credentials.'
        });
        return false;
      }

      set({
        user: userCredential.user,
        role: profile.role,
        profile: { uid, ...profile },
        loading: false,
        error: null,
      });
      return true;
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please wait and try again.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your connection and try again.';
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
   * Initialize auth state listener — called once on app mount.
   * Restores session if user is already authenticated.
   */
  initializeAuth: () => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
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
            // User exists in Auth but not in Firestore — sign them out
            await signOut(auth);
            set({ user: null, role: null, profile: null, loading: false, initialized: true });
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
