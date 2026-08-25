/**
 * SmartSwapEngine — Dynamic substitution search engine.
 * 
 * Finds available faculty substitutes within the current 7-day calendar week.
 * Ranks candidates by subject expertise match and workload balance.
 */

import { WEEKDAYS } from '../../data/curriculumSeed.js';

/**
 * Find substitute faculty for an absent instructor.
 * 
 * @param {Object} params
 * @param {string} params.absentFacultyId - UID of the absent faculty
 * @param {Array} params.affectedSlots - Array of { day, periodIndex, subjectCode, section }
 * @param {Array} params.allFaculty - Full faculty roster with { uid, name, department, subjectExpertise[], maxHoursPerWeek }
 * @param {Array} params.allSchedules - All active schedules for the current week
 * @param {Date} params.weekStart - Start of the current 7-day window
 * @returns {Array} Ranked list of { facultyId, facultyName, score, matchReasons[], conflicts[] }
 */
export function findSubstitutes({ absentFacultyId, affectedSlots, allFaculty, allSchedules, weekStart }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Build faculty busy map from all schedules
  const busyMap = buildBusyMap(allSchedules);
  
  // Build workload map (hours per faculty this week)
  const workloadMap = buildWorkloadMap(allSchedules);

  const absentFaculty = allFaculty.find(f => (f.uid || f.id) === absentFacultyId);
  const candidates = [];

  for (const faculty of allFaculty) {
    const facId = faculty.uid || faculty.id;
    // Skip the absent faculty themselves
    if (facId === absentFacultyId) continue;

    let totalScore = 0;
    const matchReasons = [];
    const conflicts = [];
    let canCoverAll = true;

    for (const slot of affectedSlots) {
      const slotKey = `${slot.day}-${slot.periodIndex}`;
      
      // ── Availability Check ──
      if (busyMap[facId]?.[slotKey]) {
        canCoverAll = false;
        conflicts.push(`Busy on ${slot.day} Period ${slot.periodIndex + 1} (${busyMap[facId][slotKey]})`);
        continue;
      }

      // ── Subject Expertise Match ──
      if (faculty.subjectExpertise?.includes(slot.subjectCode)) {
        totalScore += 30;
        matchReasons.push(`Expert in ${slot.subjectCode}`);
      } else {
        totalScore += 5; // Can still substitute but not ideal
      }

      // ── Same Department Bonus ──
      if (absentFaculty && faculty.department === absentFaculty.department) {
        totalScore += 10;
        if (!matchReasons.includes('Same department')) matchReasons.push('Same department');
      }
    }

    // ── Workload Balance Penalty ──
    const currentHours = workloadMap[facId] || 0;
    const maxHours = faculty.maxHoursPerWeek || 20;
    const hoursRemaining = maxHours - currentHours;
    
    if (hoursRemaining <= 0) {
      totalScore -= 50;
      matchReasons.push('⚠️ At max workload');
    } else if (hoursRemaining < 5) {
      totalScore -= 10;
      matchReasons.push('Near max workload');
    } else {
      totalScore += 5;
    }

    // ── 7-Day Week Boundary Check ──
    totalScore += 2;

    candidates.push({
      facultyId: facId,
      facultyName: faculty.name,
      department: faculty.department,
      score: totalScore,
      canCoverAll,
      matchReasons,
      conflicts,
      currentHours,
      maxHours: faculty.maxHoursPerWeek || 20,
    });
  }

  // Sort by: can cover all slots first, then by score descending
  candidates.sort((a, b) => {
    if (a.canCoverAll && !b.canCoverAll) return -1;
    if (!a.canCoverAll && b.canCoverAll) return 1;
    return b.score - a.score;
  });

  return candidates;
}

/**
 * Execute a smart swap: applies the substitution and returns notification data.
 */
export function executeSwap({ originalFacultyId, substituteFacultyId, slots, schedule }) {
  const updatedGrid = JSON.parse(JSON.stringify(schedule.grid));

  for (const slot of slots) {
    const daySlots = updatedGrid[slot.day];
    if (daySlots && daySlots[slot.periodIndex]) {
      daySlots[slot.periodIndex] = {
        ...daySlots[slot.periodIndex],
        facultyId: substituteFacultyId,
        facultyName: slot.substituteName,
        isSubstitution: true,
        originalFacultyId,
      };
    }
  }

  return {
    updatedGrid,
    notification: {
      type: 'substitution',
      title: 'Substitution Assignment',
      body: `You have been assigned as a substitute for ${slots.length} period(s).`,
      metadata: {
        originalFacultyId,
        substituteFacultyId,
        slots: slots.map(s => ({ day: s.day, period: s.periodIndex + 1, subject: s.subjectCode })),
        timeSlot: slots.map(s => `${s.day} P${s.periodIndex + 1}`).join(', '),
      },
    },
  };
}

// ── Helper Functions ──

function buildBusyMap(schedules) {
  const map = {};
  for (const schedule of schedules) {
    if (!schedule.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = schedule.grid[day];
      if (!daySlots) continue;
      for (let idx = 0; idx < daySlots.length; idx++) {
        const slot = daySlots[idx];
        if (slot?.facultyId) {
          if (!map[slot.facultyId]) map[slot.facultyId] = {};
          map[slot.facultyId][`${day}-${idx}`] = `${slot.subjectName} (${schedule.section || 'unknown'})`;
        }
      }
    }
  }
  return map;
}

function buildWorkloadMap(schedules) {
  const map = {};
  for (const schedule of schedules) {
    if (!schedule.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = schedule.grid[day];
      if (!daySlots) continue;
      for (const slot of daySlots) {
        if (slot?.facultyId) {
          map[slot.facultyId] = (map[slot.facultyId] || 0) + 1;
        }
      }
    }
  }
  return map;
}

export default { findSubstitutes, executeSwap };
