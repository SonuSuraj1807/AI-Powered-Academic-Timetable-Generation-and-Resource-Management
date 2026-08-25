/**
 * Exam Seating PDF Exporter — Official VBIT-compliant A4 portrait seating plan sheets.
 *
 * Generates official examination seating plans matching Vignana Bharathi Institute of Technology template:
 * - File Name Format: [DD-MM-YYYY] [FN/AN] ([BRANCH_LIST]) SEETING PLAN.pdf
 *   (e.g., 21-08-2026 AN (EEE,CSE,IT,CSD) SEETING PLAN.pdf)
 * - Header: Institutional logo box, SEATING PLAN title, B.Tech Year/Sem/Regulation subheader
 * - Metadata Lines: Subject (Branch), Date, Room (Block-Floor-Room), Session
 * - Body: 4-Column × 6-Row Grid of 24 individual seat boxes (HallTicketNo bold + Branch-Year-Sem)
 * - Footer: Absentee note, Attendance Summary Table (Registered, Absent, Present), Invigilator & CoE signatures
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format date into DD-MM-YYYY
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '01-01-2026';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.replace(/\//g, '-');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper to format date into DD/MM/YYYY
function formatDateDDMMYYYYSlash(dateStr) {
  if (!dateStr) return '01/01/2026';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Render a single room's seating plan matching VBIT official PDF layout.
 */
