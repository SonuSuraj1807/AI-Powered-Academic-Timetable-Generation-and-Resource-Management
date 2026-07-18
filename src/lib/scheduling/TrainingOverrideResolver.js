/**
 * TrainingOverrideResolver — Handles training day overrides and displaced class redistribution.
 * 
 * When an HOD applies a multi-day training override (e.g., placement bootcamp),
 * this engine removes affected days and redistributes displaced classes to remaining open slots.
 */

import { WEEKDAYS } from '../../data/curriculumSeed.js';

/**
 * Apply training overrides to an existing timetable and redistribute displaced classes.
 * 
 * @param {Object} params
 * @param {Object} params.schedule - The existing schedule { grid, legend, metadata }
 * @param {Array} params.overrides - Array of { day, description, startDate, endDate }
 * @param {Object} params.timeConfig - Time slot config for the regulation
 * @returns {{ previewGrid: Object, displacedClasses: Array, redistributed: Array, unresolved: Array }}
 */
export function resolveTrainingOverride({ schedule, overrides, timeConfig }) {
  const previewGrid = JSON.parse(JSON.stringify(schedule.grid));
  const displacedClasses = [];
  const redistributed = [];
  const unresolved = [];

  const overrideDays = overrides.map(o => o.day);
  const remainingDays = WEEKDAYS.filter(d => !overrideDays.includes(d));

  // ── Step 1: Collect displaced classes from overridden days ──
  for (const override of overrides) {
    const daySlots = previewGrid[override.day];
    if (!daySlots) continue;

    for (let idx = 0; idx < daySlots.length; idx++) {
      const slot = daySlots[idx];
      if (slot && slot.type !== 'break' && slot.type !== 'lunch' && slot.type !== 'training') {
        displacedClasses.push({
          ...slot,
          originalDay: override.day,
          originalPeriodIndex: idx,
        });
      }
      // Mark the day as training
      daySlots[idx] = {
        type: 'training',
        label: override.description || 'Training',
      };
    }
  }

  // ── Step 2: Redistribute displaced classes to remaining days ──
  for (const displaced of displacedClasses) {
    let placed = false;

    // Labs need 3 consecutive slots
    if (displaced.type === 'lab') {
      for (const day of remainingDays) {
        const daySlots = previewGrid[day];
        
        // Check for existing instance of this lab (can't have duplicates in same week)
        const existingLab = daySlots.some(s => s?.subjectCode === displaced.subjectCode && s?.type === 'lab');
        if (existingLab) continue;

        // Find 3 consecutive free slots
        for (let startIdx = 0; startIdx <= daySlots.length - 3; startIdx++) {
          const slice = daySlots.slice(startIdx, startIdx + 3);
          if (slice.every(s => s === null)) {
            for (let offset = 0; offset < 3; offset++) {
              daySlots[startIdx + offset] = {
                ...displaced,
                span: offset === 0 ? 3 : 0,
                isRedistributed: true,
              };
            }
            redistributed.push({ ...displaced, newDay: day, newPeriodIndex: startIdx });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    } else {
      // Theory/Elective — find any single free slot
      for (const day of remainingDays) {
        const daySlots = previewGrid[day];
        
        // Avoid placing more than 2 of the same subject per day
        const sameSubjectCount = daySlots.filter(
          s => s?.subjectCode === displaced.subjectCode
        ).length;
        if (sameSubjectCount >= 2) continue;

        for (let idx = 0; idx < daySlots.length; idx++) {
          if (daySlots[idx] === null) {
            daySlots[idx] = { ...displaced, isRedistributed: true };
            redistributed.push({ ...displaced, newDay: day, newPeriodIndex: idx });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    if (!placed) {
      unresolved.push(displaced);
    }
  }

  return {
    previewGrid,
    displacedClasses,
    redistributed,
    unresolved,
    summary: {
      totalDisplaced: displacedClasses.length,
      totalRedistributed: redistributed.length,
      totalUnresolved: unresolved.length,
      overrideDays,
      remainingDays,
    },
  };
}

export default { resolveTrainingOverride };
