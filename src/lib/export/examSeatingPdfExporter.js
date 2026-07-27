/**
 * Exam Seating PDF Exporter — VBIT-compliant A4 portrait seating plan sheets.
 *
 * Generates official examination seating plans matching the institutional format:
 * - Header: Institution name, exam title, subject info, date/session/room/block/floor
 * - Body: 4×6 grid showing Hall Ticket No + Branch-Year-Sem per cell
 * - Footer: Absentee note, counters, invigilator signatures (1 or 2), CoE signature
 *
 * Uses jsPDF + jspdf-autotable (already in project dependencies).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════
// SINGLE ROOM PDF
// ═══════════════════════════════════════════════════════════

/**
 * Render a single room's seating plan as one A4 portrait page.
 *
 * @param {jsPDF} doc – jsPDF document instance
 * @param {Object} roomPlan – { room, grid[][], branches[], branchCount, studentCount, assignedInvigilators[], totalRegistered }
 * @param {Object} sessionInfo – { date, session, examTitle, examType, subjects }
 * @param {boolean} addPage – Whether to add a new page before rendering
 */
function renderRoomPage(doc, roomPlan, sessionInfo, addPage = false) {
  if (addPage) doc.addPage();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let cursorY = margin;

  const { room, grid, branches, branchCount, studentCount, assignedInvigilators } = roomPlan;

  // ── Institution Header ──
  doc.setFillColor(26, 32, 64);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 9, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('(Approved by AICTE, Affiliated to JNTUH, Hyderabad)', pageWidth / 2, 14, { align: 'center' });
  doc.text('Aushapur(V), Ghatkesar(M), Medchal-Malkajgiri(Dist) - 501301, Telangana', pageWidth / 2, 18.5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('SEATING PLAN', pageWidth / 2, 26, { align: 'center' });

  // Underline
  doc.setDrawColor(232, 82, 46);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 25, 28, pageWidth / 2 + 25, 28);

  cursorY = 36;

  // ── Exam Info Lines ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(sessionInfo.examTitle || 'Examination', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;

  // Subject line
  if (sessionInfo.subjects && sessionInfo.subjects.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    const subjectText = sessionInfo.subjects
      .map(s => `${s.code} - ${s.name} (${s.branches?.join(', ') || 'ALL'})`)
      .join(' | ');
    const lines = doc.splitTextToSize(subjectText, pageWidth - margin * 2);
    doc.text(lines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += lines.length * 3.5 + 2;
  }

  // Meta info row
  doc.setFontSize(8);
  const dateStr = sessionInfo.date || 'N/A';
  const sessionStr = sessionInfo.session === 'FN'
    ? 'FN (10:00 AM - 01:00 PM)'
    : 'AN (01:30 PM - 04:30 PM)';

  const metaLeft = `Date: ${dateStr}      Session: ${sessionStr}`;
  const metaRight = `Room: ${room.roomNumber}      Block: ${room.block}      Floor: ${room.floor ?? 'N/A'}`;

  doc.setFont(undefined, 'bold');
  doc.text(metaLeft, margin, cursorY);
  doc.text(metaRight, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 3;

  // Separator
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 4;

  // ── Branch Color Legend ──
  const branchColors = {};
  const colorPalette = [
    [219, 234, 254], // Blue
    [220, 252, 231], // Green
    [237, 233, 254], // Purple
    [254, 243, 199], // Amber
    [254, 226, 226], // Red
    [207, 250, 254], // Cyan
  ];
  branches.forEach((b, i) => {
    branchColors[b] = colorPalette[i % colorPalette.length];
  });

  // Column header labels
  const cols = room.cols || 4;
  const rows = room.rows || 6;
  const colLabels = [];
  for (let c = 0; c < cols; c++) {
    // Determine which branch occupies this column
    let colBranch = '—';
    for (let r = 0; r < rows; r++) {
      if (grid[r] && grid[r][c] && grid[r][c].branch) {
        colBranch = grid[r][c].branch;
        break;
      }
    }
    colLabels.push(`Col ${c + 1}\n(${colBranch})`);
  }

  // ── Build Seating Grid Table ──
  const tableHead = [['S.No', ...colLabels]];
  const tableBody = [];

  for (let r = 0; r < rows; r++) {
    const row = [String(r + 1)];
    for (let c = 0; c < cols; c++) {
      const cell = grid[r] && grid[r][c];
      if (cell) {
        row.push(`${cell.hallTicketNo}\n${cell.yearSem || cell.branch}`);
      } else {
        row.push('—');
      }
    }
    tableBody.push(row);
  }

  autoTable(doc, {
    startY: cursorY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
      lineColor: [180, 180, 190],
      lineWidth: 0.3,
      minCellHeight: 12,
    },
    headStyles: {
      fillColor: [26, 32, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        const r = data.row.index;
        const c = data.column.index - 1;
        const cell = grid[r] && grid[r][c];
        if (cell && cell.branch && branchColors[cell.branch]) {
          data.cell.styles.fillColor = branchColors[cell.branch];
        }
        if (!cell || data.cell.text[0] === '—') {
          data.cell.styles.fillColor = [245, 245, 248];
          data.cell.styles.textColor = [160, 160, 170];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  cursorY = doc.lastAutoTable.finalY + 6;

  // ── Footer Section ──
  // Absentee note
  doc.setFontSize(7);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Mark absent candidates with \'×\' and enter attendance details below.', margin, cursorY);
  cursorY += 6;

  // Counters
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const counterY = cursorY;
  doc.text(`Total Registered: ${studentCount}`, margin, counterY);
  doc.text('Absent: __________', margin + 55, counterY);
  doc.text('Present: __________', margin + 105, counterY);
  cursorY += 12;

  // ── Invigilator Signatures ──
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('Invigilator(s):', margin, cursorY);
  cursorY += 6;

  doc.setFont(undefined, 'normal');
  const invCount = assignedInvigilators?.length || 0;

  if (invCount >= 2) {
    // Two invigilator signature slots
    const leftX = margin + 10;
    const rightX = pageWidth / 2 + 10;

    // Invigilator 1
    doc.text(`1. ${assignedInvigilators[0]?.name || ''}`, leftX, cursorY);
    doc.setDrawColor(120, 120, 130);
    doc.line(leftX, cursorY + 12, leftX + 55, cursorY + 12);
    doc.setFontSize(6.5);
    doc.text('Signature', leftX + 15, cursorY + 16);

    // Invigilator 2
    doc.setFontSize(8);
    doc.text(`2. ${assignedInvigilators[1]?.name || ''}`, rightX, cursorY);
    doc.line(rightX, cursorY + 12, rightX + 55, cursorY + 12);
    doc.setFontSize(6.5);
    doc.text('Signature', rightX + 15, cursorY + 16);

    cursorY += 22;
  } else if (invCount === 1) {
    // Single invigilator
    doc.text(`1. ${assignedInvigilators[0]?.name || ''}`, margin + 10, cursorY);
    doc.setDrawColor(120, 120, 130);
    doc.line(margin + 10, cursorY + 12, margin + 75, cursorY + 12);
    doc.setFontSize(6.5);
    doc.text('Signature', margin + 30, cursorY + 16);
    cursorY += 22;
  } else {
    doc.text('1. ________________________________', margin + 10, cursorY);
    cursorY += 22;
  }

  // ── Controller of Examinations ──
  if (cursorY + 20 < pageHeight) {
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    const coeX = pageWidth - margin - 50;
    doc.setDrawColor(120, 120, 130);
    doc.line(coeX, cursorY, coeX + 50, cursorY);
    doc.text('Controller of Examinations', coeX - 5, cursorY + 5);
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Export a single room's seating plan as PDF.
 */
export function exportSingleRoomPDF(roomPlan, sessionInfo, filename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  renderRoomPage(doc, roomPlan, sessionInfo, false);
  doc.save(filename || `SeatingPlan_${roomPlan.room.block}_${roomPlan.room.roomNumber}.pdf`);
}

/**
 * Export all room seating plans as a multi-page PDF batch.
 */
export function exportBatchPDF(roomPlans, sessionInfo, filename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  roomPlans.forEach((plan, idx) => {
    renderRoomPage(doc, plan, sessionInfo, idx > 0);
  });
  const dateStr = sessionInfo.date ? sessionInfo.date.replace(/\//g, '-') : 'Exam';
  doc.save(filename || `SeatingPlan_${dateStr}_${sessionInfo.session || 'ALL'}.pdf`);
}

/**
 * Export invigilator duty roster as PDF.
 */
export function exportInvigilatorDutySheet(invigilatorSummary, sessionInfo, filename) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(26, 32, 64);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 9, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('INVIGILATION DUTY ROSTER', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`${sessionInfo.date || 'N/A'} — ${sessionInfo.session === 'FN' ? 'Forenoon' : 'Afternoon'}`, pageWidth / 2, 21, { align: 'center' });

  // Table
  const head = [['#', 'Faculty Name', 'Department', 'Designation', 'Room', 'Block']];
  const body = invigilatorSummary.map((inv, i) => [
    String(i + 1),
    inv.name,
    inv.department || '',
    inv.designation || '',
    inv.assignedRoom || 'N/A',
    inv.assignedBlock || 'N/A',
  ]);

  autoTable(doc, {
    startY: 30,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [26, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10 }, 1: { halign: 'left', cellWidth: 50 } },
    margin: { left: 12, right: 12 },
  });

  // Signature blocks
  const sigY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');

  const positions = [
    { label: 'HOD', x: pageWidth * 0.25 },
    { label: 'Controller of Examinations', x: pageWidth * 0.75 },
  ];
  positions.forEach(({ label, x }) => {
    doc.setDrawColor(150, 150, 150);
    doc.line(x - 30, sigY, x + 30, sigY);
    doc.text(label, x, sigY + 5, { align: 'center' });
  });

  doc.save(filename || `InvigilationDuty_${sessionInfo.date || 'Exam'}_${sessionInfo.session || 'ALL'}.pdf`);
}

export default {
  exportSingleRoomPDF,
  exportBatchPDF,
  exportInvigilatorDutySheet,
};
