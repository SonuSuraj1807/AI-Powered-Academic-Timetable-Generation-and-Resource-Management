/**
 * Curriculum Registry Seed Data — Complete R25 and R22 regulation course definitions.
 * 
 * Supports multi-department architecture. Currently seeded with CSE-DS (Data Science).
 * Add additional departments by extending the DEPARTMENTS and CURRICULUM arrays.
 * 
 * Structure: { code, name, type, credits, regulation, year, semester, department, peGroup? }
 */

// ═══════════════════════════════════════════
// DEPARTMENT DEFINITIONS
// ═══════════════════════════════════════════
export const DEPARTMENTS = [
  { id: 'CSE-DS', name: 'CSE - Data Science', code: 'DS' },
  { id: 'CSE', name: 'Computer Science & Engineering', code: 'CS' },
  { id: 'ECE', name: 'Electronics & Communication Engineering', code: 'EC' },
  { id: 'EEE', name: 'Electrical & Electronics Engineering', code: 'EE' },
  { id: 'MECH', name: 'Mechanical Engineering', code: 'ME' },
  { id: 'CIVIL', name: 'Civil Engineering', code: 'CE' },
  { id: 'IT', name: 'Information Technology', code: 'IT' },
  { id: 'AI-ML', name: 'CSE - AI & Machine Learning', code: 'AM' },
];

// ═══════════════════════════════════════════
// REGULATION DEFINITIONS
// ═══════════════════════════════════════════
export const REGULATIONS = [
  { id: 'R25', name: 'R25 Regulations', years: [1, 2], description: '1st & 2nd Year batches' },
  { id: 'R22', name: 'R22 Regulations', years: [3, 4], description: '3rd & 4th Year batches' },
];

