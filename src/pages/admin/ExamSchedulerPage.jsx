/**
 * ExamSchedulerPage — Graph-coloring exam scheduling interface.
 * Demonstrates DSatur/Welsh-Powell algorithm for conflict-free exam scheduling.
 */
import { useState } from 'react';
import { CalendarCheck, Sparkles, Loader2, Building2, Check, AlertTriangle } from 'lucide-react';
import { generateExamSchedule } from '../../lib/scheduling/ExamScheduler';

// Demo exam data
const DEMO_EXAMS = [
  { examId: 'E1', courseCode: '22DS4111', courseName: 'Neural Networks & Deep Learning', enrolledStudentIds: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'] },
  { examId: 'E2', courseCode: '22DS4112', courseName: 'Web & Social Media Analytics', enrolledStudentIds: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'] },
  { examId: 'E3', courseCode: '22DS4171', courseName: 'Cloud Computing', enrolledStudentIds: ['S1','S3','S5','S7','S9','S11','S12'] },
  { examId: 'E4', courseCode: '22DS4175', courseName: 'Privacy Preserving', enrolledStudentIds: ['S2','S4','S6','S8','S10','S13','S14'] },
  { examId: 'E5', courseCode: '22DS4151', courseName: 'Deep Learning Lab', enrolledStudentIds: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'] },
  { examId: 'E6', courseCode: '22DS4152', courseName: 'Web Analytics Lab', enrolledStudentIds: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'] },
  { examId: 'E7', courseCode: '22MB4211', courseName: 'Organizational Behavior', enrolledStudentIds: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14'] },
  { examId: 'E8', courseCode: '22DS4271', courseName: 'Data Stream Mining', enrolledStudentIds: ['S1','S3','S5','S7','S11','S15'] },
];

const DEMO_ROOMS = [
  { roomId: 'R1', name: 'Hall A', capacity: 60 },
  { roomId: 'R2', name: 'Hall B', capacity: 40 },
  { roomId: 'R3', name: 'Lab 301', capacity: 30 },
  { roomId: 'R4', name: 'Lab 302', capacity: 30 },
];

const SLOT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#E8522E', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1'];

export default function ExamSchedulerPage() {
  const [algorithm, setAlgorithm] = useState('dsatur');
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1000));
    
    const schedule = generateExamSchedule({
      exams: DEMO_EXAMS,
      rooms: DEMO_ROOMS,
      algorithm,
    });
    setResult(schedule);
    setIsGenerating(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarCheck size={24} style={{ color: 'var(--accent-green)' }} />
          Smart Exam Scheduler
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          NP-hard graph-coloring algorithm (DSatur / Welsh-Powell) for conflict-free exam scheduling.
        </p>
      </div>

      {/* Controls */}
      <div className="solid-card animate-fade-in-up delay-1" style={{ padding: '20px', marginBottom: '20px', opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Algorithm</label>
            <select className="input-field" value={algorithm} onChange={e => setAlgorithm(e.target.value)} style={{ width: '200px' }} id="exam-algorithm-select">
              <option value="dsatur">DSatur (Recommended)</option>
              <option value="welsh-powell">Welsh-Powell</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn btn-green" id="generate-exam-schedule">
              {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Sparkles size={16} /> Generate Schedule</>}
            </button>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {DEMO_EXAMS.length} exams • {DEMO_ROOMS.length} rooms
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-in-up">
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Exams', value: result.summary.totalExams, color: '#3B82F6' },
              { label: 'Time Slots Used', value: result.summary.totalSlots, color: '#10B981' },
              { label: 'Conflicts Resolved', value: result.summary.conflictsResolved, color: '#8B5CF6' },
              { label: 'Algorithm', value: result.algorithm, color: '#E8522E' },
            ].map((stat, i) => (
              <div key={i} className="solid-card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Slot Visualization */}
          <div className="solid-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Exam Slots</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(result.slots).sort(([a], [b]) => Number(a) - Number(b)).map(([slotIdx, exams]) => (
                <div key={slotIdx} style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border-primary)',
                  borderLeft: `4px solid ${SLOT_COLORS[Number(slotIdx) % SLOT_COLORS.length]}`,
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: SLOT_COLORS[Number(slotIdx) % SLOT_COLORS.length], marginBottom: '8px' }}>
                    Time Slot {Number(slotIdx) + 1}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {exams.map(exam => (
                      <div key={exam.examId} style={{
                        padding: '6px 12px', borderRadius: '8px',
                        background: `${SLOT_COLORS[Number(slotIdx) % SLOT_COLORS.length]}15`,
                        fontSize: '0.813rem',
                      }}>
                        <span style={{ fontWeight: 600 }}>{exam.courseCode}</span>
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>{exam.courseName}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '0.688rem' }}>({exam.enrollmentCount} students)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room Assignments */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: 'var(--accent-blue)' }} />
              Room Assignments
            </h3>
            <div className="timetable-container">
              <table className="timetable-grid">
                <thead>
                  <tr>
                    <th>Slot</th><th>Course</th><th>Room</th><th>Capacity</th><th>Enrolled</th><th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.roomAssignments).flatMap(([slotIdx, assignments]) =>
                    assignments.map((a, i) => (
                      <tr key={`${slotIdx}-${i}`}>
                        <td style={{ fontWeight: 600 }}>Slot {Number(slotIdx) + 1}</td>
                        <td>{a.courseCode} — {a.courseName}</td>
                        <td>{a.roomName}</td>
                        <td>{a.roomCapacity}</td>
                        <td>{a.studentCount}</td>
                        <td>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                            background: a.utilization > 80 ? 'var(--danger-subtle)' : a.utilization > 50 ? 'var(--warning-subtle)' : 'var(--success-subtle)',
                            color: a.utilization > 80 ? 'var(--danger)' : a.utilization > 50 ? 'var(--warning)' : 'var(--success)',
                          }}>
                            {a.utilization}%
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Errors/Warnings */}
          {result.errors.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'var(--danger-subtle)' }}>
              {result.errors.map((err, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '0.813rem', color: 'var(--danger)', padding: '2px 0' }}>
                  <AlertTriangle size={14} /> {err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
