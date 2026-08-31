/**
 * facilityBookingEngine.js — Facility & Venue Allocation Engine
 * Supports Two-Tier Multi-Level Approval Workflow (SAC Director -> Principal),
 * State Guards, and Real-Time Slot Conflict Checking for VBIT auditoriums and departmental seminar halls.
 */
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot
} from 'firebase/firestore';
import useNotificationStore from '../stores/notificationStore';

export const DEFAULT_FACILITIES = [
  {
    facilityId: 'nalandha_auditorium',
    name: 'Nalandha Auditorium',
    capacity: 1200,
    locationBlock: 'Nalandha Block',
    amenities: ['AC', 'Sound System', 'Stage Lights', 'HD Projector', 'Podium', 'Green Rooms', 'VIP Lounge'],
    isOperational: true,
  },
  {
    facilityId: 'chethana_auditorium',
    name: 'Chethana Auditorium',
    capacity: 800,
    locationBlock: 'Aakash Block',
    amenities: ['AC', 'Sound System', 'Stage Lights', 'HD Projector', 'Podium', 'Green Rooms'],
    isOperational: true,
  },
  {
    facilityId: 'cse_seminar_hall',
    name: 'CSE Departmental Seminar Hall',
    capacity: 300,
    locationBlock: 'Avishkar Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'LAN Connectivity'],
    isOperational: true,
  },
  {
    facilityId: 'cseds_seminar_hall',
    name: 'CSE-DS (Data Science) Seminar Hall',
    capacity: 250,
    locationBlock: 'Avishkar Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'LAN Connectivity'],
    isOperational: true,
  },
  {
    facilityId: 'cseaiml_seminar_hall',
    name: 'CSE-AIML Seminar Hall',
    capacity: 250,
    locationBlock: 'Avishkar Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'AI Workstations'],
    isOperational: true,
  },
  {
    facilityId: 'csecs_seminar_hall',
    name: 'CSE-CS (Cyber Security) Seminar Hall',
    capacity: 250,
    locationBlock: 'Avishkar Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'Cyber Lab Link'],
    isOperational: true,
  },
  {
    facilityId: 'it_seminar_hall',
    name: 'IT Departmental Seminar Hall',
    capacity: 250,
    locationBlock: 'IT Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium'],
    isOperational: true,
  },
  {
    facilityId: 'ece_seminar_hall',
    name: 'ECE Departmental Seminar Hall',
    capacity: 250,
    locationBlock: 'Pratham Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'DSP Demo Rig'],
    isOperational: true,
  },
  {
    facilityId: 'eee_seminar_hall',
    name: 'EEE Departmental Seminar Hall',
    capacity: 200,
    locationBlock: 'Srujan Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium'],
    isOperational: true,
  },
  {
    facilityId: 'mech_seminar_hall',
    name: 'Mechanical Departmental Seminar Hall',
    capacity: 250,
    locationBlock: 'Mechanical Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium'],
    isOperational: true,
  },
  {
    facilityId: 'civil_seminar_hall',
    name: 'Civil Departmental Seminar Hall',
    capacity: 200,
    locationBlock: 'Civil Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium'],
    isOperational: true,
  },
  {
    facilityId: 'mba_seminar_hall',
    name: 'MBA / Humanities Seminar Hall',
    capacity: 200,
    locationBlock: 'Nalandha Block',
    amenities: ['AC', 'Sound System', 'HD Projector', 'Podium', 'Executive Seating'],
    isOperational: true,
  },
];

/**
 * Seed default facilities into Firestore /facilities if missing
 */
export async function seedDefaultFacilities() {
  try {
    const snap = await getDocs(collection(db, 'facilities'));
    if (snap.empty) {
      for (const fac of DEFAULT_FACILITIES) {
        await setDoc(doc(db, 'facilities', fac.facilityId), fac);
      }
    }
  } catch (err) {
    console.error('Error seeding default facilities:', err);
  }
}

/**
 * Fetch all operational facilities strictly managed in Firestore
 */
export async function fetchFacilities() {
  try {
    const snap = await getDocs(collection(db, 'facilities'));
    if (snap.empty) {
      await seedDefaultFacilities();
      const freshSnap = await getDocs(collection(db, 'facilities'));
      const list = [];
      freshSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list.filter(f => f.isOperational !== false);
    }
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list.filter(f => f.isOperational !== false);
  } catch (err) {
    console.error('Error fetching facilities:', err);
    return [];
  }
}

/**
 * Time overlap helper (HH:mm string comparison)
 */
function isTimeOverlapping(startA, endA, startB, endB) {
  return (startA < endB) && (endA > startB);
}

/**
 * Date range overlap helper (YYYY-MM-DD string comparison)
 */
function isDateOverlapping(startA, endA, startB, endB) {
  const sA = startA || endA;
  const eA = endA || startA;
  const sB = startB || endB;
  const eB = endB || startB;
  return (sA <= eB) && (eA >= sB);
}

/**
 * Check real-time slot conflicts against existing active/approved bookings across date range & time window
 */