// ═══════════════════════════════════════════
// TIME SLOT DEFINITIONS (Staggered Lunch)
// ═══════════════════════════════════════════
export const TIME_SLOTS = {
  R25: {
    label: 'R25 (Juniors)',
    periods: [
      { id: 1, start: '09:00', end: '10:00', label: 'Period 1' },
      { id: 2, start: '10:00', end: '11:00', label: 'Period 2' },
      { id: 3, start: '11:00', end: '11:20', label: 'Break', isBreak: true },
      { id: 4, start: '11:20', end: '12:20', label: 'Period 3' },
      { id: 5, start: '12:20', end: '01:10', label: 'Lunch', isLunch: true },
      { id: 6, start: '01:10', end: '02:10', label: 'Period 4' },
      { id: 7, start: '02:10', end: '03:10', label: 'Period 5' },
      { id: 8, start: '03:10', end: '04:10', label: 'Period 6' },
    ],
    lunchSlot: { start: '12:20', end: '01:10' },
  },
  R22: {
    label: 'R22 (Seniors)',
    periods: [
      { id: 1, start: '09:00', end: '10:00', label: 'Period 1' },
      { id: 2, start: '10:00', end: '11:00', label: 'Period 2' },
      { id: 3, start: '11:00', end: '11:20', label: 'Break', isBreak: true },
      { id: 4, start: '11:20', end: '12:20', label: 'Period 3' },
      { id: 5, start: '12:20', end: '01:10', label: 'Period 4' },
      { id: 6, start: '01:10', end: '01:50', label: 'Lunch', isLunch: true },
      { id: 7, start: '01:50', end: '02:50', label: 'Period 5' },
      { id: 8, start: '02:50', end: '03:50', label: 'Period 6' },
    ],
    lunchSlot: { start: '01:10', end: '01:50' },
  },
};

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ═══════════════════════════════════════════
// R25 CURRICULUM — 1st & 2nd Year
// ═══════════════════════════════════════════
export const CURRICULUM_R25 = [
  // ─── I Year I Semester ───
  { code: '25BS1111', name: 'Matrices and Calculus', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25BS1112', name: 'Engineering Chemistry', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25EC1111', name: 'Electronic Devices and Circuits', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25EE1112', name: 'Basic Electrical Engineering', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25CS1111', name: 'Programming for Problem Solving', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25BS1152', name: 'Chemistry Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25CS1151', name: 'PPS Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25IT1151', name: 'IT Workshop', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25EE1151', name: 'BEE Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },
  { code: '25ME1152', name: 'Engineering Workshop', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 1, department: 'CSE-DS' },

  // ─── I Year II Semester ───
  { code: '25BS1211', name: 'ODE & Vector Calculus', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25BS1213', name: 'Advanced Physics', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25ME1251', name: 'Engineering Graphics', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25HS1212', name: 'English for Skill Enhancement', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25CS1211', name: 'Data Structures', type: 'theory', credits: 3, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25BS1253', name: 'Physics Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25CS1251', name: 'Data Structures Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25CS1252', name: 'Python Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },
  { code: '25HS1252', name: 'English Communication Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 1, semester: 2, department: 'CSE-DS' },

  // ─── II Year I Semester ───
  { code: '25BS2113', name: 'Math & Statistical Foundations', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2112', name: 'COA', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2113', name: 'OOP through Java', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2114', name: 'Operating Systems', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2115', name: 'DBMS', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25BS2151', name: 'Computational Math Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2151', name: 'Java Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2152', name: 'OS Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25CS2153', name: 'DBMS Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },
  { code: '25DS2151', name: 'NodeJs/React/Django Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 1, department: 'CSE-DS' },

  // ─── II Year II Semester ───
  { code: '25DS2211', name: 'Discrete Mathematics', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2211', name: 'DAA', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2212', name: 'Software Engineering', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2213', name: 'Computer Networks', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2214', name: 'Machine Learning', type: 'theory', credits: 3, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25HS2211', name: 'Innovation & Entrepreneurship', type: 'theory', credits: 2, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2251', name: 'SE Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2252', name: 'CN Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25CS2253', name: 'ML Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25DS2251', name: 'Data Visualization Lab', type: 'lab', credits: 1.5, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
  { code: '25MC0003', name: 'Indian Knowledge System', type: 'theory', credits: 0, regulation: 'R25', year: 2, semester: 2, department: 'CSE-DS' },
];

// ═══════════════════════════════════════════
// R22 CURRICULUM — 3rd & 4th Year
// ═══════════════════════════════════════════
export const CURRICULUM_R22 = [
  // ─── III Year I Semester ───
  { code: '22CS3111', name: 'DAA', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22DS3111', name: 'Fundamentals of Data Science', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22DS3112', name: 'DevOps', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22MC0005', name: 'IPR', type: 'theory', credits: 0, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  // PE-I Options
  { code: '22AM3173', name: 'Image Processing', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-I' },
  { code: '22CS3171', name: 'Computer Graphics', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-I' },
  { code: '22DS3171', name: 'DWDM', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-I' },
  // PE-II Options
  { code: '22DS3172', name: 'CN', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-II' },
  { code: '22DS3173', name: 'SPM', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-II' },
  { code: '22DS3174', name: 'AI', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-II' },
  { code: '22DS3175', name: 'Spatial & Multimedia DB', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-II' },
  { code: '22DS3176', name: 'CV & Robotics', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS', peGroup: 'PE-II' },
  // Labs
  { code: '22DS3151', name: 'R Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22DS3152', name: 'DevOps Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22HS3151', name: 'Advanced English Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },
  { code: '22DS3153', name: 'Talend Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 1, department: 'CSE-DS' },

  // ─── III Year II Semester ───
  { code: '22IT3211', name: 'Compiler Design', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22DS3211', name: 'Big Data Analytics', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22CS3211', name: 'ML', type: 'theory', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  // PE-III Options
  { code: '22CS3271', name: 'Scripting Languages', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS', peGroup: 'PE-III' },
  { code: '22DS3271', name: 'Web Technologies', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS', peGroup: 'PE-III' },
  { code: '22DS3272', name: 'Data Visualization Techniques', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS', peGroup: 'PE-III' },
  { code: '22DS3273', name: 'Cryptography', type: 'elective', credits: 3, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS', peGroup: 'PE-III' },
  // Labs
  { code: '22DS3251', name: 'ML Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22DS3252', name: 'Big Data Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22DS3253', name: 'Flutter Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22MC0002', name: 'Environmental Science', type: 'theory', credits: 0, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },
  { code: '22DS3281', name: 'Mini Project', type: 'lab', credits: 2, regulation: 'R22', year: 3, semester: 2, department: 'CSE-DS' },

  // ─── IV Year I Semester ───
  { code: '22DS4111', name: 'Neural Networks & Deep Learning', type: 'theory', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },
  { code: '22DS4112', name: 'Web & Social Media Analytics', type: 'theory', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },
  // PE-IV Options
  { code: '22DS4171', name: 'Cloud Computing', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-IV' },
  { code: '22DS4172', name: 'Database Security', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-IV' },
  { code: '22DS4173', name: 'IoT', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-IV' },
  { code: '22DS4174', name: 'Data Science Applications', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-IV' },
  // PE-V Options
  { code: '22AM4175', name: 'Quantum Computing', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-V' },
  { code: '22DS4175', name: 'Privacy Preserving', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-V' },
  { code: '22DS4176', name: 'Mining Massive Datasets', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-V' },
  { code: '22DS4177', name: 'EDA', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS', peGroup: 'PE-V' },
  // Labs & Projects
  { code: '22DS4151', name: 'Deep Learning Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },
  { code: '22DS4152', name: 'Web Analytics Lab', type: 'lab', credits: 1.5, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },
  { code: '22DS4181', name: 'Internship', type: 'theory', credits: 2, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },
  { code: '22DS4182', name: 'Project Stage-I', type: 'lab', credits: 2, regulation: 'R22', year: 4, semester: 1, department: 'CSE-DS' },

  // ─── IV Year II Semester ───
  { code: '22MB4211', name: 'Organizational Behavior', type: 'theory', credits: 3, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS' },
  // PE-VI Options
  { code: '22DS4271', name: 'Data Stream Mining', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS', peGroup: 'PE-VI' },
  { code: '22DS4272', name: 'Web Security', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS', peGroup: 'PE-VI' },
  { code: '22DS4273', name: 'Video Analytics', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS', peGroup: 'PE-VI' },
  { code: '22DS4274', name: 'Blockchain', type: 'elective', credits: 3, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS', peGroup: 'PE-VI' },
  { code: '22DS4281', name: 'Project Stage-II & Seminar', type: 'lab', credits: 10, regulation: 'R22', year: 4, semester: 2, department: 'CSE-DS' },
];

// ═══════════════════════════════════════════
// COMBINED CURRICULUM
// ═══════════════════════════════════════════
export const ALL_CURRICULUM = [...CURRICULUM_R25, ...CURRICULUM_R22];

/**
 * Get curriculum filtered by parameters.
 */
export function getCurriculum({ regulation, year, semester, department, type } = {}) {
  return ALL_CURRICULUM.filter(c => {
    if (regulation && c.regulation !== regulation) return false;
    if (year && c.year !== year) return false;
    if (semester && c.semester !== semester) return false;
    if (department && c.department !== department) return false;
    if (type && c.type !== type) return false;
    return true;
  });
}

/**
 * Get elective groups for a specific year/semester/regulation.
 */
export function getElectiveGroups({ regulation, year, semester, department } = {}) {
  const electives = getCurriculum({ regulation, year, semester, department, type: 'elective' });
  const groups = {};
  electives.forEach(e => {
    if (!groups[e.peGroup]) groups[e.peGroup] = [];
    groups[e.peGroup].push(e);
  });
  return groups;
}

/**
 * Get sections array based on year (typical VBIT sizing)
 */
export function getSections(department, year) {
  // Default section counts; can be overridden per department
  const defaults = { 1: ['A', 'B', 'C'], 2: ['A', 'B', 'C'], 3: ['A', 'B'], 4: ['A', 'B'] };
  return defaults[year] || ['A'];
}
