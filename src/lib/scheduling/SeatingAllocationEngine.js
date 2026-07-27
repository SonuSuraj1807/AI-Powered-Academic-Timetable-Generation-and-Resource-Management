/**
 * SeatingAllocationEngine — Anti-malpractice exam seating plan generator.
 *
 * Implements VBIT-standard exam seating rules:
 * - 4-column × 6-row room grid (default 24 capacity)
 * - Column interleaving: adjacent columns MUST have different branches
 * - Roll numbers in strict ascending order within each branch's columns
 * - Rooms filled to max capacity before spawning new ones
 * - Leftover students from different branches paired into split rooms
 *
 * Dynamic Invigilation Rules:
 * - Single-branch room → 1 invigilator
 * - Multi-branch room (2+) → 2 invigilators
 * - No faculty double-booking in the same FN/AN session
 * - Round-robin workload balancing across sessions
 *
 * Faculty Availability Model:
 * - All faculty in the pool are available by default per session
 * - Admins can mark specific faculty as "unavailable" for a session
 *   (e.g., on leave, conducting viva, external duty)
 * - This mirrors real examination branch workflows in Indian institutions
 */

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

export const EXAM_SESSIONS = {
  FN: { id: 'FN', label: 'Forenoon', start: '10:00 AM', end: '01:00 PM' },
  AN: { id: 'AN', label: 'Afternoon', start: '01:30 PM', end: '04:30 PM' },
};

export const EXAM_BLOCKS = [
  { id: 'aakash', name: 'Aakash' },
  { id: 'pratham', name: 'Pratham' },
  { id: 'srujan', name: 'Srujan' },
  { id: 'nirmithi', name: 'Nirmithi' },
  { id: 'avishkar', name: 'Avishkar' },
];

export const EXAM_TYPES = [
  { id: 'regular', label: 'Regular' },
  { id: 'supplementary', label: 'Supplementary' },
];

export const REGULATION_OPTIONS = ['R25', 'R22', 'R21', 'R19'];

// ═══════════════════════════════════════════════════════════
// INTERLEAVING ALGORITHM
// ═══════════════════════════════════════════════════════════

/**
 * Group students by branch and sort each group by hall ticket number (ascending).
 *
 * @param {Array} students – [{ hallTicketNo, branch, yearSem, ... }]
 * @returns {Object} { branchName: [sorted students] }
 */
function groupByBranch(students) {
  const groups = {};
  for (const s of students) {
    const key = s.branch || 'UNKNOWN';
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  // Sort each group by hall ticket number ascending
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.hallTicketNo.localeCompare(b.hallTicketNo));
  }
  return groups;
}

/**
 * Build interleaved room grids from grouped students.
 *
 * Algorithm:
 * 1. Take the two largest branch groups as primary interleave pair
 * 2. Assign Branch A to columns 0,2 and Branch B to columns 1,3
 * 3. Fill rows top-to-bottom, columns left-to-right within each branch
 * 4. When a room is full (rows × cols), seal it and open a new one
 * 5. Leftover students from different branches get paired into split rooms
 *
 * @param {Object} branchGroups – { branchName: [sorted students] }
 * @param {Array} rooms – [{ roomId, roomNumber, block, floor, rows, cols, capacity }]
 * @returns {Array} roomPlans – [{ room, grid[][], branches[], branchCount, studentCount }]
 */