export async function checkSlotConflict(facilityId, startDate, endDate, startTime, endTime, excludeBookingId = null) {
  try {
    const sDate = startDate || endDate;
    const eDate = endDate || startDate;

    const q = query(
      collection(db, 'facility_bookings'),
      where('facilityId', '==', facilityId)
    );
    const snap = await getDocs(q);
    
    for (const docSnap of snap.docs) {
      if (excludeBookingId && docSnap.id === excludeBookingId) continue;
      const b = docSnap.data();

      // Only active statuses cause conflict: APPROVED, SAC_APPROVED_WAITING_FOR_PRINCIPAL, PENDING_SAC_APPROVAL
      if (['APPROVED', 'SAC_APPROVED_WAITING_FOR_PRINCIPAL', 'PENDING_SAC_APPROVAL'].includes(b.status)) {
        const bStart = b.startDate || b.date;
        const bEnd = b.endDate || b.date;

        if (isDateOverlapping(sDate, eDate, bStart, bEnd)) {
          if (isTimeOverlapping(startTime, endTime, b.startTime, b.endTime)) {
            const dateDisplay = (bStart === bEnd) ? bStart : `${bStart} to ${bEnd}`;
            return {
              hasConflict: true,
              conflictingBooking: { id: docSnap.id, dateDisplay, ...b },
            };
          }
        }
      }
    }
    return { hasConflict: false };
  } catch (err) {
    console.error('Slot conflict check error:', err);
    return { hasConflict: false };
  }
}

/**
 * Venue Management CRUD Operations for Super Admin & Department Admins
 */
export async function addFacility(facilityData) {
  const facilityId = facilityData.facilityId || `fac_${Date.now()}`;
  const docRef = doc(db, 'facilities', facilityId);
  const data = {
    facilityId,
    name: facilityData.name,
    locationBlock: facilityData.locationBlock,
    capacity: Number(facilityData.capacity) || 200,
    department: facilityData.department || 'Campus-Wide',
    amenities: facilityData.amenities || ['AC', 'Sound System', 'HD Projector', 'Podium'],
    isOperational: facilityData.isOperational !== false,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, data, { merge: true });
  return { id: facilityId, ...data };
}

export async function updateFacility(facilityId, facilityData) {
  const docRef = doc(db, 'facilities', facilityId);
  const data = {
    ...facilityData,
    capacity: Number(facilityData.capacity) || 200,
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, data);
  return { id: facilityId, ...data };
}

export async function deleteFacility(facilityId) {
  await deleteDoc(doc(db, 'facilities', facilityId));
  return true;
}

/**
 * Step 1: Submit new booking request by Club Lead / Representative (Supports Multi-Day Events)
 */
export async function submitBookingRequest({
  facilityId,
  facilityName,
  bookedByRollNumber,
  bookedByName,
  clubName,
  designation = 'Club Lead',
  eventTitle,
  startDate,
  endDate,
  date,
  startTime,
  endTime,
  expectedAttendance,
  description,
}) {
  const sDate = startDate || date;
  const eDate = endDate || date || sDate;

  // Calculate event duration in days
  const d1 = new Date(sDate);
  const d2 = new Date(eDate);
  const diffTime = Math.max(0, d2 - d1);
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const dateLabel = (sDate === eDate) ? sDate : `${sDate} to ${eDate} (${durationDays} Days)`;

  // Check conflict before submitting
  const conflictInfo = await checkSlotConflict(facilityId, sDate, eDate, startTime, endTime);
  if (conflictInfo.hasConflict) {
    throw new Error(`Slot Conflict: Venue is already reserved for "${conflictInfo.conflictingBooking.eventTitle}" (${conflictInfo.conflictingBooking.dateDisplay}, ${conflictInfo.conflictingBooking.startTime} - ${conflictInfo.conflictingBooking.endTime}).`);
  }

  const bookingData = {
    facilityId,
    facilityName,
    bookedByRollNumber,
    bookedByName,
    clubName,
    designation,
    eventTitle,
    startDate: sDate,
    endDate: eDate,
    date: dateLabel,
    durationDays,
    startTime,
    endTime,
    expectedAttendance: Number(expectedAttendance),
    description,
    status: 'PENDING_SAC_APPROVAL',
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'facility_bookings'), bookingData);

  // Notify SAC Director
  const sendNotification = useNotificationStore.getState().sendNotification;
  await sendNotification({
    title: 'New Venue Allocation Request 🏛️',
    message: `${clubName} (${designation} ${bookedByName}) requested ${facilityName} for "${eventTitle}" on ${dateLabel} (${startTime} - ${endTime}). Pending SAC Approval.`,
    type: 'warning',
    targetRole: 'sac_director',
    targetEmail: 'sacdirector@vbit.ac.in',
  });

  return { id: docRef.id, ...bookingData };
}

/**
 * Step 2: SAC Director Review (Approve & Forward to Principal or Reject)
 */