function renderRoomPage(doc, roomPlan, sessionInfo, addPage = false) {
  if (addPage) doc.addPage();

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 12;

  const { room, grid, branches, studentCount, assignedInvigilators } = roomPlan;

  // ── 1. Top Header Box & Title ──
  // Outer header box
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.rect(margin, 10, pageWidth - margin * 2, 22);

  // Logo Icon Simulation (Orange/Yellow Box on Left)
  doc.setFillColor(238, 108, 43);
  doc.rect(margin + 2, 12, 18, 18, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.circle(margin + 11, 21, 5);

  // Title Text inside box
  doc.setTextColor(15, 83, 62); // Institutional Dark Teal/Green
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('VIGNANA BHARATHI', margin + 24, 18);
  doc.setFontSize(14);
  doc.text('Institute of Technology', margin + 24, 26);

  // SEATING PLAN Header
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SEATING PLAN', pageWidth / 2, 38, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 20, 39, pageWidth / 2 + 20, 39);

  // Examination Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const examSub = sessionInfo.examTitle || 'B.Tech IV YEAR I SEMESTER (R22) Descriptive1 Examinations';
  doc.text(examSub, pageWidth / 2, 45, { align: 'center' });

  // ── 2. Two-Column Metadata Section ──
  let cursorY = 52;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  // Subjects label
  const subjectList = sessionInfo.subjects && sessionInfo.subjects.length > 0
    ? sessionInfo.subjects.map(s => `${s.name} (${s.code})`).join(', ')
    : (branches && branches.length > 0 ? `${branches.join(', ')}` : 'ALL');

  const subjectStr = `Subject : ${subjectList}`;
  const dateStr = `Date : ${formatDateDDMMYYYYSlash(sessionInfo.date)}`;

  // Room string
  const blockName = (room.block || 'AVISHKAR').toUpperCase();
  const floorName = room.floor === 0 ? 'GROUND FLOOR' : room.floor === 1 ? 'FIRST FLOOR' : room.floor === 2 ? 'SECOND FLOOR' : `FLOOR-${room.floor}`;
  const roomStr = `Room : ${blockName} BLOCK-B-${floorName}-${room.roomNumber || '001'}`;

  const sessionTimeStr = sessionInfo.session === 'FN'
    ? 'Session : 10:00 AM - 01:00 PM'
    : 'Session : 02:00 PM - 04:30 PM';

  // Left Column
  doc.text(subjectStr, margin, cursorY);
  doc.text(dateStr, margin + 65, cursorY);

  // Right Column
  doc.text(roomStr, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 5;
  doc.text(sessionTimeStr, pageWidth - margin, cursorY, { align: 'right' });

  cursorY += 6;

  // ── 3. 24 Seat Box Grid (4 Columns × 6 Rows) ──
  const cols = room.cols || 4;
  const rows = room.rows || 6;
  const gridWidth = pageWidth - margin * 2;
  const boxGapX = 6;
  const boxGapY = 4;
  const boxWidth = (gridWidth - (cols - 1) * boxGapX) / cols;
  const boxHeight = 15;

  const startY = cursorY;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * (boxWidth + boxGapX);
      const y = startY + r * (boxHeight + boxGapY);

      // Draw Box Outer Border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.rect(x, y, boxWidth, boxHeight);

      const cell = grid[r] && grid[r][c];
      if (cell) {
        // Line 1: Hall Ticket Number (Bold)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(String(cell.hallTicketNo || ''), x + boxWidth / 2, y + 6, { align: 'center' });

        // Line 2: Branch & Year-Sem
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const branchLabel = cell.yearSem || `${cell.branch || 'CSE'} - Sem`;
        doc.text(branchLabel, x + boxWidth / 2, y + 11.5, { align: 'center' });
      }
    }
  }

  cursorY = startY + rows * (boxHeight + boxGapY) + 6;

  // ── 4. Footer Note & Attendance Summary Table ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Note : Cross the box containing the Hall Ticket number when the candidate absent', margin, cursorY);

  cursorY += 4;

  // Summary Table (3 Columns)
  const regCount = String(studentCount || 24);
  const head = [['Total No.of Students Registered', 'Total No.of Students Absent', 'Total No.of Students Present']];
  const body = [[regCount, '', '']];

  autoTable(doc, {
    startY: cursorY,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    margin: { left: margin, right: margin },
  });

  cursorY = doc.lastAutoTable.finalY + 16;

  // ── 5. Signatures Row ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Invigilator signature
  const invName = assignedInvigilators && assignedInvigilators.length > 0 ? assignedInvigilators[0].name : '';
  doc.text('Signature of the Invigilator', margin, cursorY);
  if (invName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`(${invName})`, margin, cursorY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
  }

  // Controller of Examinations signature
  doc.text('Signature of the Controller of Examinations', pageWidth - margin, cursorY, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Generate official filename matching: [DD-MM-YYYY] [FN/AN] ([BRANCH_LIST]) SEETING PLAN.pdf
 */
export function buildOfficialFilename(sessionInfo, roomPlans = []) {
  const dateStr = formatDateDDMMYYYY(sessionInfo?.date);
  const slotStr = sessionInfo?.session || 'FN';

  // Gather unique branches
  const branchSet = new Set();
  if (sessionInfo?.subjects) {
    sessionInfo.subjects.forEach(s => {
      if (Array.isArray(s.branches)) s.branches.forEach(b => branchSet.add(b));
    });
  }
  if (branchSet.size === 0 && roomPlans) {
    roomPlans.forEach(p => {
      if (Array.isArray(p.branches)) p.branches.forEach(b => branchSet.add(b));
    });
  }
  if (branchSet.size === 0) branchSet.add('CSE-DS');

  const branchList = Array.from(branchSet).join(',');
  return `${dateStr} ${slotStr} (${branchList}) SEETING PLAN.pdf`;
}

/**
 * Export single room PDF matching official VBIT layout.
 */
export function exportSingleRoomPDF(roomPlan, sessionInfo, customFilename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  renderRoomPage(doc, roomPlan, sessionInfo, false);
  const filename = customFilename || `Room_${roomPlan.room.roomNumber}_${buildOfficialFilename(sessionInfo, [roomPlan])}`;
  doc.save(filename);
}

/**
 * Export batch PDF containing all room seating plans matching official VBIT layout.
 */
export function exportBatchPDF(roomPlans, sessionInfo, customFilename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  roomPlans.forEach((plan, idx) => {
    renderRoomPage(doc, plan, sessionInfo, idx > 0);
  });
  const filename = customFilename || buildOfficialFilename(sessionInfo, roomPlans);
  doc.save(filename);
}

/**
 * Export invigilator duty roster as PDF.
 */
export function exportInvigilatorDutySheet(invigilatorSummary, sessionInfo, customFilename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 83, 62);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 9, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('EXAMINATION INVIGILATION DUTY ROSTER', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`${formatDateDDMMYYYYSlash(sessionInfo.date)} — ${sessionInfo.session === 'FN' ? 'Forenoon (10:00 AM - 01:00 PM)' : 'Afternoon (02:00 PM - 04:30 PM)'}`, pageWidth / 2, 21, { align: 'center' });

  const head = [['#', 'Faculty Name', 'Department', 'Designation', 'Assigned Room', 'Block']];
  const body = (invigilatorSummary || []).map((inv, i) => [
    String(i + 1),
    inv.name,
    inv.department || '',
    inv.designation || '',
    inv.assignedRoom || 'N/A',
    inv.assignedBlock || 'N/A',
  ]);

  autoTable(doc, {
    startY: 28,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: { fillColor: [15, 83, 62], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10 }, 1: { halign: 'left', cellWidth: 50 } },
    margin: { left: 12, right: 12 },
  });

  const sigY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  doc.text('Signature of HOD', 30, sigY);
  doc.text('Signature of Controller of Examinations', pageWidth - 30, sigY, { align: 'right' });

  const dateStr = formatDateDDMMYYYY(sessionInfo?.date);
  const filename = customFilename || `DutyRoster_${dateStr}_${sessionInfo?.session || 'FN'}.pdf`;
  doc.save(filename);
}

