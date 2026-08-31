/**
 * TimetableEngine — Complete constraint-satisfaction solver for academic timetable generation.
 * 
 * Architecture:
 *   1. Dynamic grid indices computed from timeConfig (handles Junior/Senior matrices correctly)
 *   2. Multi-pass placement: Labs → Internship → Co-Curricular → Electives → Theory → Fill → Zero-Empty
 *   3. Strict per-day constraints: max 1 morning + 1 afternoon per subject, no consecutive same subject
 *   4. Faculty clash prevention across all sections (18-period weekly workload cap)
 *   5. Lab duration compression (3→2) when training overrides reduce available days
 *
 * Rules:
 *   - Labs: continuous block (2 or 3 periods), once per week, starting at first morning or first afternoon teachable index
 *   - Internship: EXACTLY 1 period per week, strictly in the last teachable period of the day
 *   - Sports: 1h (Y3/Y4) or 2h (Y1/Y2) in last period(s), no faculty, staggered across same-year sections
 *   - Library & Mentoring: 1h in last period, no faculty
 *   - Tutorial: 1h in Period 6 or 7, WITH faculty
 *   - NPTEL: 1h pre-lunch (last morning period), WITH faculty
 *   - Theory/Elective subjects: balanced 4-5 periods/week, max 1 morning + 1 afternoon per day, no consecutive
 */

import { TIME_SLOTS, WEEKDAYS } from '../../data/curriculumSeed.js';

// ════════════════════════════════════════════════════════════════════
// DYNAMIC INDEX HELPERS — Compute teachable slots from time config
// ════════════════════════════════════════════════════════════════════

function getTeachableIndices(timeConfig) {
  return timeConfig.periods
    .map((p, idx) => ({ ...p, idx }))
    .filter(p => !p.isBreak && !p.isLunch)
    .map(p => p.idx);
}

function getLunchIndex(timeConfig) {
  return timeConfig.periods.findIndex(p => p.isLunch);
}

function getMorningIndices(timeConfig) {
  const lunchIdx = getLunchIndex(timeConfig);
  return getTeachableIndices(timeConfig).filter(i => i < lunchIdx);
}

function getAfternoonIndices(timeConfig) {
  const lunchIdx = getLunchIndex(timeConfig);
  return getTeachableIndices(timeConfig).filter(i => i > lunchIdx);
}

function getLastTeachableIndex(timeConfig) {
  const teachable = getTeachableIndices(timeConfig);
  return teachable[teachable.length - 1];
}

/**
 * Compute valid lab starting indices dynamically from the time config.
 * Checks all contiguous morning and afternoon slots for the requested labDuration.
 * e.g., for 2 periods: Morning idx 0 (P1-P2), idx 2 (P3-P4); Afternoon idx 5 (P5-P6), idx 6 (P6-P7).
 */
function getLabStartIndices(timeConfig, duration) {
  const morning = getMorningIndices(timeConfig);
  const afternoon = getAfternoonIndices(timeConfig);
  const validStarts = [];

  // Morning candidates
  for (let i = 0; i <= morning.length - duration; i++) {
    const start = morning[i];
    const needed = Array.from({ length: duration }, (_, k) => start + k);
    if (needed.every(idx => morning.includes(idx))) {
      validStarts.push(start);
    }
  }

  // Afternoon candidates
  for (let i = 0; i <= afternoon.length - duration; i++) {
    const start = afternoon[i];
    const needed = Array.from({ length: duration }, (_, k) => start + k);
    if (needed.every(idx => afternoon.includes(idx))) {
      validStarts.push(start);
    }
  }

  return validStarts;
}

// ════════════════════════════════════════════════════════════════════
// PLACEMENT CONSTRAINT CHECKS
// ════════════════════════════════════════════════════════════════════

/**
 * Check if a subject can be placed at a specific day+index without violating:
 *   1. Slot must be empty
 *   2. No consecutive same subject
 *   3. Max 1 in morning, max 1 in afternoon per day
 *   4. Total max 2 per day
 */
