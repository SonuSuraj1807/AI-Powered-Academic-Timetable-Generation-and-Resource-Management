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
  { id: 'avishkar', name: 'Avishkar', type: 'Academic Classrooms (CSE-DS)' },
  { id: 'nirmithi', name: 'Nirmithi', type: 'Academic Classrooms (CSE)' },
  { id: 'srujan', name: 'Srujan', type: 'Academic Classrooms (ECE)' },
  { id: 'pragna', name: 'Pragna', type: 'Academic Classrooms (EEE)' },
  { id: 'prathibha', name: 'Prathibha', type: 'Academic Classrooms (IT)' },
  { id: 'pratham', name: 'Pratham', type: 'Academic Classrooms (MECH)' },
  { id: 'aakash', name: 'Aakash', type: 'Academic Classrooms (CIVIL)' },
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
 * Group students by branch and year/sem (or paper code) and sort each group by hall ticket number (ascending).
 * Supports Cross-Year (e.g. CSD III Year vs CSD IV Year) and Cross-Paper interleaving.
 *
 * @param {Array} students – [{ hallTicketNo, branch, year, semester, yearSem, ... }]
 * @returns {Object} { groupKey: [sorted students] }
 */
function groupByBranch(students) {
  const groups = {};
  for (const s of students) {
    // Distinct key including Branch and Year (e.g. CSE-III or CSD-IV) to allow III vs IV Year interleaving
    const branch = s.branch || 'UNKNOWN';
    const yr = s.year || s.yearSem?.split('-')[1] || '';
    const key = yr ? `${branch}-${yr}` : branch;

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
  const roomPlans = [];
  let roomIdx = 0;

  // Track remaining student queues per branch key
  const queues = {};
  for (const [b, list] of Object.entries(branchGroups)) {
    queues[b] = [...list];
  }

  const getActiveBranches = () => Object.keys(queues).filter(b => queues[b].length > 0);

  while (getActiveBranches().length > 0 && roomIdx < rooms.length) {
    const active = getActiveBranches();
    const room = rooms[roomIdx];
    const rows = room.rows || 6;
    const cols = room.cols || 4;

    let branch1 = null;
    let branch2 = null;

    if (active.length >= 2) {
      // Sort active branches by remaining student count descending
      active.sort((a, b) => queues[b].length - queues[a].length);

      // Branch 1 is the largest remaining queue
      branch1 = active[0];

      // Branch 2: Find the branch with the MAXIMUM structural department difference
      // (e.g. if Branch 1 is CSE, prefer ECE, IT, EEE, CIVIL over CSE-DS)
      let bestPartnerIdx = 1;
      const b1Dept = branch1.split('-')[0].toUpperCase();

      for (let i = 1; i < active.length; i++) {
        const candidateDept = active[i].split('-')[0].toUpperCase();
        if (b1Dept !== candidateDept) {
          bestPartnerIdx = i;
          break;
        }
      }
      branch2 = active[bestPartnerIdx];
    } else {
      branch1 = active[0];
    }

    if (branch1 && branch2) {
      // Dual-branch room allocation across dual seats per bench
      const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
      let seatedCount = 0;
      const seatedBranches = new Set();

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (queues[branch1].length === 0 && queues[branch2].length === 0) break;

          const s1 = queues[branch1].length > 0 ? queues[branch1].shift() : null;
          if (s1) { seatedCount++; seatedBranches.add(branch1); }

          const s2 = queues[branch2].length > 0 ? queues[branch2].shift() : null;
          if (s2) { seatedCount++; seatedBranches.add(branch2); }

          if (s1 || s2) {
            grid[r][c] = {
              seat1: s1 ? {
                hallTicketNo: s1.hallTicketNo,
                branch: s1.branch || branch1,
                yearSem: s1.yearSem || branch1,
                name: s1.name || '',
                regulation: s1.regulation || '',
              } : null,
              seat2: s2 ? {
                hallTicketNo: s2.hallTicketNo,
                branch: s2.branch || branch2,
                yearSem: s2.yearSem || branch2,
                name: s2.name || '',
                regulation: s2.regulation || '',
              } : null,
              hallTicketNo: s1 ? (s2 ? `${s1.hallTicketNo} / ${s2.hallTicketNo}` : s1.hallTicketNo) : (s2 ? s2.hallTicketNo : ''),
              branch: s1 ? (s2 ? `${s1.branch} & ${s2.branch}` : s1.branch) : (s2 ? s2.branch : ''),
            };
          }
        }
      }

      if (seatedCount > 0) {
        roomPlans.push({
          room,
          grid,
          branches: [...seatedBranches],
          branchCount: seatedBranches.size,
          studentCount: seatedCount,
          totalRegistered: seatedCount,
        });
      }
      roomIdx++;
    } else if (branch1) {
      // Single branch remaining -> Split into two halves (Lower Roll Nos vs Upper Roll Nos) for bench interleaving
      const students = queues[branch1];
      queues[branch1] = []; // Consume remaining

      const half = Math.ceil(students.length / 2);
      const halfA = students.slice(0, half);
      const halfB = students.slice(half);
      let aPtr = 0;
      let bPtr = 0;

      while ((aPtr < halfA.length || bPtr < halfB.length) && roomIdx < rooms.length) {
        const curRoom = rooms[roomIdx];
        const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
        let seatedCount = 0;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const s1 = aPtr < halfA.length ? halfA[aPtr++] : null;
            if (s1) seatedCount++;

            const s2 = bPtr < halfB.length ? halfB[bPtr++] : null;
            if (s2) seatedCount++;

            if (s1 || s2) {
              grid[r][c] = {
                seat1: s1 ? { hallTicketNo: s1.hallTicketNo, branch: s1.branch || branch1, yearSem: s1.yearSem || branch1, name: s1.name || '' } : null,
                seat2: s2 ? { hallTicketNo: s2.hallTicketNo, branch: s2.branch || branch1, yearSem: s2.yearSem || branch1, name: s2.name || '' } : null,
                hallTicketNo: s1 ? (s2 ? `${s1.hallTicketNo} / ${s2.hallTicketNo}` : s1.hallTicketNo) : (s2 ? s2.hallTicketNo : ''),
                branch: branch1,
              };
            }
          }
        }

        if (seatedCount > 0) {
          roomPlans.push({
            room: curRoom,
            grid,
            branches: [branch1],
            branchCount: 1,
            studentCount: seatedCount,
            totalRegistered: seatedCount,
          });
        }
        roomIdx++;
      }
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

  function getNextAvailableFaculty(preferredDept) {
    const remaining = sortedFaculty.filter(f => !usedInSession.has(f.id));
    if (remaining.length === 0) return null;

    if (preferredDept) {
      const cleanDept = preferredDept.split('-')[0].trim().toLowerCase();
      const match = remaining.find(f => 
        f.department && f.department.toLowerCase().includes(cleanDept)
      );
      if (match) return match;
    }

    // Fallback: pick faculty with lowest workload
    remaining.sort((a, b) => (workload[a.id] || 0) - (workload[b.id] || 0));
    return remaining[0];
  }

  for (const plan of roomPlans) {
    const needed = plan.branchCount >= 2 ? 2 : 1;
    plan.assignedInvigilators = [];

    for (let i = 0; i < needed; i++) {
      const preferredDept = plan.branches[i] || plan.branches[0];
      const faculty = getNextAvailableFaculty(preferredDept);
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

    // ── Check 1: Adjacent bench seats must have different branches ──
    if (branchCount >= 2) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const cell = grid[r][c];
          if (cell) {
            // Check same bench (Seat 1 vs Seat 2)
            if (cell.seat1 && cell.seat2 && cell.seat1.branch === cell.seat2.branch) {
              errors.push(
                `[${roomLabel}] Row ${r + 1}, Col ${c + 1}: ` +
                `Same bench seats have identical branch (${cell.seat1.branch}). Anti-malpractice violated.`
              );
            }
            // Check adjacent aisle seats (Seat 2 of Col c vs Seat 1 of Col c+1)
            const nextCell = grid[r][c + 1];
            if (nextCell && cell.seat2 && nextCell.seat1 && cell.seat2.branch === nextCell.seat1.branch) {
              errors.push(
                `[${roomLabel}] Row ${r + 1}, Col ${c + 1}-${c + 2}: ` +
                `Adjacent aisle seats have identical branch (${cell.seat2.branch}). Anti-malpractice violated.`
              );
            }
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

/**
 * Seed default exam rooms in Firestore /exam_rooms for all 9 blocks if empty.
 */
export async function seedDefaultExamRooms(db, getDocs, collection, doc, writeBatch) {
  try {
    const snap = await getDocs(collection(db, 'exam_rooms'));
    if (!snap.empty && snap.size >= 20) return;

    const batch = writeBatch(db);
    const defaultRoster = [
      // Avishkar Block
      { roomNumber: '001', block: 'Avishkar', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '002', block: 'Avishkar', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '101', block: 'Avishkar', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '102', block: 'Avishkar', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '201', block: 'Avishkar', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '202', block: 'Avishkar', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '208', block: 'Avishkar', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '301', block: 'Avishkar', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '304', block: 'Avishkar', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '305', block: 'Avishkar', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '306', block: 'Avishkar', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '401', block: 'Avishkar', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '407', block: 'Avishkar', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },
      { roomNumber: '409', block: 'Avishkar', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'CSE-DS', isActive: true },

      // Nirmithi Block
      { roomNumber: '003', block: 'Nirmithi', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'CSE', isActive: true },
      { roomNumber: '103', block: 'Nirmithi', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'CSE', isActive: true },
      { roomNumber: '203', block: 'Nirmithi', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'CSE', isActive: true },
      { roomNumber: '302', block: 'Nirmithi', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CSE', isActive: true },
      { roomNumber: '402', block: 'Nirmithi', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'CSE', isActive: true },

      // Srujan Block
      { roomNumber: '004', block: 'Srujan', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'ECE', isActive: true },
      { roomNumber: '104', block: 'Srujan', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'ECE', isActive: true },
      { roomNumber: '204', block: 'Srujan', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'ECE', isActive: true },
      { roomNumber: '303', block: 'Srujan', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'ECE', isActive: true },
      { roomNumber: '403', block: 'Srujan', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'ECE', isActive: true },

      // Pragna Block
      { roomNumber: '005', block: 'Pragna', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'EEE', isActive: true },
      { roomNumber: '105', block: 'Pragna', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'EEE', isActive: true },
      { roomNumber: '205', block: 'Pragna', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'EEE', isActive: true },
      { roomNumber: '307', block: 'Pragna', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'EEE', isActive: true },
      { roomNumber: '404', block: 'Pragna', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'EEE', isActive: true },

      // Prathibha Block
      { roomNumber: '006', block: 'Prathibha', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'IT', isActive: true },
      { roomNumber: '106', block: 'Prathibha', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'IT', isActive: true },
      { roomNumber: '206', block: 'Prathibha', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'IT', isActive: true },
      { roomNumber: '308', block: 'Prathibha', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'IT', isActive: true },
      { roomNumber: '405', block: 'Prathibha', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'IT', isActive: true },

      // Pratham Block
      { roomNumber: '007', block: 'Pratham', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'MECH', isActive: true },
      { roomNumber: '107', block: 'Pratham', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'MECH', isActive: true },
      { roomNumber: '207', block: 'Pratham', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'MECH', isActive: true },
      { roomNumber: '309', block: 'Pratham', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'MECH', isActive: true },
      { roomNumber: '406', block: 'Pratham', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'MECH', isActive: true },

      // Aakash Block
      { roomNumber: '008', block: 'Aakash', floor: 0, rows: 6, cols: 4, capacity: 24, department: 'CIVIL', isActive: true },
      { roomNumber: '108', block: 'Aakash', floor: 1, rows: 6, cols: 4, capacity: 24, department: 'CIVIL', isActive: true },
      { roomNumber: '209', block: 'Aakash', floor: 2, rows: 6, cols: 4, capacity: 24, department: 'CIVIL', isActive: true },
      { roomNumber: '310', block: 'Aakash', floor: 3, rows: 6, cols: 4, capacity: 24, department: 'CIVIL', isActive: true },
      { roomNumber: '408', block: 'Aakash', floor: 4, rows: 6, cols: 4, capacity: 24, department: 'CIVIL', isActive: true },

      // Prashasan Block (Labs & Library)
      { roomNumber: 'Central Library', block: 'Prashasan', floor: 1, rows: 8, cols: 5, capacity: 40, department: 'Campus-Wide', isActive: true },
      ...Array.from({ length: 10 }, (_, i) => ({
        roomNumber: `Lab ${String(i + 1).padStart(2, '0')}`,
        block: 'Prashasan',
        floor: 0,
        rows: 6,
        cols: 4,
        capacity: 24,
        department: 'CSE-DS / CSE',
        isActive: true,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        roomNumber: `Lab ${String(i + 11).padStart(2, '0')}`,
        block: 'Prashasan',
        floor: 2,
        rows: 6,
        cols: 4,
        capacity: 24,
        department: 'ECE / EEE',
        isActive: true,
      })),

      // Nalandha Block (Auditorium & Admin)
      { roomNumber: 'Main Auditorium', block: 'Nalandha', floor: 0, rows: 10, cols: 6, capacity: 60, department: 'Campus-Wide', isActive: true },
    ];

    for (const item of defaultRoster) {
      const roomRef = doc(collection(db, 'exam_rooms'));
      batch.set(roomRef, {
        ...item,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  } catch (err) {
    console.error('Error seeding exam rooms:', err);
  }
}

/**
 * Filter rooms based on published timetables and exam room suitability.
 * 1. Excludes Labs & Central Library (written exams are conducted in classrooms only).
 * 2. Protects classrooms of non-exam years having active theory lectures.
 * 3. Releases classrooms if non-exam students are in 3-hour practical labs.
 */
export function filterAvailableRoomsByTimetable(rooms, schedules = [], targetExamYears = []) {
  // Step 1: Filter out Labs, Libraries, Auditorium, Prashasan & Nalandha blocks for written exams
  let usableRooms = rooms.filter(r => {
    const rNum = String(r.roomNumber || '').toLowerCase();
    const blk = String(r.block || '').toLowerCase();
    const isExcluded = rNum.includes('lab') ||
                       rNum.includes('library') ||
                       rNum.includes('auditorium') ||
                       r.isLab === true ||
                       blk === 'prashasan' ||
                       blk === 'nalandha';
    return !isExcluded;
  });

  if (!targetExamYears || targetExamYears.length === 0) return usableRooms;

  const targetYearsSet = new Set(targetExamYears.map(y => Number(y)));
  const occupiedClassrooms = new Set();
  const labClassrooms = new Set();

  schedules.forEach(sched => {
    const schedYear = Number(sched.year);
    // If this schedule belongs to a NON-exam year
    if (!targetYearsSet.has(schedYear)) {
      const assignedRoom = sched.room ? String(sched.room).replace(/^Room\s+/i, '').trim() : '';

      let hasLab = false;
      let hasTheory = false;

      if (sched.grid) {
        Object.keys(sched.grid).forEach(day => {
          (sched.grid[day] || []).forEach(slot => {
            if (slot && slot.type !== 'break' && slot.type !== 'lunch') {
              if (slot.type === 'lab' || (slot.subject && slot.subject.toLowerCase().includes('lab'))) {
                hasLab = true;
              } else {
                hasTheory = true;
              }
            }
          });
        });
      }

      if (assignedRoom) {
        if (hasLab && !hasTheory) {
          labClassrooms.add(assignedRoom);
        } else if (hasTheory) {
          occupiedClassrooms.add(assignedRoom);
        }
      }
    }
  });

  return usableRooms.map(r => {
    const rNum = String(r.roomNumber).replace(/^Room\s+/i, '').trim();
    const isConflict = occupiedClassrooms.has(rNum) && !labClassrooms.has(rNum);
    return {
      ...r,
      isTimetableConflict: isConflict,
      conflictReason: isConflict ? 'Occupied by Non-Exam Theory Class' : null,
    };
  });
}

export default {
  generateSeatingPlan,
  parseStudentCSV,
  seedDefaultExamRooms,
  filterAvailableRoomsByTimetable,
  EXAM_SESSIONS,
  EXAM_BLOCKS,
  EXAM_TYPES,
  REGULATION_OPTIONS,
};
