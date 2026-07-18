/**
 * Notification Store — Real-time Firestore notification listener
 * 
 * Subscribes to the notifications collection filtered by recipientUID.
 * Provides live unread count and notification management.
 */
import { create } from 'zustand';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, updateDoc, writeBatch, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  unsubscribe: null,

  /**
   * Subscribe to real-time notifications for a specific user.
   * Automatically updates when new notifications arrive.
   */
  subscribeToNotifications: (uid) => {
    // Unsubscribe from any existing listener
    const { unsubscribe: existingUnsub } = get();
    if (existingUnsub) existingUnsub();

    const q = query(
      collection(db, 'notifications'),
      where('recipientUID', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const unreadCount = notifications.filter(n => n.status === 'unread').length;
      set({ notifications, unreadCount, loading: false });
    }, (error) => {
      console.error('Notification listener error:', error);
      set({ loading: false });
    });

    set({ unsubscribe: unsub });
    return unsub;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { status: 'read' });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  /**
   * Mark all notifications as read for the current user
   */
  markAllRead: async () => {
    const { notifications } = get();
    const unread = notifications.filter(n => n.status === 'unread');
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { status: 'read' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },

  /**
   * Clean up the listener on logout/unmount
   */
  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) unsubscribe();
    set({ notifications: [], unreadCount: 0, unsubscribe: null, loading: true });
  },
}));

export default useNotificationStore;