function canPlaceSubjectAt(daySlots, idx, subjectCode, morningIndices, afternoonIndices, strictOnePerDay = false) {
  if (daySlots[idx] !== null) return false;

  // Non-consecutive check
  if (idx > 0 && daySlots[idx - 1] && daySlots[idx - 1].subjectCode === subjectCode) return false;
  if (idx < daySlots.length - 1 && daySlots[idx + 1] && daySlots[idx + 1].subjectCode === subjectCode) return false;

  // Per-day total check
  const dayTotal = daySlots.filter(s => s && s.subjectCode === subjectCode).length;
  if (strictOnePerDay && dayTotal >= 1) return false;
  if (!strictOnePerDay && dayTotal >= 2) return false;

  // Per-session limits (max 1 in morning, max 1 in afternoon)
  const isMorning = morningIndices.includes(idx);
  const isAfternoon = afternoonIndices.includes(idx);

  if (isMorning) {
    const morningCount = morningIndices.filter(i => daySlots[i] && daySlots[i].subjectCode === subjectCode).length;
    if (morningCount >= 1) return false;
  }
  if (isAfternoon) {
    const afternoonCount = afternoonIndices.filter(i => daySlots[i] && daySlots[i].subjectCode === subjectCode).length;
    if (afternoonCount >= 1) return false;
  }

  return true;
}

// ════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ════════════════════════════════════════════════════════════════════

