/**
 * ExamScheduler — NP-hard Graph-Coloring based exam scheduling engine.
 * 
 * Uses DSatur (Degree of Saturation) algorithm as primary, with Welsh-Powell fallback.
 * Models the exam scheduling problem as a graph coloring problem:
 *   - Vertices = Exams (courses)
 *   - Edges = Conflicts (shared students between courses)
 *   - Colors = Time slots
 * 
 * Maximizes room seating threshold utilization.
 */

/**
 * Build conflict graph from enrollment data.
 * 
 * @param {Array} exams - Array of { examId, courseCode, courseName, enrolledStudentIds[] }
 * @returns {Object} Adjacency list: { examId: Set<conflicting examId> }
 */
function buildConflictGraph(exams) {
  const graph = {};
  exams.forEach(e => { graph[e.examId] = new Set(); });

  // For each pair of exams, check if they share any enrolled students
  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      const studentsA = new Set(exams[i].enrolledStudentIds || []);
      const hasOverlap = (exams[j].enrolledStudentIds || []).some(s => studentsA.has(s));
      if (hasOverlap) {
        graph[exams[i].examId].add(exams[j].examId);
        graph[exams[j].examId].add(exams[i].examId);
      }
    }
  }

  return graph;
}

/**
 * DSatur Algorithm — Degree of Saturation graph coloring.
 * Generally produces better (fewer colors) results than greedy approaches.
 * 
 * @param {Object} graph - Adjacency list { nodeId: Set<neighborId> }
 * @returns {Object} Color assignment { nodeId: colorIndex }
 */
function dsaturColoring(graph) {
  const nodes = Object.keys(graph);
  const colors = {}; // nodeId -> colorIndex
  const saturation = {}; // nodeId -> Set of distinct colors used by neighbors
  const degree = {}; // nodeId -> number of neighbors

  nodes.forEach(n => {
    colors[n] = -1; // uncolored
    saturation[n] = new Set();
    degree[n] = graph[n].size;
  });

  for (let step = 0; step < nodes.length; step++) {
    // Select uncolored vertex with highest saturation degree
    // Ties broken by highest degree in uncolored subgraph
    let selected = null;
    let maxSat = -1;
    let maxDeg = -1;

    for (const node of nodes) {
      if (colors[node] !== -1) continue; // Already colored
      const sat = saturation[node].size;
      const deg = degree[node];
      if (sat > maxSat || (sat === maxSat && deg > maxDeg)) {
        maxSat = sat;
        maxDeg = deg;
        selected = node;
      }
    }

    if (selected === null) break;

    // Assign lowest available color
    const neighborColors = new Set();
    for (const neighbor of graph[selected]) {
      if (colors[neighbor] !== -1) {
        neighborColors.add(colors[neighbor]);
      }
    }

    let color = 0;
    while (neighborColors.has(color)) color++;
    colors[selected] = color;

    // Update saturation of uncolored neighbors
    for (const neighbor of graph[selected]) {
      if (colors[neighbor] === -1) {
        saturation[neighbor].add(color);
      }
    }
  }

  return colors;
}

/**
 * Welsh-Powell Algorithm — Greedy graph coloring (fallback).
 * Sorts vertices by degree descending and assigns colors greedily.
 * 
 * @param {Object} graph - Adjacency list
 * @returns {Object} Color assignment { nodeId: colorIndex }
 */
function welshPowellColoring(graph) {
  const nodes = Object.keys(graph);
  
  // Sort by degree descending
  nodes.sort((a, b) => graph[b].size - graph[a].size);
  
  const colors = {};
  let currentColor = 0;

  const uncolored = new Set(nodes);

  while (uncolored.size > 0) {
    const coloredThisRound = [];

    for (const node of nodes) {
      if (!uncolored.has(node)) continue;

      // Check if this node conflicts with any node colored this round
      const canColor = !coloredThisRound.some(colored => graph[node].has(colored));
      
      if (canColor) {
        colors[node] = currentColor;
        coloredThisRound.push(node);
        uncolored.delete(node);
      }
    }

    currentColor++;
  }

  return colors;
}

/**
 * Assign rooms to exam time slots based on seating capacity.
 * 
 * @param {Object} slotAssignment - { examId: slotIndex }
 * @param {Array} exams - Array of exam objects with enrollment counts
 * @param {Array} rooms - Array of { roomId, name, capacity }
 * @returns {Object} Room assignments { slotIndex: [{ examId, roomId, roomName, studentCount }] }
 */