/**
 * Export official Student Attendance & Signature Roll Sheet for a specific room.
 */
export function exportRoomAttendanceSheet(roomPlan, sessionInfo, customFilename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const { room, grid, branches, assignedInvigilators } = roomPlan;
  let parsedGrid = grid;
  if (typeof parsedGrid === 'string') {
    try { parsedGrid = JSON.parse(parsedGrid); } catch (e) { parsedGrid = []; }
  }

  // Extract all seated students in roll number order
  const seatedStudents = [];
  if (Array.isArray(parsedGrid)) {
    for (let r = 0; r < parsedGrid.length; r++) {
      for (let c = 0; c < (parsedGrid[r]?.length || 0); c++) {
        const cell = parsedGrid[r][c];
        if (cell && cell.hallTicketNo) {
          seatedStudents.push({
            hallTicketNo: cell.hallTicketNo,
            branch: cell.branch || (branches && branches[0]) || 'CSE',
            yearSem: cell.yearSem || '',
            name: cell.name || 'Student',
            col: c + 1,
            row: r + 1,
          });
        }
      }
    }
  }
  // Sort students by Hall Ticket Number
  seatedStudents.sort((a, b) => a.hallTicketNo.localeCompare(b.hallTicketNo));

  // 1. Header Box
  doc.setDrawColor(15, 83, 62);
  doc.setLineWidth(0.8);
  doc.rect(margin, 8, pageWidth - margin * 2, 22);

  // Logo box
  doc.setFillColor(238, 108, 43);
  doc.rect(margin + 2, 10, 18, 18, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.circle(margin + 11, 19, 5);

  doc.setTextColor(15, 83, 62);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY', margin + 24, 16);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EXAMINATION BRANCH — STUDENT ATTENDANCE & SIGNATURE ROLL', margin + 24, 24);

  // 2. Exam Session Subtitle & Metadata
  let cursorY = 36;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  
  const examTitle = sessionInfo?.examTitle || 'B.Tech Regular/Supplementary Examinations';
  const blockName = (room?.block || 'AVISHKAR').toUpperCase();
  const roomLabel = `Room ${room?.roomNumber || '302'} (${blockName} Block)`;
  const dateLabel = `Date: ${formatDateDDMMYYYYSlash(sessionInfo?.date)} (${sessionInfo?.session || 'FN'})`;
  const timeLabel = sessionInfo?.session === 'FN' ? 'Time: 10:00 AM - 01:00 PM' : 'Time: 01:30 PM - 04:30 PM';

  doc.text(examTitle, margin, cursorY);
  doc.text(roomLabel, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 5;
  doc.text(dateLabel, margin, cursorY);
  doc.text(timeLabel, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 6;

  // 3. Attendance Table
  const head = [['#', 'Hall Ticket No', 'Student Name', 'Branch / Year', 'Answer Book No.', 'Student Signature']];
  const body = seatedStudents.map((s, idx) => [
    String(idx + 1),
    s.hallTicketNo,
    s.name,
    s.branch,
    '', // Blank for student to fill Answer Book Serial Number
    '', // Blank for Student Signature
  ]);

  autoTable(doc, {
    startY: cursorY,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3.5, halign: 'center', valign: 'middle', lineColor: [50, 50, 50], lineWidth: 0.3 },
    headStyles: { fillColor: [15, 83, 62], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 45, halign: 'left' },
      3: { cellWidth: 28 },
      4: { cellWidth: 35 },
      5: { cellWidth: 33 },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = Math.min(doc.lastAutoTable.finalY + 15, pageHeight - 20);
  
  // Invigilator Signature Section
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  const invNames = assignedInvigilators && assignedInvigilators.length > 0
    ? assignedInvigilators.map(i => i.name).join(', ')
    : 'Assigned Invigilator';

  doc.text(`Invigilator Name: ${invNames}`, margin, finalY);
  doc.text('Invigilator Signature: _______________________', pageWidth - margin, finalY, { align: 'right' });

  const dateStr = formatDateDDMMYYYY(sessionInfo?.date);
  const filename = customFilename || `Attendance_Room_${room?.roomNumber}_${dateStr}_${sessionInfo?.session || 'FN'}.pdf`;
  doc.save(filename);
}

export default {
  exportSingleRoomPDF,
  exportBatchPDF,
  exportInvigilatorDutySheet,
  exportRoomAttendanceSheet,
  buildOfficialFilename,
};
