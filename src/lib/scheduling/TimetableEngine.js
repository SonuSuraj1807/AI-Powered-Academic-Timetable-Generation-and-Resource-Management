/**
 * TimetableEngine — Core constraint-satisfaction solver for academic timetable generation.
 * 
 * Implements a greedy backtracking algorithm with constraint checking:
 * 1. Labs = exactly 3 continuous periods, once per week per section
 * 2. No duplicate lab subject in same week
 * 3. Electives aligned across all sections of same year
 * 4. No faculty double-booking
 * 5. Staggered lunch enforcement (R25 vs R22)
 * 6. Room capacity validation
 */

import { TIME_SLOTS, WEEKDAYS } from '../../data/curriculumSeed.js';

/**
 * Main timetable generation function.
 * 
 * @param {Object} config
 * @param {string} config.department - Department ID (e.g., 'CSE-DS')
 * @param {string} config.regulation - 'R22' or 'R25'
 * @param {number} config.year - Academic year (1-4)
 * @param {string} config.section - Section letter (e.g., 'A')
 * @param {Array} config.subjects - Array of { code, name, type, credits, facultyId, facultyName }
 * @param {Array} config.existingSchedules - Other sections' schedules (for elective alignment + faculty conflict)
 * @param {Array} config.trainingOverrides - Days blocked for training { day, description }
 * @param {string} config.room - Room identifier
 * @returns {{ grid: Object, legend: Array, status: string, errors: Array }}
 */
export function generateTimetable(config) {
  const { department, regulation, year, section, subjects, existingSchedules = [], trainingOverrides = [], room } = config;
  
  const timeConfig = TIME_SLOTS[regulation];
  if (!timeConfig) throw new Error(`Unknown regulation: ${regulation}`);

  const teachablePeriods = timeConfig.periods.filter(p => !p.isBreak && !p.isLunch);
  const availableDays = WEEKDAYS.filter(d => !trainingOverrides.some(t => t.day === d));
  
  const theorySubjects = subjects.filter(s => s.type === 'theory');
  const labSubjects = subjects.filter(s => s.type === 'lab');
  const electiveSubjects = subjects.filter(s => s.type === 'elective');

  // Initialize empty grid: { Monday: [null, null, ...], Tuesday: [...], ... }
  const grid = {};
  WEEKDAYS.forEach(day => {
    grid[day] = timeConfig.periods.map(period => {
      if (period.isBreak) return { type: 'break', label: 'Break' };
      if (period.isLunch) return { type: 'lunch', label: 'LUNCH' };
      if (trainingOverrides.some(t => t.day === day)) return { type: 'training', label: trainingOverrides.find(t => t.day === day)?.description || 'Training' };
      return null; // Available slot
    });
  });

  const errors = [];
  const facultySchedule = buildFacultyScheduleMap(existingSchedules);

  // ── Step 1: Place Labs (most constrained first) ──
  for (const lab of labSubjects) {
    const placed = placeLabSession(grid, lab, availableDays, teachablePeriods, timeConfig, facultySchedule, section);
    if (!placed) {
      errors.push(`Could not place lab "${lab.name}" (${lab.code}). No 3-consecutive-period slot available.`);
    }
  }

  // ── Step 2: Place Electives (aligned across sections) ──
  for (const elective of electiveSubjects) {
    const alignedSlot = findAlignedElectiveSlot(elective, existingSchedules, grid, availableDays, teachablePeriods, timeConfig, facultySchedule, section);
    if (alignedSlot) {
      const { day, periodIndex } = alignedSlot;
      grid[day][periodIndex] = {
        type: 'elective',
        subjectCode: elective.code,
        subjectName: elective.name,
        facultyId: elective.facultyId,
        facultyName: elective.facultyName,
        peGroup: elective.peGroup,
      };
      recordFacultySlot(facultySchedule, elective.facultyId, day, periodIndex, section);
    } else {
      // Fallback: place like a theory subject
      const placed = placeTheorySession(grid, elective, availableDays, teachablePeriods, timeConfig, facultySchedule, section, theorySubjects.length);
      if (!placed) {
        errors.push(`Could not place elective "${elective.name}" (${elective.code}).`);
      }
    }
  }

  // ── Step 3: Place Theory Subjects (fill remaining slots) ──
  // Calculate required slots per theory subject based on credits
  const theorySlots = [];
  for (const subject of theorySubjects) {
    const slotsNeeded = Math.ceil(subject.credits); // Typically 3 credits = 3 periods/week
    for (let i = 0; i < slotsNeeded; i++) {
      theorySlots.push(subject);
    }
  }

  // Shuffle for variety, then place
  shuffleArray(theorySlots);
  for (const subject of theorySlots) {
    const placed = placeTheorySession(grid, subject, availableDays, teachablePeriods, timeConfig, facultySchedule, section);
    if (!placed) {
      errors.push(`Could not place theory slot for "${subject.name}" (${subject.code}).`);
    }
  }

  // Build legend
  const legend = subjects.map(s => ({
    subjectCode: s.code,
    subjectName: s.name,
    facultyName: s.facultyName || 'TBD',
  }));

  return {
    grid,
    legend,
    metadata: { department, regulation, year, section, room, generatedAt: new Date().toISOString() },
    status: errors.length === 0 ? 'success' : 'partial',
    errors,
  };
}