function assignRooms(slotAssignment, exams, rooms) {
  // Group exams by slot
  const slots = {};
  for (const [examId, slotIndex] of Object.entries(slotAssignment)) {
    if (!slots[slotIndex]) slots[slotIndex] = [];
    const exam = exams.find(e => e.examId === examId);
    slots[slotIndex].push({
      examId,
      courseCode: exam?.courseCode,
      courseName: exam?.courseName,
      studentCount: exam?.enrolledStudentIds?.length || 0,
    });
  }

  // Sort rooms by capacity descending for greedy assignment
  const sortedRooms = [...rooms].sort((a, b) => b.capacity - a.capacity);

  const roomAssignments = {};
  for (const [slotIndex, slotExams] of Object.entries(slots)) {
    roomAssignments[slotIndex] = [];
    
    // Sort exams by student count descending (largest first)
    const sorted = slotExams.sort((a, b) => b.studentCount - a.studentCount);
    const usedRooms = new Set();

    for (const exam of sorted) {
      // Find a room that fits and isn't already used in this slot
      const room = sortedRooms.find(r => r.capacity >= exam.studentCount && !usedRooms.has(r.roomId));
      if (room) {
        usedRooms.add(room.roomId);
        roomAssignments[slotIndex].push({
          ...exam,
          roomId: room.roomId,
          roomName: room.name,
          roomCapacity: room.capacity,
          utilization: Math.round((exam.studentCount / room.capacity) * 100),
        });
      } else {
        roomAssignments[slotIndex].push({
          ...exam,
          roomId: null,
          roomName: 'UNASSIGNED',
          roomCapacity: 0,
          utilization: 0,
        });
      }
    }
  }

  return roomAssignments;
}

/**
 * Main exam scheduling function.
 * 
 * @param {Object} config
 * @param {Array} config.exams - Array of { examId, courseCode, courseName, enrolledStudentIds[] }
 * @param {Array} config.rooms - Array of { roomId, name, capacity }
 * @param {string} config.algorithm - 'dsatur' (default) or 'welsh-powell'
 * @returns {Object} Complete exam schedule
 */
export function generateExamSchedule({ exams, rooms, algorithm = 'dsatur' }) {
  if (!exams || exams.length === 0) {
    return { slots: {}, totalSlots: 0, roomAssignments: {}, errors: ['No exams provided'] };
  }

  // Build conflict graph
  const graph = buildConflictGraph(exams);

  // Apply graph coloring algorithm
  let colorAssignment;
  if (algorithm === 'welsh-powell') {
    colorAssignment = welshPowellColoring(graph);
  } else {
    colorAssignment = dsaturColoring(graph);
    // Fallback to Welsh-Powell if DSatur produces empty result
    if (Object.keys(colorAssignment).length === 0) {
      colorAssignment = welshPowellColoring(graph);
    }
  }

  // Count total time slots needed
  const totalSlots = Math.max(...Object.values(colorAssignment), -1) + 1;

  // Assign rooms
  const roomAssignments = assignRooms(colorAssignment, exams, rooms);

  // Build slot-to-exam mapping
  const slots = {};
  for (const [examId, slotIndex] of Object.entries(colorAssignment)) {
    if (!slots[slotIndex]) slots[slotIndex] = [];
    const exam = exams.find(e => e.examId === examId);
    slots[slotIndex].push({
      examId,
      courseCode: exam?.courseCode,
      courseName: exam?.courseName,
      enrollmentCount: exam?.enrolledStudentIds?.length || 0,
    });
  }

  // Verify: no student has overlapping exams
  const errors = [];
  for (const [slotIdx, slotExams] of Object.entries(slots)) {
    const studentsSeen = new Set();
    for (const exam of slotExams) {
      const fullExam = exams.find(e => e.examId === exam.examId);
      for (const studentId of (fullExam?.enrolledStudentIds || [])) {
        if (studentsSeen.has(studentId)) {
          errors.push(`Student ${studentId} has overlapping exams in slot ${slotIdx}`);
        }
        studentsSeen.add(studentId);
      }
    }
  }

  return {
    colorAssignment,
    slots,
    totalSlots,
    roomAssignments,
    algorithm: algorithm === 'welsh-powell' ? 'Welsh-Powell' : 'DSatur',
    examCount: exams.length,
    errors,
    summary: {
      totalExams: exams.length,
      totalSlots,
      totalRooms: rooms.length,
      conflictsResolved: Object.values(graph).reduce((sum, neighbors) => sum + neighbors.size, 0) / 2,
    },
  };
}

export default { generateExamSchedule, buildConflictGraph, dsaturColoring, welshPowellColoring };
