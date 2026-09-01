/**
 * SeatingSheetPreview — Visual in-browser preview of a single room's seating grid.
 *
 * Renders a 4×6 (or custom) grid matching the physical exam room layout
 * with branch-colored cells, invigilator tags, and stat counters.
 */
import { Building2, User, Users, Download, Printer } from 'lucide-react';

const BRANCH_COLORS = {
  'CSE': '#3B82F6',
  'CSE-DS': '#8B5CF6',
  'CSE-AIML': '#EC4899',
  'CSE-CS': '#06B6D4',
  'CSE-BS': '#14B8A6',
  'IT': '#10B981',
  'ECE': '#F59E0B',
  'EEE': '#EF4444',
  'MECH': '#F97316',
  'CIVIL': '#6366F1',
};

function getBranchColor(branch) {
  if (!branch) return '#64748B';
  // Try exact match first
  if (BRANCH_COLORS[branch]) return BRANCH_COLORS[branch];
  // Try partial match
  for (const [key, color] of Object.entries(BRANCH_COLORS)) {
    if (branch.includes(key) || key.includes(branch)) return color;
  }
  // Hash-based fallback
  let hash = 0;
  for (let i = 0; i < branch.length; i++) hash = branch.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * @param {Object} props
 * @param {Object} props.roomPlan – { room, grid[][], branches[], branchCount, studentCount, assignedInvigilators[] }
 * @param {Function} [props.onDownloadPDF] – Callback to trigger PDF export for this room
 * @param {boolean} [props.compact] – Render in compact mode for list views
 */
export default function SeatingSheetPreview({ roomPlan, onDownloadPDF, compact = false }) {
  if (!roomPlan) return null;

  const room = roomPlan.room || { roomNumber: 'N/A', block: 'Avishkar', floor: 0, rows: 6, cols: 4, capacity: 24 };
  let grid = roomPlan.grid || [];
  if (typeof grid === 'string') {
    try { grid = JSON.parse(grid); } catch (e) { grid = []; }
  }

  const branches = Array.isArray(roomPlan.branches) && roomPlan.branches.length > 0 ? roomPlan.branches : ['CSE-DS'];
  const assignedInvigilators = Array.isArray(roomPlan.assignedInvigilators) ? roomPlan.assignedInvigilators : [];
  const studentCount = roomPlan.studentCount || 0;
  const branchCount = roomPlan.branchCount || branches.length;

  const rows = room.rows || (grid.length > 0 ? grid.length : 6);
  const cols = room.cols || (grid[0] && grid[0].length ? grid[0].length : 4);

  const isDualSeatRoom = grid.some(r => r && r.some(c => c && (c.seat1 || c.seat2)));
  const baseBenches = room.capacity || (rows * cols) || 24;
  const effectiveCapacity = isDualSeatRoom ? baseBenches * 2 : baseBenches;
  const utilization = Math.min(100, Math.round((studentCount / effectiveCapacity) * 100));

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'all 250ms ease',
    }}>
      {/* Room Header */}
      <div style={{
        padding: compact ? '10px 14px' : '14px 18px',
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: `${getBranchColor(branches[0])}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={18} style={{ color: getBranchColor(branches[0]) }} />
          </div>
          <div>
            <div style={{ fontSize: '0.938rem', fontWeight: 800 }}>
              Room {room.roomNumber}
            </div>
            <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
              {room.block} • Floor {room.floor ?? '?'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Branch badges */}
          {branches.map(b => (
            <span key={b} style={{
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.688rem', fontWeight: 700,
              background: `${getBranchColor(b)}15`,
              color: getBranchColor(b),
              border: `1px solid ${getBranchColor(b)}30`,
            }}>
              {b}
            </span>
          ))}

          {/* Invigilator count badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '0.688rem', fontWeight: 700,
            background: branchCount >= 2 ? 'rgba(232,82,46,0.12)' : 'rgba(16,185,129,0.12)',
            color: branchCount >= 2 ? '#E8522E' : '#10B981',
          }}>
            {branchCount >= 2 ? <Users size={10} /> : <User size={10} />}
            {assignedInvigilators?.length || 0} Inv.
          </span>

          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              style={{
                padding: '5px 10px', borderRadius: '8px',
                background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)',
                fontSize: '0.688rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'all 150ms ease',
              }}
            >
              <Download size={12} /> PDF
            </button>
          )}
        </div>
      </div>

      {/* Seating Grid */}
      <div style={{ padding: compact ? '10px' : '16px', overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: compact ? '0.688rem' : '0.75rem',
        }}>
          <thead>
            <tr>
              <th style={{
                padding: '6px 8px', fontSize: '0.625rem', fontWeight: 700,
                color: 'var(--text-muted)', textAlign: 'center',
                borderBottom: '2px solid var(--border-secondary)',
                width: '30px',
              }}>
                #
              </th>
              {Array.from({ length: cols }, (_, c) => {
                // Get branch for this column
                let colBranch = '';
                for (let r = 0; r < rows; r++) {
                  if (grid[r] && grid[r][c] && grid[r][c].branch) {
                    colBranch = grid[r][c].branch;
                    break;
                  }
                }
                return (
                  <th key={c} style={{
                    padding: '6px 8px', textAlign: 'center',
                    fontSize: '0.625rem', fontWeight: 700,
                    color: getBranchColor(colBranch),
                    borderBottom: `2px solid ${getBranchColor(colBranch)}40`,
                  }}>
                    Col {c + 1}
                    {colBranch && <div style={{ fontSize: '0.563rem', opacity: 0.8 }}>({colBranch})</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td style={{
                  padding: '4px 6px', textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
                  color: 'var(--text-muted)', fontWeight: 700,
                  borderRight: '1px solid var(--border-primary)',
                }}>
                  {r + 1}
                </td>
                {Array.from({ length: cols }, (_, c) => {
                  const cell = grid[r] && grid[r][c];
                  const hasDualSeats = cell && (cell.seat1 || cell.seat2);

                  if (hasDualSeats) {
                    const s1 = cell.seat1;
                    const s2 = cell.seat2;
                    const c1 = s1 ? getBranchColor(s1.branch) : '#64748B';
                    const c2 = s2 ? getBranchColor(s2.branch) : '#64748B';

                    return (
                      <td key={c} style={{
                        padding: compact ? '3px 4px' : '5px 6px',
                        textAlign: 'center',
                        border: '1px solid var(--border-primary)',
                        background: 'rgba(255, 255, 255, 0.02)',
                      }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {/* Seat 1 (Left) */}
                          <div style={{
                            flex: 1, padding: '4px 3px', borderRadius: '5px',
                            background: s1 ? `${c1}15` : 'transparent',
                            border: `1px solid ${s1 ? `${c1}40` : 'transparent'}`,
                          }}>
                            {s1 ? (
                              <>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? '0.625rem' : '0.688rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {s1.hallTicketNo}
                                </div>
                                <div style={{ fontSize: '0.563rem', fontWeight: 700, color: c1 }}>
                                  {s1.branch}
                                </div>
                              </>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>—</span>}
                          </div>

                          {/* Seat 2 (Right) */}
                          <div style={{
                            flex: 1, padding: '4px 3px', borderRadius: '5px',
                            background: s2 ? `${c2}15` : 'transparent',
                            border: `1px solid ${s2 ? `${c2}40` : 'transparent'}`,
                          }}>
                            {s2 ? (
                              <>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? '0.625rem' : '0.688rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {s2.hallTicketNo}
                                </div>
                                <div style={{ fontSize: '0.563rem', fontWeight: 700, color: c2 }}>
                                  {s2.branch}
                                </div>
                              </>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>—</span>}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  const color = cell ? getBranchColor(cell.branch) : '#64748B';
                  return (
                    <td key={c} style={{
                      padding: compact ? '4px 6px' : '6px 8px',
                      textAlign: 'center',
                      border: '1px solid var(--border-primary)',
                      background: cell ? `${color}08` : 'var(--surface-glass)',
                      transition: 'background 150ms ease',
                    }}>
                      {cell ? (
                        <>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: compact ? '0.688rem' : '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '0.02em',
                          }}>
                            {cell.hallTicketNo}
                          </div>
                          <div style={{
                            fontSize: '0.563rem',
                            fontWeight: 600,
                            color,
                            marginTop: '2px',
                          }}>
                            {cell.yearSem || cell.branch}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: Invigilators & Stats */}
      <div style={{
        padding: compact ? '8px 14px' : '12px 18px',
        borderTop: '1px solid var(--border-primary)',
        background: 'var(--surface-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.688rem', color: 'var(--text-secondary)' }}>
          <span>Seated: <strong style={{ color: 'var(--text-primary)' }}>{studentCount}</strong></span>
          <span>Capacity: <strong style={{ color: 'var(--text-primary)' }}>{effectiveCapacity} Seats ({baseBenches} Benches)</strong></span>
          <span>
            Utilization: <strong style={{
              color: utilization >= 80 ? '#10B981' : '#F59E0B',
            }}>
              {utilization}%
            </strong>
          </span>
        </div>

        {/* Invigilators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(assignedInvigilators || []).map((inv, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-secondary)',
              fontSize: '0.688rem',
            }}>
              <User size={10} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontWeight: 600 }}>{inv.name}</span>
              {inv.designation && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.563rem' }}>({inv.designation})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
