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
  currentUserKey: 'guest',

  /**
   * Listen to real-time notifications for a target user role / email / department / section
   */
  subscribeToNotifications: (userRole, userEmail, department, userSection = 'A') => {
    const userKey = (userEmail || userRole || 'guest').toLowerCase();
    set({ loading: true, currentUserKey: userKey });

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

        // Get user-scoped read & dismissed IDs from localStorage
        const readStorageKey = `vbit_read_notifications_${userKey}`;
        const dismissStorageKey = `vbit_dismissed_notifications_${userKey}`;
        const readIds = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
        const dismissedIds = new Set(JSON.parse(localStorage.getItem(dismissStorageKey) || '[]'));

        // Filter notifications relevant to current user
        const userNotifications = allList
          .filter(n => !dismissedIds.has(n.id))
          .filter(n => {
            // Direct email target
            if (n.targetEmail) {
              return n.targetEmail.toLowerCase() === (userEmail || '').toLowerCase();
            }
            if (n.targetRole === 'ALL') return true;
            if (n.targetRole === userRole) {
              if (n.targetDepartment && n.targetDepartment !== 'ALL' && n.targetDepartment !== department) {
                return false;
              }
              if (userRole === 'student' && n.targetSection && n.targetSection !== 'ALL' && !String(userSection || 'A').includes(n.targetSection)) {
                return false;
              }
              return true;
            }
            return false;
          })
          .map(n => ({
            ...n,
            isRead: readIds.has(n.id),
          }));

        const unread = userNotifications.filter(n => !n.isRead).length;
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
  sendNotification: async ({ title, message, type = 'info', targetRole = 'ALL', targetDepartment = 'ALL', targetSection = 'ALL', targetEmail = null }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        type, // 'info' | 'success' | 'warning' | 'exam' | 'duty'
        targetRole, // 'student' | 'faculty' | 'admin' | 'exam_controller' | 'ALL'
        targetDepartment,
        targetSection,
        targetEmail,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error sending notification:', err);
      return false;
    }
  },

  /**
   * Mark a notification as read for current user
   */
  markAsRead: (notificationId) => {
    const { currentUserKey, notifications } = get();
    if (!currentUserKey) return;
    const readStorageKey = `vbit_read_notifications_${currentUserKey}`;
    const readIds = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
    readIds.add(notificationId);
    localStorage.setItem(readStorageKey, JSON.stringify([...readIds]));

    const updated = notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
    const unread = updated.filter(n => !n.isRead).length;
    set({ notifications: updated, unreadCount: unread });
  },

  /**
   * Dismiss notification banner from screen
   */
  dismissNotification: (notificationId) => {
    const { currentUserKey, notifications } = get();
    if (!currentUserKey) return;
    const dismissStorageKey = `vbit_dismissed_notifications_${currentUserKey}`;
    const dismissedIds = new Set(JSON.parse(localStorage.getItem(dismissStorageKey) || '[]'));
    dismissedIds.add(notificationId);
    localStorage.setItem(dismissStorageKey, JSON.stringify([...dismissedIds]));

    const updated = notifications.filter(n => n.id !== notificationId);
    const unread = updated.filter(n => !n.isRead).length;
    set({ notifications: updated, unreadCount: unread });
  },

  /**
   * Mark all unread notifications as read
   */
  markAllRead: () => {
    const { currentUserKey, notifications } = get();
    if (!currentUserKey) return;
    const readStorageKey = `vbit_read_notifications_${currentUserKey}`;
    const readIds = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
    notifications.forEach(n => readIds.add(n.id));
    localStorage.setItem(readStorageKey, JSON.stringify([...readIds]));

    const updated = notifications.map(n => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadCount: 0 });
  }
}));

export default useNotificationStore;
