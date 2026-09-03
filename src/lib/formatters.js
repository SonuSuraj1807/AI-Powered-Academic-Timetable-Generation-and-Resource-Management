/**
 * Utility functions for cleaning and formatting strings across the application,
 * preventing double wording issues like "Room Room 407", "Sec Sec A", "Year Year 4", "Block Block".
 */

export function cleanRoomNumber(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/^Room\s+/i, '').trim();
}

export function formatRoomName(val) {
  if (!val) return '';
  const clean = cleanRoomNumber(val);
  return clean ? `Room ${clean}` : '';
}

export function cleanSectionName(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/^Sec\s*/i, '').trim();
}

export function formatSectionName(val) {
  if (!val) return '';
  const clean = cleanSectionName(val);
  return clean ? `Sec ${clean}` : '';
}

export function cleanYearName(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/^(Year|Yr)\s*/i, '').trim();
}

export function formatYearName(val) {
  if (!val) return '';
  const clean = cleanYearName(val);
  return clean ? `Year ${clean}` : '';
}

export function cleanSemName(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/^Sem\s*/i, '').trim();
}

export function formatSemName(val) {
  if (!val) return '';
  const clean = cleanSemName(val);
  return clean ? `Sem ${clean}` : '';
}

export function cleanBlockName(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/\s+Block$/i, '').trim();
}

export function formatBlockName(val) {
  if (!val) return '';
  const clean = cleanBlockName(val);
  return clean ? `${clean} Block` : '';
}