function interleaveIntoRooms(branchGroups, rooms) {
  const branchNames = Object.keys(branchGroups);
  const roomPlans = [];
  let roomIdx = 0;

  // Track consumed counts per branch
  const consumed = {};
  branchNames.forEach(b => { consumed[b] = 0; });

  /**
   * Fill a single room with students from two branch arrays.
   * branchA → columns 0, 2;  branchB → columns 1, 3
   */
  function fillRoom(room, branchAName, branchBName) {
    const rows = room.rows || 6;
    const cols = room.cols || 4;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

    const branchA = branchGroups[branchAName] || [];
    const branchB = branchGroups[branchBName] || [];
    let aIdx = consumed[branchAName] || 0;
    let bIdx = consumed[branchBName] || 0;

    const colAssignment = {};
    // Branch A gets even columns (0, 2)
    // Branch B gets odd columns (1, 3)
    for (let c = 0; c < cols; c++) {
      colAssignment[c] = c % 2 === 0 ? branchAName : branchBName;
    }

    let seatedCount = 0;
    const seatedBranches = new Set();

    for (let c = 0; c < cols; c++) {
      const branch = colAssignment[c];
      const students = branchGroups[branch];
      let idx = consumed[branch];

      for (let r = 0; r < rows; r++) {
        if (idx >= students.length) break;
        grid[r][c] = {
          hallTicketNo: students[idx].hallTicketNo,
          branch: students[idx].branch,
          yearSem: students[idx].yearSem || `${students[idx].branch}-${students[idx].year || '?'}-${students[idx].semester || '?'} Sem`,
          name: students[idx].name || '',
          regulation: students[idx].regulation || '',
        };
        idx++;
        seatedCount++;
        seatedBranches.add(branch);
      }
      consumed[branch] = idx;
    }

    if (seatedCount === 0) return null;

    return {
      room,
      grid,
      branches: [...seatedBranches],
      branchCount: seatedBranches.size,
      studentCount: seatedCount,
      totalRegistered: seatedCount,
    };
  }

  // ── Phase 1: Pair branches for interleaving ──
  // Sort branches by student count descending to pair large groups together
  const sortedBranches = [...branchNames].sort(
    (a, b) => branchGroups[b].length - branchGroups[a].length
  );

  // Create pairs of branches for interleaving
  const pairs = [];
  const pairedSet = new Set();

  for (let i = 0; i < sortedBranches.length; i++) {
    if (pairedSet.has(sortedBranches[i])) continue;
    const branchA = sortedBranches[i];
    pairedSet.add(branchA);

    // Find the best unpaired partner
    let partner = null;
    for (let j = i + 1; j < sortedBranches.length; j++) {
      if (!pairedSet.has(sortedBranches[j])) {
        partner = sortedBranches[j];
        pairedSet.add(partner);
        break;
      }
    }

    pairs.push({ branchA, branchB: partner });
  }

  // ── Phase 2: Fill rooms for each pair ──
  for (const pair of pairs) {
    const { branchA, branchB } = pair;

    if (!branchB) {
      // Single branch – fill rooms with just this branch (no interleaving needed)
      const students = branchGroups[branchA];
      while (consumed[branchA] < students.length) {
        if (roomIdx >= rooms.length) break;
        const room = rooms[roomIdx];
        const rows = room.rows || 6;
        const cols = room.cols || 4;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

        let seated = 0;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (consumed[branchA] >= students.length) break;
            grid[r][c] = {
              hallTicketNo: students[consumed[branchA]].hallTicketNo,
              branch: students[consumed[branchA]].branch,
              yearSem: students[consumed[branchA]].yearSem || `${branchA}-?-? Sem`,
              name: students[consumed[branchA]].name || '',
              regulation: students[consumed[branchA]].regulation || '',
            };
            consumed[branchA]++;
            seated++;
          }
        }

        if (seated > 0) {
          roomPlans.push({
            room,
            grid,
            branches: [branchA],
            branchCount: 1,
            studentCount: seated,
            totalRegistered: seated,
          });
        }
        roomIdx++;
      }
      continue;
    }

    // Paired interleaving – fill rooms until both branches are exhausted
    while (
      (consumed[branchA] < branchGroups[branchA].length ||
       consumed[branchB] < branchGroups[branchB].length)
    ) {
      if (roomIdx >= rooms.length) break;
      const plan = fillRoom(rooms[roomIdx], branchA, branchB);
      if (plan) {
        roomPlans.push(plan);
      }
      roomIdx++;
    }
  }

  return roomPlans;
}

// ═══════════════════════════════════════════════════════════
// INVIGILATION ASSIGNMENT
// ═══════════════════════════════════════════════════════════

