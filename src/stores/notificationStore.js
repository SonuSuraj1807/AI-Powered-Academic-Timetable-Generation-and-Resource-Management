/**
 * Notification Store — Real-time Firestore cross-portal notification system.
 * 
 * Routes real-time alerts across:
 *   - Faculty Portal (Invigilation duties, timetable updates, substitution alerts)
 *   - Student Portal (Exam schedules, seating arrangements, timetable published)
 *   - Admin / Super Admin Portals (College-wide announcements, conflict alerts)
 */
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  /**
   * Listen to real-time notifications for a target user role / email / department
   */
  subscribeToNotifications: (userRole, userEmail, department) => {
    set({ loading: true });

    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const allList = [];
        snap.forEach(docSnap => {
          allList.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Filter notifications relevant to current user
        const userNotifications = allList.filter(n => {
          if (n.targetRole === 'ALL') return true;
          if (n.targetRole === userRole) {
            if (!n.targetDepartment || n.targetDepartment === 'ALL' || n.targetDepartment === department) {
              return true;
            }
          }
          if (n.targetEmail && n.targetEmail.toLowerCase() === (userEmail || '').toLowerCase()) {
            return true;
          }
          return false;
        });

        const unread = userNotifications.filter(n => !n.read).length;
        set({ notifications: userNotifications, unreadCount: unread, loading: false });
      }, (err) => {
        console.error('Notification snapshot error:', err);
        set({ loading: false });
      });

      return unsubscribe;
    } catch (err) {
      console.error('Notification subscription failed:', err);
      set({ loading: false });
      return () => {};
    }
  },

  /**
   * Send a system notification across portals
   */
  sendNotification: async ({ title, message, type = 'info', targetRole = 'ALL', targetDepartment = 'ALL', targetEmail = null }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        type, // 'info' | 'success' | 'warning' | 'exam' | 'duty'
        targetRole, // 'student' | 'faculty' | 'admin' | 'exam_controller' | 'ALL'
        targetDepartment,
        targetEmail,
        read: false,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error sending notification:', err);
      return false;
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  }
}));

export default useNotificationStore;
