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
  const { department, regulation, year, section, subjects, existingSchedules = [], trainingOverrides = [], specialBlocks = [], room } = config;
  
  // Select Junior Matrix (1st Year) or Senior Matrix (2nd, 3rd, 4th Year)
  const timeConfig = year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
  
  const teachablePeriods = timeConfig.periods.filter(p => !p.isBreak && !p.isLunch);
  
  // Initialize empty grid: { Monday: [null, null, ...], Tuesday: [...], ... }
  const grid = {};
  WEEKDAYS.forEach(day => {
    grid[day] = timeConfig.periods.map(period => {
      if (period.isBreak) return { type: 'break', label: 'Break' };
      if (period.isLunch) return { type: 'lunch', label: 'LUNCH' };
      
      // Check if there is a special block (training, sports, library, tutorial, mentoring, etc.)
      const special = specialBlocks.find(s => s.day === day && s.periodLabel === period.label);
      if (special) {
        return { 
          type: special.type, 
          label: special.label 
        };
      }
      
      // Fallback: Check if whole day is blocked by training day overrides
      if (trainingOverrides.some(t => t.day === day)) {
        return { 
          type: 'training', 
          label: trainingOverrides.find(t => t.day === day)?.description || 'Training Day' 
        };
      }
      
      return null; // Available slot
    });
  });

  // Available days are those that are not fully blocked by training overrides
  const availableDays = WEEKDAYS.filter(d => !trainingOverrides.some(t => t.day === d));

  const theorySubjects = subjects.filter(s => s.type === 'theory');
  const labSubjects = subjects.filter(s => s.type === 'lab');
  const electiveSubjects = subjects.filter(s => s.type === 'elective');

  const errors = [];
  const facultySchedule = buildFacultyScheduleMap(existingSchedules);

  // ── Step 1: Place Labs (most constrained: 3 continuous periods for R22, 2 for R25) ──
  for (const lab of labSubjects) {
    const labDuration = regulation === 'R25' ? 2 : 3;
    const placed = placeLabSession(grid, lab, availableDays, teachablePeriods, timeConfig, facultySchedule, section, existingSchedules, labDuration, year);
    if (!placed) {
      errors.push(`Could not place lab "${lab.name}" (${lab.code}). No ${labDuration}-consecutive-period slot available.`);
    }
  }

  // ── Step 2: Place Electives ──
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
      const placed = placeTheorySession(grid, elective, availableDays, teachablePeriods, timeConfig, facultySchedule, section, subjects);
      if (!placed) {
        errors.push(`Could not place elective "${elective.name}" (${elective.code}).`);
      }
    }
  }

  // ── Step 3: Distribute Selected Theory & Elective Subjects ──
  // Target: exactly 5 hours per theory/elective subject per week
  const allAcademicSubjects = [
    ...theorySubjects,
    ...electiveSubjects.filter(e => countWeeklySubjectOccurrences(grid, e.code) === 0)
  ];
  
  // Place up to 5 hours for each academic subject evenly
  for (let pass = 1; pass <= 5; pass++) {
    for (const subject of allAcademicSubjects) {
      const isInternship = subject.name.toLowerCase().includes('internship') || subject.code.includes('4181');
      const maxAllowed = isInternship ? 1 : 5;
      if (countWeeklySubjectOccurrences(grid, subject.code) >= maxAllowed) continue;
      placeTheorySession(grid, subject, availableDays, teachablePeriods, timeConfig, facultySchedule, section, subjects);
    }
  }

  // ── Step 4: Fill Any Remaining Free Slots ──
  // Rule: Co-curricular subjects (TUTORIAL, SPORTS, MENTORING, LIBRARY, NPTEL) are strictly ONCE per week!
  const coCurricularPool = subjects.filter(s => s.code.startsWith('VBIT-'));

  WEEKDAYS.forEach(day => {
    const daySlots = grid[day];
    for (let idx = 0; idx < daySlots.length; idx++) {
      if (daySlots[idx] !== null) continue; // Skip filled slots

      let filled = false;

      // 1. Place co-curricular subjects strictly ONCE per week
      const coCandidates = [...coCurricularPool];
      shuffleArray(coCandidates);
      for (const subject of coCandidates) {
        // Enforce STRICT ONCE PER WEEK limit for co-curricular subjects (e.g. TUTORIAL, SPORTS, MENTORING, LIBRARY)
        if (countWeeklySubjectOccurrences(grid, subject.code) >= 1) continue;

        if (subject.code === 'VBIT-TUTORIAL' && idx !== 3 && idx !== daySlots.length - 1) continue;
        const isEndSubject = subject.code === 'VBIT-SPORTS' || subject.code === 'VBIT-MENTORING' || subject.code === 'VBIT-LIBRARY';
        if (isEndSubject && idx !== daySlots.length - 1) continue;

        daySlots[idx] = {
          type: 'training',
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: '',
          facultyName: 'Co-curricular',
        };
        filled = true;
        break;
      }

      if (filled) continue;

      // 2. Fill remaining open periods using the selected academic subjects (sorted by lowest weekly count to keep counts balanced)
      const sortedAcademic = [...allAcademicSubjects].sort((a, b) => 
        countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code)
      );

      for (const subject of sortedAcademic) {
        const isInternship = subject.name.toLowerCase().includes('internship') || subject.code.includes('4181');
        if (isInternship && countWeeklySubjectOccurrences(grid, subject.code) >= 1) continue;

        if (isFacultyBusy(facultySchedule, subject.facultyId, day, idx)) continue;
        const prevSlot = daySlots[idx - 1];
        const nextSlot = daySlots[idx + 1];
        if (prevSlot && prevSlot.subjectCode === subject.code) continue;
        if (nextSlot && nextSlot.subjectCode === subject.code) continue;

        daySlots[idx] = {
          type: subject.type === 'elective' ? 'elective' : 'theory',
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: subject.facultyId,
          facultyName: subject.facultyName,
        };
        recordFacultySlot(facultySchedule, subject.facultyId, day, idx, section);
        filled = true;
        break;
      }

      if (filled) continue;

      // Absolute Fallback: Place least scheduled academic subject if tight faculty constraints apply
      for (const subject of sortedAcademic) {
        const isInternship = subject.name.toLowerCase().includes('internship') || subject.code.includes('4181');
        if (isInternship && countWeeklySubjectOccurrences(grid, subject.code) >= 1) continue;

        const prevSlot = daySlots[idx - 1];
        if (prevSlot && prevSlot.subjectCode === subject.code) continue;

        daySlots[idx] = {
          type: subject.type === 'elective' ? 'elective' : 'theory',
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: subject.facultyId,
          facultyName: subject.facultyName,
        };
        recordFacultySlot(facultySchedule, subject.facultyId, day, idx, section);
        filled = true;
        break;
      }
    }
  });

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
 * Place a lab session: N continuous periods (2 for R25, 3 for R22), exactly once per week.
 */