/**
 * Assign invigilators to room plans based on branch count.
 *
 * Rules:
 * - 1 branch in room → 1 invigilator
 * - 2+ branches in room → 2 invigilators
 * - No double-booking: each faculty appears in at most 1 room per session
 * - Round-robin distribution for workload fairness
 *
 * @param {Array} roomPlans – Output from interleaveIntoRooms
 * @param {Array} availableFaculty – [{ id, name, department, designation }]
 * @param {Object} [existingAssignments] – { facultyId: roomCount } for cross-session balancing
 * @returns {{ roomPlans, errors, invigilatorSummary }}
 */
function assignInvigilators(roomPlans, availableFaculty, existingAssignments = {}) {
  const errors = [];

  if (!availableFaculty || availableFaculty.length === 0) {
    errors.push('No faculty available for invigilation. Please add faculty to the pool.');
    return { roomPlans, errors, invigilatorSummary: [] };
  }

  // Build workload tracker (lower count = higher priority for assignment)
  const workload = {};
  availableFaculty.forEach(f => {
    workload[f.id] = existingAssignments[f.id] || 0;
  });

  // Sort faculty by current workload (ascending) for fair distribution
  const sortedFaculty = [...availableFaculty].sort(
    (a, b) => (workload[a.id] || 0) - (workload[b.id] || 0)
  );

  const usedInSession = new Set(); // Track assigned faculty in this session
  let facultyPointer = 0;

  function getNextAvailableFaculty() {
    // Find next faculty not yet used in this session, with lowest workload
    const remaining = sortedFaculty.filter(f => !usedInSession.has(f.id));
    if (remaining.length === 0) return null;
    // Pick the one with lowest workload
    remaining.sort((a, b) => (workload[a.id] || 0) - (workload[b.id] || 0));
    return remaining[0];
  }

  for (const plan of roomPlans) {
    const needed = plan.branchCount >= 2 ? 2 : 1;
    plan.assignedInvigilators = [];

    for (let i = 0; i < needed; i++) {
      const faculty = getNextAvailableFaculty();
      if (faculty) {
        plan.assignedInvigilators.push({
          facultyId: faculty.id,
          name: faculty.name,
          designation: faculty.designation || '',
          department: faculty.department || '',
        });
        usedInSession.add(faculty.id);
        workload[faculty.id] = (workload[faculty.id] || 0) + 1;
      } else {
        errors.push(
          `Not enough invigilators for room ${plan.room.roomNumber} (${plan.room.block}). ` +
          `Need ${needed}, only ${plan.assignedInvigilators.length} assigned.`
        );
      }
    }
  }

  // Build summary
  const invigilatorSummary = availableFaculty
    .filter(f => usedInSession.has(f.id))
    .map(f => {
      const assignedRoom = roomPlans.find(p =>
        p.assignedInvigilators.some(inv => inv.facultyId === f.id)
      );
      return {
        facultyId: f.id,
        name: f.name,
        department: f.department,
        designation: f.designation,
        assignedRoom: assignedRoom ? assignedRoom.room.roomNumber : 'N/A',
        assignedBlock: assignedRoom ? assignedRoom.room.block : 'N/A',
        totalDuties: workload[f.id] || 0,
      };
    });

  return { roomPlans, errors, invigilatorSummary };
}

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate a generated seating plan against all constraints.
 *
 * @param {Array} roomPlans – Room plans with grids and invigilators
 * @returns {{ valid, errors, warnings }}
 */