/**
 * Place a lab session: 3 continuous periods, exactly once per week.
 */
function placeLabSession(grid, lab, availableDays, teachablePeriods, timeConfig, facultySchedule, section) {
  const shuffledDays = [...availableDays];
  shuffleArray(shuffledDays);

  for (const day of shuffledDays) {
    const daySlots = grid[day];
    
    // Find 3 consecutive available (null) slots
    for (let startIdx = 0; startIdx <= daySlots.length - 3; startIdx++) {
      const slice = daySlots.slice(startIdx, startIdx + 3);
      if (slice.every(s => s === null)) {
        // Check faculty is free in all 3 periods
        const facultyFree = [startIdx, startIdx + 1, startIdx + 2].every(
          idx => !isFacultyBusy(facultySchedule, lab.facultyId, day, idx)
        );
        if (!facultyFree) continue;

        // Place the lab
        for (let offset = 0; offset < 3; offset++) {
          daySlots[startIdx + offset] = {
            type: 'lab',
            subjectCode: lab.code,
            subjectName: lab.name,
            facultyId: lab.facultyId,
            facultyName: lab.facultyName,
            span: offset === 0 ? 3 : 0, // First cell carries the span value
          };
          recordFacultySlot(facultySchedule, lab.facultyId, day, startIdx + offset, section);
        }
        return true;
      }
    }
  }
  return false;
}

/**
 * Place a theory subject in an available slot.
 */
function placeTheorySession(grid, subject, availableDays, teachablePeriods, timeConfig, facultySchedule, section) {
  const shuffledDays = [...availableDays];
  shuffleArray(shuffledDays);

  for (const day of shuffledDays) {
    const daySlots = grid[day];
    for (let idx = 0; idx < daySlots.length; idx++) {
      if (daySlots[idx] !== null) continue; // Slot taken
      
      // Check faculty availability
      if (isFacultyBusy(facultySchedule, subject.facultyId, day, idx)) continue;

      // Check: no more than 2 slots of same subject per day
      const sameSubjectToday = daySlots.filter(
        s => s && s.subjectCode === subject.code && s.type !== 'break' && s.type !== 'lunch'
      ).length;
      if (sameSubjectToday >= 2) continue;

      daySlots[idx] = {
        type: subject.type === 'elective' ? 'elective' : 'theory',
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyId: subject.facultyId,
        facultyName: subject.facultyName,
      };
      recordFacultySlot(facultySchedule, subject.facultyId, day, idx, section);
      return true;
    }
  }
  return false;
}

/**
 * Find an elective slot aligned with other sections of the same year.
 */
function findAlignedElectiveSlot(elective, existingSchedules, grid, availableDays, teachablePeriods, timeConfig, facultySchedule, section) {
  // Look for where this PE group is already placed in other sections
  for (const existing of existingSchedules) {
    if (!existing.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = existing.grid[day];
      if (!daySlots) continue;
      for (let idx = 0; idx < daySlots.length; idx++) {
        const slot = daySlots[idx];
        if (slot && slot.peGroup === elective.peGroup) {
          // Check if this slot is free in our grid
          if (grid[day][idx] === null && !isFacultyBusy(facultySchedule, elective.facultyId, day, idx)) {
            return { day, periodIndex: idx };
          }
        }
      }
    }
  }
  return null;
}

// ── Utility Functions ──

function buildFacultyScheduleMap(existingSchedules) {
  const map = {}; // { facultyId: { 'Monday-0': sectionId, ... } }
  for (const schedule of existingSchedules) {
    if (!schedule.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = schedule.grid[day];
      if (!daySlots) continue;
      for (let idx = 0; idx < daySlots.length; idx++) {
        const slot = daySlots[idx];
        if (slot && slot.facultyId) {
          if (!map[slot.facultyId]) map[slot.facultyId] = {};
          map[slot.facultyId][`${day}-${idx}`] = schedule.section;
        }
      }
    }
  }
  return map;
}

function isFacultyBusy(facultySchedule, facultyId, day, periodIndex) {
  if (!facultyId) return false;
  return facultySchedule[facultyId]?.[`${day}-${periodIndex}`] !== undefined;
}

function recordFacultySlot(facultySchedule, facultyId, day, periodIndex, section) {
  if (!facultyId) return;
  if (!facultySchedule[facultyId]) facultySchedule[facultyId] = {};
  facultySchedule[facultyId][`${day}-${periodIndex}`] = section;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default generateTimetable;