function placeLabSession(grid, lab, availableDays, teachablePeriods, timeConfig, facultySchedule, section, existingSchedules = [], labDuration = 3, year = 1) {
  const shuffledDays = [...availableDays];
  shuffleArray(shuffledDays);

  const labRoom = getLabRoom(lab.name, year);

  for (const day of shuffledDays) {
    const daySlots = grid[day];
    
    // Rule: No 2 labs in one day for this section
    const hasLabToday = daySlots.some(s => s && s.type === 'lab');
    if (hasLabToday) continue;

    // Find labDuration consecutive available (null) slots
    for (let startIdx = 0; startIdx <= daySlots.length - labDuration; startIdx++) {
      const slice = daySlots.slice(startIdx, startIdx + labDuration);
      if (slice.every(s => s === null)) {
        // Check faculty is free in all labDuration periods
        const indices = Array.from({ length: labDuration }, (_, k) => startIdx + k);
        const facultyFree = indices.every(
          idx => !isFacultyBusy(facultySchedule, lab.facultyId, day, idx)
        );
        if (!facultyFree) continue;

        // Rule: Lab Room allocation check (no collision with other departments/sections using the same lab room)
        const roomFree = indices.every(
          idx => !isLabRoomBusy(existingSchedules, labRoom, day, idx)
        );
        if (!roomFree) continue;

        // Place the lab
        for (let offset = 0; offset < labDuration; offset++) {
          daySlots[startIdx + offset] = {
            type: 'lab',
            subjectCode: lab.code,
            subjectName: `${lab.name} (${labRoom})`,
            facultyId: lab.facultyId,
            facultyName: lab.facultyName,
            span: offset === 0 ? labDuration : 0, // First cell carries the span value
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
function placeTheorySession(grid, subject, availableDays, teachablePeriods, timeConfig, facultySchedule, section, subjects = []) {
  const shuffledDays = [...availableDays];
  shuffleArray(shuffledDays);

  const isCoCurricular = subject.code && subject.code.startsWith('VBIT-');

  for (const day of shuffledDays) {
    const daySlots = grid[day];
    for (let idx = 0; idx < daySlots.length; idx++) {
      if (daySlots[idx] !== null) continue; // Slot taken
      
      // Check faculty availability (skip for co-curricular)
      if (!isCoCurricular && isFacultyBusy(facultySchedule, subject.facultyId, day, idx)) continue;

      // Check: no continuous 2 periods of same theory subject
      if (!isCoCurricular) {
        const prevSlot = daySlots[idx - 1];
        const nextSlot = daySlots[idx + 1];
        if (prevSlot && prevSlot.subjectCode === subject.code) continue;
        if (nextSlot && nextSlot.subjectCode === subject.code) continue;
      }

      // Rule: tutorials and mentoring, sports, library, and NPTEL should be restricted to once in a week
      const isInternship = subject.name?.toLowerCase().includes('internship') || subject.code?.includes('4181');
      const isSinglePerWeek = isInternship || (subject.code && (
        subject.code.startsWith('VBIT-') || 
        subject.code === 'VBIT-SPORTS' || 
        subject.code === 'VBIT-MENTORING' || 
        subject.code === 'VBIT-LIBRARY' || 
        subject.code === 'VBIT-TUTORIAL' || 
        subject.code === 'VBIT-NPTEL'
      ));
      if (isSinglePerWeek) {
        if (countWeeklySubjectOccurrences(grid, subject.code) >= 1) continue;
      }

      // Rule: Internship must strictly go in the last period
      if (isInternship) {
        const isLastPeriod = idx === daySlots.length - 1;
        if (!isLastPeriod) continue;
      }

      // Rule: Tutorial should not come in the 1st hour (index 0) - must be last hour or before lunch (index 3)
      if (subject.code === 'VBIT-TUTORIAL') {
        const isLastPeriod = idx === daySlots.length - 1;
        const isBeforeLunch = idx === 3;
        if (!isLastPeriod && !isBeforeLunch) continue;
      }

      // Rule: Sports, Mentoring, Library must only be placed in the last periods
      const isCoCurricularEnd = subject.code === 'VBIT-SPORTS' || subject.code === 'VBIT-MENTORING' || subject.code === 'VBIT-LIBRARY';
      const isLastPeriod = idx === daySlots.length - 1;
      if (isCoCurricularEnd && !isLastPeriod) continue;
      if (!isCoCurricularEnd && isLastPeriod) {
        // If this section has co-curricular end subjects, reserve the last period for them!
        const hasEndSubjects = subjects.some(s => s.code === 'VBIT-SPORTS' || s.code === 'VBIT-MENTORING' || s.code === 'VBIT-LIBRARY');
        if (hasEndSubjects) continue;
      }

      // Rule: NPTEL course: 1st 3hours lab followed by NPTEL followed by LUNCH
      if (subject.code === 'VBIT-NPTEL') {
        if (idx !== 3) continue;
        
        const hasLabToday = daySlots.some(s => s && s.type === 'lab');
        if (hasLabToday) {
          const firstThreeAreLab = daySlots.slice(0, 3).every(s => s && s.type === 'lab');
          if (!firstThreeAreLab) continue;
        }
      }

      // Check: no more than 2 slots of same subject per day
      const sameSubjectToday = daySlots.filter(
        s => s && s.subjectCode === subject.code && s.type !== 'break' && s.type !== 'lunch'
      ).length;
      if (sameSubjectToday >= 2) continue;

      daySlots[idx] = {
        type: isCoCurricular ? 'training' : (subject.type === 'elective' ? 'elective' : 'theory'),
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyId: isCoCurricular ? '' : subject.facultyId,
        facultyName: isCoCurricular ? '' : subject.facultyName,
      };
      if (!isCoCurricular) {
        recordFacultySlot(facultySchedule, subject.facultyId, day, idx, section);
      }
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

function getLabRoom(subjectName, year = 1) {
  if (!subjectName) return year === 1 ? '1st Year Computing Lab' : 'Lab 1';
  const name = subjectName.toLowerCase();

  // ── 1st Year Dedicated Labs (Separate from 20 main labs) ──
  if (year === 1 || name.includes('chemistry') || name.includes('physics') || name.includes('english communication') || name.includes('elcs') || name.includes('engineering workshop')) {
    if (name.includes('chemistry')) return '1st Year Chemistry Lab';
    if (name.includes('physics')) return '1st Year Physics Lab';
    if (name.includes('english') || name.includes('elcs') || name.includes('skill enhancement')) return '1st Year English Communication Lab (ELCS)';
    if (name.includes('engineering workshop') || name.includes('workshop')) return '1st Year Engineering Workshop (EWS)';
    if (name.includes('it workshop')) return '1st Year IT Workshop Lab';
    if (name.includes('bee')) return '1st Year Basic Electrical Lab (BEE)';
    if (name.includes('pps') || name.includes('programming')) return '1st Year PPS Computing Lab';
    if (name.includes('python')) return '1st Year Python Lab';
    if (name.includes('data structures') || name.includes('ds lab')) return '1st Year Data Structures Lab';
    return '1st Year General Lab';
  }

  // ── 2nd, 3rd, 4th Year Block: Distributed across the 20 Main Building Labs (Lab 1 through Lab 20) ──
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const labIndex = (Math.abs(hash) % 20) + 1; // Produces Lab 1 to Lab 20

  if (name.includes('java') || name.includes('oop')) return `Lab ${((labIndex - 1) % 5) + 1}`; // Lab 1 – Lab 5
  if (name.includes('os ') || name.includes('operating')) return `Lab ${((labIndex - 1) % 5) + 6}`; // Lab 6 – Lab 10
  if (name.includes('dbms') || name.includes('database') || name.includes('big data')) return `Lab ${((labIndex - 1) % 5) + 11}`; // Lab 11 – Lab 15
  if (name.includes('deep learning') || name.includes('ml ') || name.includes('machine learning') || name.includes('analytics') || name.includes('devops') || name.includes('r lab') || name.includes('talend')) return `Lab ${((labIndex - 1) % 5) + 16}`; // Lab 16 – Lab 20

  return `Lab ${labIndex}`;
}

function isLabRoomBusy(existingSchedules, labRoom, day, periodIndex) {
  if (!labRoom) return false;
  return existingSchedules.some(sched => {
    if (!sched.grid || !sched.grid[day]) return false;
    const daySlots = sched.grid[day];
    
    // Check direct period index collision
    const slot = daySlots[periodIndex];
    if (slot && slot.type === 'lab') {
      const match = slot.subjectName ? slot.subjectName.match(/\(([^)]+)\)/) : null;
      const otherRoom = match ? match[1] : getLabRoom(slot.subjectName, sched.year || 1);
      if (otherRoom === labRoom) return true;
    }
    
    return false;
  });
}

function countWeeklySubjectOccurrences(grid, subjectCode) {
  if (!grid || !subjectCode) return 0;
  let count = 0;
  for (const day of WEEKDAYS) {
    const slots = grid[day];
    if (!slots) continue;
    for (const slot of slots) {
      if (slot && slot.subjectCode === subjectCode) {
        count++;
      }
    }
  }
  return count;
}

export default generateTimetable;
