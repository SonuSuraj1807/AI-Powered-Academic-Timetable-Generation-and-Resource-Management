/**
 * Excel Export Service — Enterprise Excel export using ExcelJS.
 * 
 * Generates a pixel-perfect Excel replication of the web timetable grid
 * with cell merging for labs, bold fonts, contextual color fills, and legend table.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { WEEKDAYS, getShortName } from '../../data/curriculumSeed';

const COLORS = {
  header: 'FF1A2040',
  headerFont: 'FFFFFFFF',
  theory: 'FFEEF2FF',
  lab: 'FFDBEAFE',
  elective: 'FFD1FAE5',
  lunch: 'FFFEF3C7',
  training: 'FFEDE9FE',
  free: 'FFF1F5F9',
  border: 'FFD1D5DB',
  accent: 'FFE8522E',
  white: 'FFFFFFFF',
};

/**
 * Export a timetable schedule to Excel (.xlsx) file.
 * 
 * @param {Object} schedule - { grid, legend, metadata }
 * @param {Object} timeConfig - Time slot configuration
 * @param {string} filename - Output filename (without extension)
 */
export async function exportToExcel(schedule, timeConfig, filename = 'timetable') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VBIT Timetable System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Timetable', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
  });

  const { grid, legend, metadata } = schedule;
  const periods = timeConfig?.periods || [];
  let rowIdx = 1;

  // ── Institution Header ──
  ws.mergeCells(rowIdx, 1, rowIdx, periods.length + 1);
  const titleCell = ws.getCell(rowIdx, 1);
  titleCell.value = 'Vignana Bharathi Institute of Technology';
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowIdx).height = 30;
  rowIdx++;

  // Subtitle
  ws.mergeCells(rowIdx, 1, rowIdx, periods.length + 1);
  const subtitleCell = ws.getCell(rowIdx, 1);
  subtitleCell.value = `Department of ${metadata?.department || 'N/A'} | ${metadata?.regulation || ''} | Year ${metadata?.year || ''} | Section ${metadata?.section || ''} | Room: ${metadata?.room || 'N/A'}`;
  subtitleCell.font = { size: 10, color: { argb: 'FF94A3B8' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowIdx).height = 22;
  rowIdx++;

  // Empty row
  rowIdx++;

  // ── Period Headers ──
  const headerRow = ws.getRow(rowIdx);
  ws.getCell(rowIdx, 1).value = 'Day / Period';
  ws.getCell(rowIdx, 1).font = { bold: true, size: 10 };
  ws.getCell(rowIdx, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  ws.getCell(rowIdx, 1).font = { bold: true, size: 10, color: { argb: COLORS.headerFont } };
  ws.getColumn(1).width = 14;

  periods.forEach((p, i) => {
    const cell = ws.getCell(rowIdx, i + 2);
    cell.value = `${p.label}\n${p.start}-${p.end}`;
    cell.font = { bold: true, size: 8, color: { argb: COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getColumn(i + 2).width = p.isBreak || p.isLunch ? 10 : 16;
  });
  headerRow.height = 32;
  rowIdx++;

  // ── Day Rows ──
  for (const day of WEEKDAYS) {
    const daySlots = grid[day] || [];
    const dayRow = ws.getRow(rowIdx);
    
    // Day name cell
    const dayCell = ws.getCell(rowIdx, 1);
    dayCell.value = day;
    dayCell.font = { bold: true, size: 10 };
    dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' };

    let colIdx = 2;
    let slotIdx = 0;

    while (slotIdx < daySlots.length) {
      const slot = daySlots[slotIdx];
      
      if (!slot) {
        const cell = ws.getCell(rowIdx, colIdx);
        cell.value = '—';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.free } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        colIdx++;
        slotIdx++;
        continue;
      }

      // Skip continuation cells
      if (slot.span === 0) {
        slotIdx++;
        continue;
      }

      let colspan = 1;
      if (slot.span && slot.span > 1) {
        colspan = slot.span;
      }

      // Merge cells if needed
      if (colspan > 1) {
        ws.mergeCells(rowIdx, colIdx, rowIdx, colIdx + colspan - 1);
      }

      const cell = ws.getCell(rowIdx, colIdx);
      const displayVal = slot.label || (slot.subjectName ? getShortName(slot.subjectName) : '') || slot.subjectCode || '—';
      cell.value = displayVal;
      if (slot.facultyName) {
        cell.value = `${cell.value}\n(${slot.facultyName})`;
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.font = { 
        size: 9, 
        bold: slot.type === 'lab' || slot.type === 'lunch',
      };

      // Color fills
      const colorKey = slot.type || 'theory';
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: COLORS[colorKey] || COLORS.theory },
      };

      colIdx += colspan;
      slotIdx += colspan;
    }

    dayRow.height = 36;
    rowIdx++;
  }

  // ── Apply borders to all data cells ──
  for (let r = 4; r <= rowIdx; r++) {
    for (let c = 1; c <= periods.length + 1; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    }
  }

  // ── Legend Table ──
  rowIdx += 2;
  ws.mergeCells(rowIdx, 1, rowIdx, 3);
  const legendTitle = ws.getCell(rowIdx, 1);
  legendTitle.value = 'Subject–Faculty Legend';
  legendTitle.font = { bold: true, size: 11 };
  rowIdx++;

  // Legend headers
  ['Subject Code', 'Subject Name', 'Faculty Name'].forEach((header, i) => {
    const cell = ws.getCell(rowIdx, i + 1);
    cell.value = header;
    cell.font = { bold: true, size: 9, color: { argb: COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  });
  rowIdx++;

  if (legend) {
    for (const item of legend) {
      ws.getCell(rowIdx, 1).value = item.subjectCode;
      ws.getCell(rowIdx, 1).font = { size: 9, bold: true };
      ws.getCell(rowIdx, 2).value = item.subjectName;
      ws.getCell(rowIdx, 2).font = { size: 9 };
      ws.getCell(rowIdx, 3).value = item.facultyName;
      ws.getCell(rowIdx, 3).font = { size: 9 };

      for (let c = 1; c <= 3; c++) {
        ws.getCell(rowIdx, c).border = {
          top: { style: 'thin', color: { argb: COLORS.border } },
          left: { style: 'thin', color: { argb: COLORS.border } },
          bottom: { style: 'thin', color: { argb: COLORS.border } },
          right: { style: 'thin', color: { argb: COLORS.border } },
        };
      }
      rowIdx++;
    }
  }

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
}

export default { exportToExcel };