function validatePlan(roomPlans) {
  const errors = [];
  const warnings = [];
  const allSeatedStudents = new Set();

  for (const plan of roomPlans) {
    const { room, grid, branchCount, assignedInvigilators } = plan;
    const roomLabel = `${room.block} ${room.roomNumber}`;

    // ── Check 1: Adjacent columns must have different branches ──
    if (branchCount >= 2) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length - 1; c++) {
          const current = grid[r][c];
          const next = grid[r][c + 1];
          if (current && next && current.branch === next.branch) {
            errors.push(
              `[${roomLabel}] Row ${r + 1}, Col ${c + 1}-${c + 2}: ` +
              `Adjacent seats have same branch (${current.branch}). Anti-malpractice violated.`
            );
          }
        }
      }
    }

    // ── Check 2: Roll numbers ascending within each column ──
    for (let c = 0; c < (grid[0]?.length || 0); c++) {
      let lastRoll = '';
      for (let r = 0; r < grid.length; r++) {
        const cell = grid[r][c];
        if (cell) {
          if (lastRoll && cell.hallTicketNo.localeCompare(lastRoll) < 0) {
            warnings.push(
              `[${roomLabel}] Col ${c + 1}: Roll number ${cell.hallTicketNo} ` +
              `appears after ${lastRoll} — not in ascending order.`
            );
          }
          lastRoll = cell.hallTicketNo;
        }
      }
    }

    // ── Check 3: Invigilator count matches branch count ──
    const expectedInv = branchCount >= 2 ? 2 : 1;
    if ((assignedInvigilators || []).length < expectedInv) {
      errors.push(
        `[${roomLabel}] Expected ${expectedInv} invigilator(s) but only ` +
        `${(assignedInvigilators || []).length} assigned.`
      );
    }

    // ── Check 4: No duplicate student seating ──
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell) {
          if (allSeatedStudents.has(cell.hallTicketNo)) {
            errors.push(
              `Student ${cell.hallTicketNo} appears in multiple rooms. Double-seating detected.`
            );
          }
          allSeatedStudents.add(cell.hallTicketNo);
        }
      }
    }
  }

  // ── Check 5: No faculty double-booking ──
  const facultyRoomMap = {};
  for (const plan of roomPlans) {
    for (const inv of (plan.assignedInvigilators || [])) {
      if (facultyRoomMap[inv.facultyId]) {
        errors.push(
          `Faculty ${inv.name} (${inv.facultyId}) is assigned to multiple rooms: ` +
          `${facultyRoomMap[inv.facultyId]} and ${plan.room.roomNumber}. Double-booking!`
        );
      }
      facultyRoomMap[inv.facultyId] = plan.room.roomNumber;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalStudentsSeated: allSeatedStudents.size,
    totalRoomsUsed: roomPlans.length,
    totalInvigilatorsAssigned: Object.keys(facultyRoomMap).length,
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════

/**
 * Generate a complete examination seating plan.
 *
 * @param {Object} config
 * @param {Array}  config.students – [{ hallTicketNo, branch, yearSem, name, regulation }]
 * @param {Array}  config.rooms – [{ roomId, roomNumber, block, floor, rows, cols, capacity }]
 *                                  sorted by block + floor + roomNumber for sequential assignment
 * @param {Array}  config.availableFaculty – [{ id, name, department, designation }]
 * @param {Object} config.sessionInfo – { date, session (FN/AN), examTitle, examType }
 * @param {Array}  [config.unavailableFacultyIds] – Faculty IDs to exclude from invigilation
 * @param {Object} [config.existingWorkload] – { facultyId: numPriorDuties } for balancing
 * @returns {Object} Complete seating plan result
 */
export function generateSeatingPlan({
  students = [],
  rooms = [],
  availableFaculty = [],
  sessionInfo = {},
  unavailableFacultyIds = [],
  existingWorkload = {},
}) {
  const allErrors = [];

  // ── Pre-validation ──
  if (students.length === 0) {
    return { roomPlans: [], errors: ['No students provided.'], summary: {}, validation: { valid: false, errors: ['No students.'] } };
  }
  if (rooms.length === 0) {
    return { roomPlans: [], errors: ['No exam rooms available.'], summary: {}, validation: { valid: false, errors: ['No rooms.'] } };
  }

  // ── Filter out unavailable faculty ──
  const excludeSet = new Set(unavailableFacultyIds);
  const eligibleFaculty = availableFaculty.filter(f => !excludeSet.has(f.id));

  // ── Sort rooms by block, floor, room number for predictable sequential allocation ──
  const sortedRooms = [...rooms]
    .filter(r => r.isActive !== false)
    .sort((a, b) => {
      if (a.block !== b.block) return a.block.localeCompare(b.block);
      if (a.floor !== b.floor) return (a.floor || 0) - (b.floor || 0);
      return String(a.roomNumber).localeCompare(String(b.roomNumber));
    });

  // ── Step 1: Group students by branch ──
  const branchGroups = groupByBranch(students);

  // ── Step 2: Interleave into room grids ──
  let roomPlans = interleaveIntoRooms(branchGroups, sortedRooms);

  // Check if all students are seated
  const totalSeated = roomPlans.reduce((sum, p) => sum + p.studentCount, 0);
  if (totalSeated < students.length) {
    allErrors.push(
      `Only ${totalSeated} of ${students.length} students could be seated. ` +
      `Need more rooms (${sortedRooms.length} rooms available with ` +
      `total capacity ${sortedRooms.reduce((s, r) => s + (r.capacity || 24), 0)}).`
    );
  }

  // ── Step 3: Assign invigilators ──
  const invigilationResult = assignInvigilators(
    roomPlans,
    eligibleFaculty,
    existingWorkload
  );
  roomPlans = invigilationResult.roomPlans;
  allErrors.push(...invigilationResult.errors);

  // ── Step 4: Validate ──
  const validation = validatePlan(roomPlans);
  allErrors.push(...validation.errors);

  // ── Build summary ──
  const summary = {
    totalStudents: students.length,
    totalSeated: validation.totalStudentsSeated,
    totalRoomsUsed: validation.totalRoomsUsed,
    totalInvigilators: validation.totalInvigilatorsAssigned,
    singleBranchRooms: roomPlans.filter(p => p.branchCount === 1).length,
    multiBranchRooms: roomPlans.filter(p => p.branchCount >= 2).length,
    branchBreakdown: Object.fromEntries(
      Object.entries(branchGroups).map(([b, s]) => [b, s.length])
    ),
    sessionInfo,
    generatedAt: new Date().toISOString(),
    warnings: validation.warnings,
  };

  return {
    roomPlans,
    invigilatorSummary: invigilationResult.invigilatorSummary,
    errors: allErrors,
    summary,
    validation,
  };
}

// ═══════════════════════════════════════════════════════════
// CSV PARSING UTILITY
// ═══════════════════════════════════════════════════════════

/**
 * Parse CSV text into student objects.
 * Expected columns: HallTicketNo, Name, Branch, Year, Semester, Regulation
 *
 * @param {string} csvText – Raw CSV content
 * @returns {{ students, errors }}
 */
export function parseStudentCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { students: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
  const students = [];
  const errors = [];

  // Map header columns
  const colMap = {};
  const aliases = {
    hallticketno: ['hallticketno', 'hallticket', 'htno', 'rollno', 'rollnumber', 'hall_ticket_no'],
    name: ['name', 'studentname', 'student_name'],
    branch: ['branch', 'dept', 'department', 'branchcode'],
    year: ['year', 'yr'],
    semester: ['semester', 'sem'],
    regulation: ['regulation', 'reg', 'regulationcode'],
  };

  for (const [field, possibleNames] of Object.entries(aliases)) {
    const idx = header.findIndex(h => possibleNames.includes(h));
    if (idx !== -1) colMap[field] = idx;
  }

  if (colMap.hallticketno === undefined) {
    return { students: [], errors: ['CSV must have a HallTicketNo column.'] };
  }
  if (colMap.branch === undefined) {
    return { students: [], errors: ['CSV must have a Branch column.'] };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length < 2 || !row[colMap.hallticketno]) continue;

    const hallTicketNo = row[colMap.hallticketno];
    const name = colMap.name !== undefined ? row[colMap.name] : '';
    const branch = row[colMap.branch];
    const year = colMap.year !== undefined ? row[colMap.year] : '';
    const semester = colMap.semester !== undefined ? row[colMap.semester] : '';
    const regulation = colMap.regulation !== undefined ? row[colMap.regulation] : '';

    if (!hallTicketNo || !branch) {
      errors.push(`Row ${i + 1}: Missing HallTicketNo or Branch.`);
      continue;
    }

    students.push({
      hallTicketNo,
      name,
      branch,
      year,
      semester,
      regulation,
      yearSem: `${branch}-${year || '?'}-${semester || '?'} Sem`,
    });
  }

  return { students, errors };
}

export default {
  generateSeatingPlan,
  parseStudentCSV,
  EXAM_SESSIONS,
  EXAM_BLOCKS,
  EXAM_TYPES,
  REGULATION_OPTIONS,
};