export async function sacReviewBooking(bookingId, action, remarks, reviewerEmail = 'sacdirector@vbit.ac.in') {
  const bookingRef = doc(db, 'facility_bookings', bookingId);
  const snap = await getDoc(bookingRef);
  
  if (!snap.exists()) throw new Error('Booking request not found.');
  const booking = snap.data();

  // State guard
  if (booking.status !== 'PENDING_SAC_APPROVAL') {
    throw new Error(`Workflow State Violation: Request status is ${booking.status}, expected PENDING_SAC_APPROVAL.`);
  }

  const sendNotification = useNotificationStore.getState().sendNotification;
  const sacReview = {
    reviewedBy: reviewerEmail,
    reviewedAt: new Date().toISOString(),
    remarks: remarks || (action === 'APPROVED' ? 'Approved by SAC Director and forwarded to Principal.' : 'Rejected by SAC Director.'),
    action,
  };

  if (action === 'APPROVED') {
    await updateDoc(bookingRef, {
      status: 'SAC_APPROVED_WAITING_FOR_PRINCIPAL',
      sacReview,
    });

    // Notify Principal
    await sendNotification({
      title: 'Venue Request Awaiting Principal Approval 🏛️',
      message: `SAC Director approved ${booking.clubName}'s request for ${booking.facilityName} ("${booking.eventTitle}" on ${booking.date}). Awaiting final approval.`,
      type: 'warning',
      targetRole: 'principal',
      targetEmail: 'principal@vbit.ac.in',
    });
  } else {
    await updateDoc(bookingRef, {
      status: 'REJECTED_BY_SAC',
      sacReview,
    });

    // Notify Student Club Lead
    await sendNotification({
      title: 'Venue Booking Request Status Update ❌',
      message: `Your request for ${booking.facilityName} ("${booking.eventTitle}" on ${booking.date}) was not approved by SAC Director. Reason: ${remarks || 'No remarks provided.'}`,
      type: 'warning',
      targetRole: 'student',
      targetEmail: `${booking.bookedByRollNumber.toLowerCase()}@vbit.ac.in`,
    });
  }
}

/**
 * Step 3: Principal Review (Grant Final Approval or Reject)
 */
export async function principalReviewBooking(bookingId, action, remarks, reviewerEmail = 'principal@vbit.ac.in') {
  const bookingRef = doc(db, 'facility_bookings', bookingId);
  const snap = await getDoc(bookingRef);
  
  if (!snap.exists()) throw new Error('Booking request not found.');
  const booking = snap.data();

  // Sequential State Guard: Principal can ONLY approve if status is SAC_APPROVED_WAITING_FOR_PRINCIPAL
  if (booking.status !== 'SAC_APPROVED_WAITING_FOR_PRINCIPAL') {
    throw new Error(`Sequential Workflow Violation: Principal cannot review request in state "${booking.status}". Must be SAC_APPROVED_WAITING_FOR_PRINCIPAL.`);
  }

  const sendNotification = useNotificationStore.getState().sendNotification;
  const principalReview = {
    reviewedBy: reviewerEmail,
    reviewedAt: new Date().toISOString(),
    remarks: remarks || (action === 'APPROVED' ? 'Final approval granted by Principal.' : 'Rejected by Principal.'),
    action,
  };

  if (action === 'APPROVED') {
    // Re-verify conflict before final confirmation
    const conflictInfo = await checkSlotConflict(booking.facilityId, booking.date, booking.startTime, booking.endTime, bookingId);
    if (conflictInfo.hasConflict) {
      throw new Error(`Conflict Detected: Venue was reserved by "${conflictInfo.conflictingBooking.eventTitle}" during final processing.`);
    }

    await updateDoc(bookingRef, {
      status: 'APPROVED',
      principalReview,
    });

    // Notify Student Club Lead (Confirmed)
    await sendNotification({
      title: 'Venue Booking Confirmed! 🎉',
      message: `Congratulations! Final Principal approval granted for ${booking.facilityName} ("${booking.eventTitle}" on ${booking.date}, ${booking.startTime} - ${booking.endTime}). Booking Confirmed!`,
      type: 'success',
      targetRole: 'student',
      targetEmail: `${booking.bookedByRollNumber.toLowerCase()}@vbit.ac.in`,
    });

    // Notify SAC Director & Admins
    await sendNotification({
      title: 'Venue Booking Confirmed 🏛️',
      message: `Principal granted final approval for ${booking.clubName} at ${booking.facilityName} ("${booking.eventTitle}" on ${booking.date}).`,
      type: 'info',
      targetRole: 'sac_director',
      targetEmail: 'sacdirector@vbit.ac.in',
    });
  } else {
    await updateDoc(bookingRef, {
      status: 'REJECTED_BY_PRINCIPAL',
      principalReview,
    });

    // Notify Student Club Lead
    await sendNotification({
      title: 'Venue Booking Request Status Update ❌',
      message: `Your venue request for ${booking.facilityName} ("${booking.eventTitle}" on ${booking.date}) was rejected by Principal. Reason: ${remarks || 'No remarks provided.'}`,
      type: 'warning',
      targetRole: 'student',
      targetEmail: `${booking.bookedByRollNumber.toLowerCase()}@vbit.ac.in`,
    });
  }
}
