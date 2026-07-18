/**
 * TimetableGrid — High-fidelity VBIT spreadsheet rendering component.
 * 
 * Renders the complete timetable with:
 * - Institutional header (branding, department, section, room, date)
 * - Day × Period matrix with cell merging for labs (3-col span) and lunch blocks
 * - Color-coded cells: theory, lab, elective, lunch, free, training
 * - Two-column legend table below the grid
 */
import { WEEKDAYS } from '../../data/curriculumSeed';

export default function TimetableGrid({ 
  schedule, 
  timeConfig,
  showHeader = true,
  compact = false,
}) {
  if (!schedule || !schedule.grid) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No schedule data available.</p>
      </div>
    );
  }

  const { grid, legend, metadata } = schedule;
  const periods = timeConfig?.periods || [];

  return (
    <div id="timetable-render-container">
      {/* ── Institutional Header ── */}
      {showHeader && metadata && (
        <div style={{
          padding: compact ? '12px 16px' : '20px 24px',
          background: 'var(--bg-elevated)',
          borderBottom: '2px solid var(--accent-primary)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ 
                fontSize: compact ? '1rem' : '1.25rem', fontWeight: 800, 
                letterSpacing: '-0.02em', marginBottom: '4px' 
              }}>
                Vignana Bharathi Institute of Technology
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                (Approved by AICTE, Affiliated to JNTUH)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: compact ? '0.75rem' : '0.875rem', fontWeight: 700, 
                color: 'var(--accent-primary)' 
              }}>
                Department of {metadata.department}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex', gap: '24px', marginTop: '12px', flexWrap: 'wrap',
            fontSize: '0.813rem', color: 'var(--text-secondary)',
          }}>
            <span><strong>Regulation:</strong> {metadata.regulation}</span>
            <span><strong>Year:</strong> {metadata.year}</span>
            <span><strong>Section:</strong> {metadata.section}</span>
            {metadata.room && <span><strong>Room:</strong> {metadata.room}</span>}
            <span><strong>Effective:</strong> {metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      )}

      {/* ── Timetable Matrix ── */}
      <div className="timetable-container" style={{ borderRadius: showHeader ? '0 0 var(--radius-xl) var(--radius-xl)' : 'var(--radius-xl)' }}>
        <table className="timetable-grid" id="timetable-matrix">
          <thead>
            <tr>
              <th style={{ 
                minWidth: '90px', position: 'sticky', left: 0, 
                zIndex: 2, background: 'var(--bg-elevated)' 
              }}>
                Day / Period
              </th>
              {periods.map((p, i) => (
                <th key={i} style={{ fontSize: '0.688rem', minWidth: p.isBreak || p.isLunch ? '60px' : '100px' }}>
                  <div>{p.label}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {p.start}–{p.end}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => {
              const daySlots = grid[day] || [];
              const cells = [];
              let i = 0;

              while (i < daySlots.length) {
                const slot = daySlots[i];
                
                if (!slot) {
                  cells.push(
                    <td key={i} className="cell-free" style={{ fontSize: '0.75rem' }}>
                      —
                    </td>
                  );
                  i++;
                  continue;
                }

                // Determine span (for labs)
                let colspan = 1;
                if (slot.span && slot.span > 1) {
                  colspan = slot.span;
                } else if (slot.type === 'lab' && slot.span !== 0) {
                  // Check if next slots are the same lab
                  while (i + colspan < daySlots.length && 
                         daySlots[i + colspan]?.subjectCode === slot.subjectCode &&
                         daySlots[i + colspan]?.type === 'lab') {
                    colspan++;
                  }
                }

                // Skip continuation cells (span=0)
                if (slot.span === 0) {
                  i++;
                  continue;
                }

                const cellClass = slot.type === 'lab' ? 'cell-lab' :
                                  slot.type === 'elective' ? 'cell-elective' :
                                  slot.type === 'lunch' ? 'cell-lunch' :
                                  slot.type === 'break' ? 'cell-lunch' :
                                  slot.type === 'training' ? 'cell-training' :
                                  slot.type === 'theory' ? 'cell-theory' :
                                  slot.subjectCode ? 'cell-theory' : 'cell-free';

                cells.push(
                  <td 
                    key={i} 
                    colSpan={colspan} 
                    className={cellClass}
                    style={{
                      fontSize: compact ? '0.688rem' : '0.75rem',
                      fontWeight: slot.type === 'lab' || slot.type === 'lunch' ? 700 : 400,
                      position: 'relative',
                    }}
                  >
                    <div>
                      {slot.subjectCode || slot.subjectName || slot.label || '—'}
                    </div>
                    {slot.facultyName && (
                      <div style={{ 
                        fontSize: '0.625rem', color: 'inherit', opacity: 0.7, marginTop: '2px' 
                      }}>
                        {slot.facultyName}
                      </div>
                    )}
                    {slot.isSubstitution && (
                      <span style={{
                        position: 'absolute', top: '2px', right: '4px',
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: 'var(--accent-amber)', 
                      }} title="Substitution" />
                    )}
                    {slot.isRedistributed && (
                      <span style={{
                        position: 'absolute', top: '2px', right: '4px',
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: 'var(--accent-purple)', 
                      }} title="Redistributed" />
                    )}
                  </td>
                );

                i += colspan;
              }

              return (
                <tr key={day}>
                  <td style={{ 
                    fontWeight: 700, background: 'var(--bg-elevated)', 
                    position: 'sticky', left: 0, zIndex: 1,
                    fontSize: compact ? '0.75rem' : '0.813rem',
                  }}>
                    {day}
                  </td>
                  {cells}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Subject-Faculty Legend ── */}
      {legend && legend.length > 0 && (
        <div style={{
          marginTop: '16px', padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px' }}>
            Subject–Faculty Legend
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '6px',
          }}>
            {legend.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: '8px', alignItems: 'baseline',
                fontSize: '0.75rem', padding: '4px 0',
                borderBottom: '1px solid var(--border-primary)',
              }}>
                <span style={{ 
                  fontWeight: 600, color: 'var(--accent-blue)', 
                  minWidth: '80px', fontFamily: 'var(--font-mono)', 
                  fontSize: '0.688rem',
                }}>
                  {item.subjectCode}
                </span>
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                  {item.subjectName}
                </span>
                <span style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {item.facultyName}
                </span>
              </div>
            ))}
          </div>
          
          {/* Coordinator Signature Zone */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: '32px', paddingTop: '20px',
            borderTop: '1px solid var(--border-primary)',
          }}>
            {['Class Incharge', 'HOD', 'Principal'].map((title) => (
              <div key={title} style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ 
                  height: '1px', background: 'var(--text-muted)', marginBottom: '8px',
                  width: '120px', margin: '0 auto 8px',
                }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
