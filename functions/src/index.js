/**
 * Firebase Cloud Functions — VBIT Timetable System
 * 
 * Exports:
 * - onSubstitutionCreated: Firestore trigger for substitution notifications
 * - seedCurriculum: HTTP callable function for batch seeding curriculum data
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

/**
 * Trigger: When a new substitution document is created,
 * automatically push a notification to the target faculty.
 */
exports.onSubstitutionCreated = onDocumentCreated(
  "substitutions/{subId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No data in substitution document");
      return;
    }

    const data = snapshot.data();
    const {
      substituteFacultyId,
      originalFacultyName,
      substituteFacultyName,
      subjectCode,
      subjectName,
      day,
      period,
      section,
    } = data;

    if (!substituteFacultyId) {
      logger.error("Missing substituteFacultyId in substitution document");
      return;
    }

    // Create notification for the substitute faculty
    const notification = {
      recipientUID: substituteFacultyId,
      title: "New Substitution Assignment",
      body: `You are substituting for ${originalFacultyName || "a colleague"} to teach ${subjectName || subjectCode} for ${section || "a section"} on ${day || "TBD"}, Period ${period || "TBD"}.`,
      timestamp: FieldValue.serverTimestamp(),
      status: "unread",
      type: "substitution",
      metadata: {
        substitutionId: event.params.subId,
        originalFaculty: originalFacultyName || "Unknown",
        substituteFaculty: substituteFacultyName || "Unknown",
        subjectCode: subjectCode || "",
        timeSlot: `${day || ""} P${period || ""}`,
      },
    };

    try {
      await db.collection("notifications").add(notification);
      logger.info(`Notification sent to ${substituteFacultyId} for substitution ${event.params.subId}`);
    } catch (error) {
      logger.error("Failed to create notification:", error);
    }

    // Also notify the original faculty
    if (data.originalFacultyId) {
      const originalNotif = {
        recipientUID: data.originalFacultyId,
        title: "Substitution Arranged",
        body: `${substituteFacultyName || "A colleague"} will substitute for your ${subjectName || subjectCode} class (${section || ""}) on ${day || "TBD"}.`,
        timestamp: FieldValue.serverTimestamp(),
        status: "unread",
        type: "substitution",
        metadata: {
          substitutionId: event.params.subId,
          originalFaculty: originalFacultyName || "Unknown",
          substituteFaculty: substituteFacultyName || "Unknown",
        },
      };
      
      try {
        await db.collection("notifications").add(originalNotif);
        logger.info(`Notification sent to original faculty ${data.originalFacultyId}`);
      } catch (error) {
        logger.error("Failed to notify original faculty:", error);
      }
    }
  }
);

/**
 * Callable: Seed curriculum registry from the frontend admin panel.
 * Accepts an array of curriculum items and batch-writes them to Firestore.
 */
exports.seedCurriculum = onCall(async (request) => {
  // Verify admin role
  if (!request.auth) {
    throw new Error("Authentication required");
  }

  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new Error("Admin access required");
  }

  const { items } = request.data;
  if (!items || !Array.isArray(items)) {
    throw new Error("Items array required");
  }

  const batch = db.batch();
  let count = 0;

  for (const item of items) {
    if (!item.code) continue;
    const ref = db.collection("curriculum_registry").doc(item.code);
    batch.set(ref, {
      ...item,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    count++;

    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  logger.info(`Seeded ${count} curriculum items`);
  return { success: true, count };
});
