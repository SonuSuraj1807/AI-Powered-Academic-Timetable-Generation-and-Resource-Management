/**
 * PDF Export Service — Enterprise PDF export using jsPDF + autoTable.
 * 
 * Generates high-resolution A4 landscape PDFs with:
 * - Institution header with branding
 * - Full timetable grid with merged lab cells
 * - Subject-faculty legend table
 * - Coordinator signature zones
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WEEKDAYS } from '../../data/curriculumSeed';

/**
 * Export timetable schedule to PDF.
 * 
 * @param {Object} schedule - { grid, legend, metadata }
 * @param {Object} timeConfig - Time slot configuration
 * @param {string} filename - Output filename (without extension)
 */
export function exportToPDF(schedule, timeConfig, filename = 'timetable') {
  const { grid, legend, metadata } = schedule;
  const periods = timeConfig?.periods || [];
  
  // Create landscape A4 PDF
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // ── Institution Header ──
  doc.setFillColor(26, 32, 64); // Dark navy
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Vignana Bharathi Institute of Technology', pageWidth / 2, 9, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('(Approved by AICTE, Affiliated to JNTUH)', pageWidth / 2, 14, { align: 'center' });

  // Metadata line
  const metaLine = `Department of ${metadata?.department || 'N/A'} | ${metadata?.regulation || ''} | Year ${metadata?.year || ''} | Section ${metadata?.section || ''} | Room: ${metadata?.room || 'N/A'} | Date: ${metadata?.generatedAt ? new Date(metadata.generatedAt).toLocaleDateString() : 'N/A'}`;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 200);
  doc.text(metaLine, pageWidth / 2, 19, { align: 'center' });

  // ── Build Table Data ──
  const headers = ['Day', ...periods.map(p => `${p.label}\n${p.start}-${p.end}`)];
  const body = [];

  for (const day of WEEKDAYS) {
    const daySlots = grid[day] || [];
    const row = [day];
    let slotIdx = 0;

    while (slotIdx < daySlots.length) {
      const slot = daySlots[slotIdx];
      
      if (!slot) {
        row.push('—');
        slotIdx++;
        continue;
      }

      // Skip continuation cells
      if (slot.span === 0) {
        slotIdx++;
        continue;
      }

      const label = slot.subjectCode || slot.subjectName || slot.label || '—';
      const content = slot.facultyName ? `${label}\n(${slot.facultyName})` : label;

      if (slot.span && slot.span > 1) {
        row.push({ content, colSpan: slot.span });
        slotIdx += slot.span;
      } else {
        row.push(content);
        slotIdx++;
      }
    }

    body.push(row);
  }

  // ── Render Timetable Table ──
  autoTable(doc, {
    startY: 25,
    head: [headers],
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      lineColor: [200, 200, 210],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [26, 32, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const cellText = String(data.cell.text).toLowerCase();
        if (cellText.includes('lunch')) {
          data.cell.styles.fillColor = [254, 243, 199]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (cellText.includes('lab') || cellText.includes('workshop')) {
          data.cell.styles.fillColor = [219, 234, 254]; // Blue
          data.cell.styles.fontStyle = 'bold';
        } else if (cellText.includes('training')) {
          data.cell.styles.fillColor = [237, 233, 254]; // Purple
          data.cell.styles.fontStyle = 'bold';
        } else if (cellText === '—') {
          data.cell.styles.fillColor = [241, 245, 249]; // Gray
          data.cell.styles.textColor = [148, 163, 184];
        } else if (cellText === 'break') {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    },
    margin: { left: 10, right: 10 },
  });

  // ── Legend Table ──
  const legendY = doc.lastAutoTable.finalY + 8;
  
  if (legend && legend.length > 0 && legendY + 20 < pageHeight) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Subject–Faculty Legend', 10, legendY);

    const legendHeaders = ['Subject Code', 'Subject Name', 'Faculty Name'];
    const legendBody = legend.map(item => [
      item.subjectCode,
      item.subjectName,
      item.facultyName,
    ]);

    autoTable(doc, {
      startY: legendY + 3,
      head: [legendHeaders],
      body: legendBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Coordinator Signatures ──
    const sigY = doc.lastAutoTable.finalY + 15;
    if (sigY + 10 < pageHeight) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      
      const sigPositions = [
        { label: 'Class Incharge', x: pageWidth * 0.2 },
        { label: 'HOD', x: pageWidth * 0.5 },
        { label: 'Principal', x: pageWidth * 0.8 },
      ];

      sigPositions.forEach(({ label, x }) => {
        doc.setDrawColor(150, 150, 150);
        doc.line(x - 25, sigY, x + 25, sigY);
        doc.text(label, x, sigY + 5, { align: 'center' });
      });
    }
  }

  // ── Save ──
  doc.save(`${filename}.pdf`);
}

export default { exportToPDF };