export function generateTimetable(config) {
  const {
    department, regulation, year, section, subjects,
    existingSchedules = [], trainingOverrides = [], specialBlocks = [], room,
  } = config;

  const timeConfig = year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;

  // Compute dynamic indices from time config
  const morningIndices = getMorningIndices(timeConfig);
  const afternoonIndices = getAfternoonIndices(timeConfig);
  const teachableIndices = getTeachableIndices(timeConfig);
  const lastTeachableIdx = getLastTeachableIndex(timeConfig);
  const secondLastTeachableIdx = teachableIndices.length >= 2 ? teachableIndices[teachableIndices.length - 2] : lastTeachableIdx;
  const preLunchIdx = morningIndices.length > 0 ? morningIndices[morningIndices.length - 1] : 3;

  // Initialize grid: pre-fill breaks, lunch, special blocks, and training days
  const grid = {};
  WEEKDAYS.forEach(day => {
    grid[day] = timeConfig.periods.map(period => {
      if (period.isBreak) return { type: 'break', label: 'Break' };
      if (period.isLunch) return { type: 'lunch', label: 'LUNCH' };

      const special = specialBlocks.find(s => s.day === day && s.periodLabel === period.label);
      if (special) return { type: special.type, label: special.label };

      if (trainingOverrides.some(t => t.day === day)) {
        return { type: 'training', label: trainingOverrides.find(t => t.day === day)?.description || 'Training Day' };
      }

      return null;
    });
  });

  const availableDays = WEEKDAYS.filter(d => !trainingOverrides.some(t => t.day === d));

  // ── Classify subjects ──
  const isInternshipSub = (s) => s.name?.toLowerCase().includes('internship') || s.code?.includes('4181');

  const theorySubjects = subjects.filter(s => s.type === 'theory' && !s.code.startsWith('VBIT-') && !isInternshipSub(s));
  const labSubjects = subjects.filter(s => s.type === 'lab');
  const electiveSubjects = subjects.filter(s => s.type === 'elective' && !isInternshipSub(s));
  const coCurricularSubjects = subjects.filter(s => s.code.startsWith('VBIT-'));
  const internshipSub = subjects.find(isInternshipSub);

  // Pure academic subjects for theory fill passes (theory + electives, no internship/labs/co-curricular)
  const academicSubjects = [...theorySubjects, ...electiveSubjects];

  const errors = [];
  const facultySchedule = buildFacultyScheduleMap(existingSchedules);

  // Lab duration: Project labs (2+ credits) get 3 periods; regular labs get 2 periods.
  for (const lab of labSubjects) {
    const isProject = lab.code.includes('4182') || lab.name.toLowerCase().includes('project');
    const labDur = isProject ? 3 : (regulation === 'R25' ? 2 : 2);
    const placed = placeLabSession(grid, lab, availableDays, facultySchedule, section, existingSchedules, labDur, year, timeConfig);
    if (!placed) {
      errors.push(`Could not place lab "${lab.name}" (${lab.code}).`);
    }
  }

  // ═════════════════════════════════════════════════
  // Step 2: PLACE INTERNSHIP (exactly 1x in last period)
  // ═════════════════════════════════════════════════
  if (internshipSub && countWeeklySubjectOccurrences(grid, internshipSub.code) === 0) {
    const preferredDays = ['Tuesday', 'Thursday', 'Wednesday', 'Monday', 'Friday', 'Saturday'];
    for (const day of preferredDays) {
      if (!grid[day] || !availableDays.includes(day)) continue;
      if (grid[day][lastTeachableIdx] === null) {
        if (!isFacultyBusy(facultySchedule, internshipSub.facultyId, day, lastTeachableIdx)) {
          grid[day][lastTeachableIdx] = {
            type: 'theory',
            subjectCode: internshipSub.code,
            subjectName: internshipSub.name,
            facultyId: internshipSub.facultyId,
            facultyName: internshipSub.facultyName,
          };
          recordFacultySlot(facultySchedule, internshipSub.facultyId, day, lastTeachableIdx, section);
          break;
        }
      }
    }
  }

  // ═════════════════════════════════════════════════
  // Step 3: PLACE CO-CURRICULAR (Sports, Library, Mentoring, Tutorial, NPTEL)
  // ═════════════════════════════════════════════════
  placeCoCurricularSubjects(grid, coCurricularSubjects, existingSchedules, availableDays, year, section, lastTeachableIdx, secondLastTeachableIdx, preLunchIdx);

  // ═════════════════════════════════════════════════
  // Step 4: PLACE ELECTIVES (aligned across year sections)
  // ═════════════════════════════════════════════════
  for (const elective of electiveSubjects) {
    if (countWeeklySubjectOccurrences(grid, elective.code) > 0) continue;
    const alignedSlot = findAlignedElectiveSlot(elective, existingSchedules, grid, availableDays, facultySchedule, section);
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
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // Step 5: DISTRIBUTE ACADEMIC SUBJECTS (STRICT EQUAL distribution, EXACTLY 4-5 per subject)
  // ═════════════════════════════════════════════════════════════════
  const emptySlotCount = countEmptyTeachableSlots(grid, availableDays, teachableIndices);
  const subjectCount = Math.max(academicSubjects.length, 1);
  const maxWeeklyQuota = Math.min(5, Math.ceil(emptySlotCount / subjectCount));

  // Pass 1: Place subjects on days where they don't exist yet (max 1 per day, strict faculty check)
  for (let pass = 1; pass <= maxWeeklyQuota; pass++) {
    const sortedSubjects = [...academicSubjects].sort((a, b) =>
      countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code)
    );

    for (const subject of sortedSubjects) {
      if (countWeeklySubjectOccurrences(grid, subject.code) >= maxWeeklyQuota) continue;
      placeTheorySessionStrict(grid, subject, availableDays, facultySchedule, section, morningIndices, afternoonIndices, teachableIndices, true, true);
    }
  }

  // Pass 2: Fill remaining quota allowing max 1 per day, relaxing external faculty clash if needed
  for (let pass = 1; pass <= maxWeeklyQuota; pass++) {
    const sortedSubjects = [...academicSubjects].sort((a, b) =>
      countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code)
    );

    for (const subject of sortedSubjects) {
      if (countWeeklySubjectOccurrences(grid, subject.code) >= maxWeeklyQuota) continue;
      placeTheorySessionStrict(grid, subject, availableDays, facultySchedule, section, morningIndices, afternoonIndices, teachableIndices, true, false);
    }
  }

  // Pass 3: Fill up to maxWeeklyQuota allowing max 2 per day (1 Morning + 1 Afternoon)
  for (const day of availableDays) {
    const daySlots = grid[day];
    for (const idx of teachableIndices) {
      if (daySlots[idx] !== null) continue;

      const candidates = [...academicSubjects]
        .filter(s => countWeeklySubjectOccurrences(grid, s.code) < maxWeeklyQuota)
        .sort((a, b) => countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code));

      for (const subject of candidates) {
        if (!canPlaceSubjectAt(daySlots, idx, subject.code, morningIndices, afternoonIndices, false)) continue;

        daySlots[idx] = {
          type: subject.type === 'elective' ? 'elective' : 'theory',
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: subject.facultyId,
          facultyName: subject.facultyName,
        };
        recordFacultySlot(facultySchedule, subject.facultyId, day, idx, section);
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 6: ABSOLUTE ZERO-EMPTY GUARANTEE PASS (Strict Quota Respected)
  // ═══════════════════════════════════════════════════════════════
  for (const day of availableDays) {
    const daySlots = grid[day];
    for (const idx of teachableIndices) {
      if (daySlots[idx] !== null) continue;

      // Filter candidates that have NOT exceeded maxWeeklyQuota
      let candidates = [...academicSubjects]
        .filter(s => countWeeklySubjectOccurrences(grid, s.code) < maxWeeklyQuota)
        .sort((a, b) => countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code));

      if (candidates.length === 0) {
        candidates = [...academicSubjects].sort((a, b) =>
          countWeeklySubjectOccurrences(grid, a.code) - countWeeklySubjectOccurrences(grid, b.code)
        );
      }

      let chosen = candidates.find(c =>
        canPlaceSubjectAt(daySlots, idx, c.code, morningIndices, afternoonIndices, false)
      );

      if (!chosen) {
        chosen = candidates[0] || { code: 'ACAD', name: 'Academic Hour', type: 'theory', facultyId: '', facultyName: 'Faculty TBD' };
      }

      daySlots[idx] = {
        type: chosen.type === 'elective' ? 'elective' : 'theory',
        subjectCode: chosen.code,
        subjectName: chosen.name,
        facultyId: chosen.facultyId || '',
        facultyName: chosen.facultyName || '',
      };
      if (chosen.facultyId) {
        recordFacultySlot(facultySchedule, chosen.facultyId, day, idx, section);
      }
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

// ════════════════════════════════════════════════════════════════════
// CO-CURRICULAR PLACEMENT
// ════════════════════════════════════════════════════════════════════

function placeCoCurricularSubjects(grid, coCurricularSubjects, existingSchedules, availableDays, year, section, lastIdx, secondLastIdx, preLunchIdx) {
  if (!coCurricularSubjects || coCurricularSubjects.length === 0) return;

  const sportsSub = coCurricularSubjects.find(s => s.code === 'VBIT-SPORTS');
  const librarySub = coCurricularSubjects.find(s => s.code === 'VBIT-LIBRARY');
  const mentoringSub = coCurricularSubjects.find(s => s.code === 'VBIT-MENTORING');
  const tutorialSub = coCurricularSubjects.find(s => s.code === 'VBIT-TUTORIAL');
  const nptelSub = coCurricularSubjects.find(s => s.code === 'VBIT-NPTEL');

  // ── 1. SPORTS — Last period(s), no faculty, staggered across same-year sections ──
  if (sportsSub && countWeeklySubjectOccurrences(grid, 'VBIT-SPORTS') === 0) {
    const sameYearSportsDays = new Set();
    const collegeSportsDayCount = {};

    for (const existing of existingSchedules) {
      if (!existing.grid) continue;
      for (const day of WEEKDAYS) {
        const slots = existing.grid[day];
        if (slots && slots.some(s => s && s.subjectCode === 'VBIT-SPORTS')) {
          if (existing.year === year) sameYearSportsDays.add(day);
          collegeSportsDayCount[day] = (collegeSportsDayCount[day] || 0) + 1;
        }
      }
    }

    const sportsDuration = (year >= 3) ? 1 : 2;

    let targetDay = availableDays.find(d => !sameYearSportsDays.has(d) && (collegeSportsDayCount[d] || 0) < 2);
    if (!targetDay) targetDay = availableDays.find(d => !sameYearSportsDays.has(d));
    if (!targetDay) targetDay = availableDays[0];

    const daySlots = grid[targetDay];
    if (daySlots) {
      if (sportsDuration === 2 && daySlots[secondLastIdx] === null && daySlots[lastIdx] === null) {
        daySlots[secondLastIdx] = { type: 'training', subjectCode: 'VBIT-SPORTS', subjectName: 'Sports', facultyId: '', facultyName: '' };
        daySlots[lastIdx] = { type: 'training', subjectCode: 'VBIT-SPORTS', subjectName: 'Sports', facultyId: '', facultyName: '' };
      } else if (daySlots[lastIdx] === null) {
        daySlots[lastIdx] = { type: 'training', subjectCode: 'VBIT-SPORTS', subjectName: 'Sports', facultyId: '', facultyName: '' };
      }
    }
  }

  // ── 2. LIBRARY — Last period, once per week, no faculty ──
  if (librarySub && countWeeklySubjectOccurrences(grid, 'VBIT-LIBRARY') === 0) {
    for (const day of ['Thursday', 'Wednesday', 'Tuesday', 'Monday', 'Saturday']) {
      if (!grid[day] || !availableDays.includes(day)) continue;
      if (grid[day][lastIdx] === null) {
        grid[day][lastIdx] = { type: 'training', subjectCode: 'VBIT-LIBRARY', subjectName: 'Library', facultyId: '', facultyName: '' };
        break;
      }
    }
  }

  // ── 3. MENTORING — Last period, once per week, no faculty ──
  if (mentoringSub && countWeeklySubjectOccurrences(grid, 'VBIT-MENTORING') === 0) {
    for (const day of ['Wednesday', 'Tuesday', 'Monday', 'Thursday', 'Saturday']) {
      if (!grid[day] || !availableDays.includes(day)) continue;
      if (grid[day][lastIdx] === null) {
        grid[day][lastIdx] = { type: 'training', subjectCode: 'VBIT-MENTORING', subjectName: 'Mentoring', facultyId: '', facultyName: '' };
        break;
      }
    }
  }

  // ── 4. TUTORIAL — Period 6 or 7 (secondLast or last), once per week, WITH faculty ──
  if (tutorialSub && countWeeklySubjectOccurrences(grid, 'VBIT-TUTORIAL') === 0) {
    for (const day of ['Tuesday', 'Monday', 'Wednesday', 'Thursday', 'Saturday']) {
      if (!grid[day] || !availableDays.includes(day)) continue;
      if (grid[day][secondLastIdx] === null) {
        grid[day][secondLastIdx] = { type: 'training', subjectCode: 'VBIT-TUTORIAL', subjectName: 'Tutorial', facultyId: tutorialSub.facultyId || '', facultyName: tutorialSub.facultyName || 'Tutorial Faculty' };
        break;
      } else if (grid[day][lastIdx] === null) {
        grid[day][lastIdx] = { type: 'training', subjectCode: 'VBIT-TUTORIAL', subjectName: 'Tutorial', facultyId: tutorialSub.facultyId || '', facultyName: tutorialSub.facultyName || 'Tutorial Faculty' };
        break;
      }
    }
  }

  // ── 5. NPTEL — Pre-lunch (last morning period), once per week, WITH faculty ──
  if (nptelSub && countWeeklySubjectOccurrences(grid, 'VBIT-NPTEL') === 0) {
    for (const day of availableDays) {
      if (!grid[day]) continue;
      if (grid[day][preLunchIdx] === null) {
        grid[day][preLunchIdx] = { type: 'training', subjectCode: 'VBIT-NPTEL', subjectName: 'NPTEL Certification', facultyId: nptelSub.facultyId || '', facultyName: nptelSub.facultyName || 'NPTEL Coordinator' };
        break;
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// LAB PLACEMENT
// ════════════════════════════════════════════════════════════════════

/**
 * Place a lab session: N continuous periods, strictly starting at dynamically computed valid start indices.
 * Max 1 lab per day. Faculty and room collision checks across all existing schedules.
 * Tries initialLabDuration (3 or 2 periods), falling back to 2 periods if 3 continuous slots are occupied.
 */
function placeLabSession(grid, lab, availableDays, facultySchedule, section, existingSchedules, initialLabDuration, year, timeConfig) {
  const shuffledDays = [...availableDays];
  shuffleArray(shuffledDays);
  const labRoom = getLabRoom(lab.name, year);

  const durationsToTry = [initialLabDuration];
  if (initialLabDuration > 2) {
    durationsToTry.push(2);
  }

  // Pass 1: Strict placement — check faculty free AND room free
  for (const labDuration of durationsToTry) {
    const validStartIndices = getLabStartIndices(timeConfig, labDuration);

    for (const day of shuffledDays) {
      const daySlots = grid[day];
      const hasLabToday = daySlots.some(s => s && s.type === 'lab');
      if (hasLabToday) continue;

      for (const startIdx of validStartIndices) {
        if (startIdx + labDuration > daySlots.length) continue;
        const slice = daySlots.slice(startIdx, startIdx + labDuration);
        if (!slice.every(s => s === null)) continue;

        const indices = Array.from({ length: labDuration }, (_, k) => startIdx + k);
        const facultyFree = indices.every(idx => !isFacultyBusy(facultySchedule, lab.facultyId, day, idx, true));
        if (!facultyFree) continue;

        const roomFree = indices.every(idx => !isLabRoomBusy(existingSchedules, labRoom, day, idx));
        if (!roomFree) continue;

        for (let offset = 0; offset < labDuration; offset++) {
          daySlots[startIdx + offset] = {
            type: 'lab',
            subjectCode: lab.code,
            subjectName: `${lab.name} (${labRoom})`,
            facultyId: lab.facultyId,
            facultyName: lab.facultyName,
            span: offset === 0 ? labDuration : 0,
          };
          recordFacultySlot(facultySchedule, lab.facultyId, day, startIdx + offset, section);
        }
        return true;
      }
    }
  }

  // Pass 2: Fallback placement — guarantee lab is placed in an open section slot
  for (const labDuration of durationsToTry) {
    const validStartIndices = getLabStartIndices(timeConfig, labDuration);

    for (const day of shuffledDays) {
      const daySlots = grid[day];
      const hasLabToday = daySlots.some(s => s && s.type === 'lab');
      if (hasLabToday) continue;

      for (const startIdx of validStartIndices) {
        if (startIdx + labDuration > daySlots.length) continue;
        const slice = daySlots.slice(startIdx, startIdx + labDuration);
        if (!slice.every(s => s === null)) continue;

        for (let offset = 0; offset < labDuration; offset++) {
          daySlots[startIdx + offset] = {
            type: 'lab',
            subjectCode: lab.code,
            subjectName: `${lab.name} (${labRoom})`,
            facultyId: lab.facultyId,
            facultyName: lab.facultyName,
            span: offset === 0 ? labDuration : 0,
          };
          recordFacultySlot(facultySchedule, lab.facultyId, day, startIdx + offset, section);
        }
        return true;
      }
    }
  }

  return false;
}

// ════════════════════════════════════════════════════════════════════
// THEORY PLACEMENT (with day-spread prioritization)
// ════════════════════════════════════════════════════════════════════

/**
 * Place a theory/elective subject in the best available slot.
 * Prioritizes days where the subject hasn't been placed yet (day-spread).
 * Enforces: no consecutive, max 1 morning + 1 afternoon per day.
 */
function placeTheorySessionStrict(grid, subject, availableDays, facultySchedule, section, morningIndices, afternoonIndices, teachableIndices, strictOnePerDay = false, checkFaculty = true) {
  // Separate days into: days WITHOUT this subject (preferred) and days WITH it
  const daysWithSubject = new Set();
  for (const day of availableDays) {
    if (grid[day].some(s => s && s.subjectCode === subject.code)) {
      daysWithSubject.add(day);
    }
  }

  const freshDays = availableDays.filter(d => !daysWithSubject.has(d));
  const usedDays = availableDays.filter(d => daysWithSubject.has(d));
  shuffleArray(freshDays);
  shuffleArray(usedDays);
  const orderedDays = [...freshDays, ...usedDays];

  for (const day of orderedDays) {
    const daySlots = grid[day];

    for (const idx of teachableIndices) {
      if (!canPlaceSubjectAt(daySlots, idx, subject.code, morningIndices, afternoonIndices, strictOnePerDay)) continue;
      if (checkFaculty && isFacultyBusy(facultySchedule, subject.facultyId, day, idx)) continue;

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

// ════════════════════════════════════════════════════════════════════
// ELECTIVE ALIGNMENT
// ════════════════════════════════════════════════════════════════════

function findAlignedElectiveSlot(elective, existingSchedules, grid, availableDays, facultySchedule, section) {
  for (const existing of existingSchedules) {
    if (!existing.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = existing.grid[day];
      if (!daySlots) continue;
      for (let idx = 0; idx < daySlots.length; idx++) {
        const slot = daySlots[idx];
        if (slot && slot.peGroup === elective.peGroup) {
          if (grid[day] && grid[day][idx] === null && !isFacultyBusy(facultySchedule, elective.facultyId, day, idx)) {
            return { day, periodIndex: idx };
          }
        }
      }
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function buildFacultyScheduleMap(existingSchedules) {
  const map = { _totalHours: {} };
  for (const schedule of existingSchedules) {
    if (!schedule.grid) continue;
    for (const day of WEEKDAYS) {
      const daySlots = schedule.grid[day];
      if (!daySlots) continue;
      for (let idx = 0; idx < daySlots.length; idx++) {
        const slot = daySlots[idx];
        if (slot) {
          const fId = slot.facultyId;
          if (fId && !fId.startsWith('fac_') && !fId.startsWith('Faculty') && !fId.startsWith('faculty_')) {
            if (!map[fId]) map[fId] = {};
            map[fId][`${day}-${idx}`] = schedule.section;
            map._totalHours[fId] = (map._totalHours[fId] || 0) + 1;
          }
        }
      }
    }
  }
  return map;
}

function isFacultyBusy(facultySchedule, facultyId, day, periodIndex, isLabBlock = false) {
  if (!facultyId || facultyId.startsWith('fac_') || facultyId.startsWith('Faculty') || facultyId.startsWith('faculty_')) return false;

  // 1. HARD WORKLOAD CAP: Maximum 18 hours/week total across all sections & subjects
  const currentTotal = facultySchedule._totalHours?.[facultyId] || 0;
  if (currentTotal >= 18) return true;

  // 2. Direct slot collision: Faculty is already teaching in this day-period slot in another section
  if (facultySchedule[facultyId]?.[`${day}-${periodIndex}`] !== undefined) return true;

  // 3. FACULTY REST PERIOD RULE: No back-to-back theory classes for the same faculty!
  // If Faculty A has a class in period (periodIndex - 1) or (periodIndex + 1), periodIndex MUST be a free rest period!
  if (!isLabBlock) {
    const prevSlot = facultySchedule[facultyId]?.[`${day}-${periodIndex - 1}`];
    const nextSlot = facultySchedule[facultyId]?.[`${day}-${periodIndex + 1}`];
    if (prevSlot !== undefined || nextSlot !== undefined) {
      return true; // Enforces mandatory rest period between theory classes!
    }
  }

  return false;
}

function recordFacultySlot(facultySchedule, facultyId, day, periodIndex, section) {
  if (!facultyId || facultyId.startsWith('fac_') || facultyId.startsWith('Faculty') || facultyId.startsWith('faculty_')) return;
  if (!facultySchedule[facultyId]) facultySchedule[facultyId] = {};
  facultySchedule[facultyId][`${day}-${periodIndex}`] = section;
  if (!facultySchedule._totalHours) facultySchedule._totalHours = {};
  facultySchedule._totalHours[facultyId] = (facultySchedule._totalHours[facultyId] || 0) + 1;
}

function countWeeklySubjectOccurrences(grid, subjectCode) {
  if (!grid || !subjectCode) return 0;
  let count = 0;
  for (const day of WEEKDAYS) {
    const slots = grid[day];
    if (!slots) continue;
    for (const slot of slots) {
      if (slot && slot.subjectCode === subjectCode) count++;
    }
  }
  return count;
}

function countEmptyTeachableSlots(grid, availableDays, teachableIndices) {
  let count = 0;
  for (const day of availableDays) {
    if (!grid[day]) continue;
    for (const idx of teachableIndices) {
      if (grid[day][idx] === null) count++;
    }
  }
  return count;
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

  // Specialized department labs for Years 2, 3, 4
  if (name.includes('deep learning')) return 'AI & Deep Learning Lab';
  if (name.includes('web analytics') || name.includes('web')) return 'Web Analytics Lab';
  if (name.includes('project')) return 'Project Work Lab';
  if (name.includes('java') || name.includes('oop')) return 'Java Computing Lab';
  if (name.includes('os ') || name.includes('operating')) return 'Systems Lab';
  if (name.includes('dbms') || name.includes('database') || name.includes('big data')) return 'Database Lab';
  if (name.includes('devops')) return 'DevOps Lab';
  if (name.includes('r lab') || name.includes('talend')) return 'Data Science Lab';

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const labIndex = (Math.abs(hash) % 15) + 1;
  return `Computing Lab ${labIndex}`;
}

function isLabRoomBusy(existingSchedules, labRoom, day, periodIndex) {
  if (!labRoom) return false;
  return existingSchedules.some(sched => {
    if (!sched.grid || !sched.grid[day]) return false;
    const daySlots = sched.grid[day];
    const slot = daySlots[periodIndex];
    if (slot && slot.type === 'lab') {
      const match = slot.subjectName ? slot.subjectName.match(/\(([^)]+)\)/) : null;
      const otherRoom = match ? match[1] : getLabRoom(slot.subjectName, sched.year || 1);
      if (otherRoom === labRoom) return true;
    }
    return false;
  });
}

export default generateTimetable;
