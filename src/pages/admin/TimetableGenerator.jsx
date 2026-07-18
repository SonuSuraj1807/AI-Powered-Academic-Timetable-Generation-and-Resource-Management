/**
 * TimetableGenerator — Multi-step wizard for AI-powered timetable generation.
 * 
 * Steps:
 * 1. Select department, regulation, year, section
 * 2. Review and assign subjects from curriculum registry
 * 3. Assign faculty to subjects
 * 4. Configure constraints (training days, special slots)
 * 5. Generate → preview → publish
 */
import { useState, useMemo } from 'react';
import { 
  Cpu, ChevronRight, ChevronLeft, BookOpen, Users, 
  Settings, Sparkles, FileSpreadsheet, Download, Check,
  AlertTriangle, Loader2
} from 'lucide-react';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import { generateTimetable } from '../../lib/scheduling/TimetableEngine';
import { exportToExcel } from '../../lib/export/excelExporter';
import { exportToPDF } from '../../lib/export/pdfExporter';
import { 
  DEPARTMENTS, REGULATIONS, TIME_SLOTS, WEEKDAYS,
  getCurriculum, getElectiveGroups, getSections 
} from '../../data/curriculumSeed';

const STEPS = [
  { id: 'select', label: 'Select Target', icon: Settings },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'faculty', label: 'Faculty Assignment', icon: Users },
  { id: 'generate', label: 'Generate & Preview', icon: Sparkles },
];

export default function TimetableGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState(null);

  // Step 1: Target selection
  const [department, setDepartment] = useState('CSE-DS');
  const [regulation, setRegulation] = useState('R25');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [section, setSection] = useState('A');
  const [room, setRoom] = useState('301');

  // Step 2: Subject selection
  const subjects = useMemo(() => getCurriculum({ regulation, year, semester, department }), [regulation, year, semester, department]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Step 3: Faculty assignments
  const [facultyAssignments, setFacultyAssignments] = useState({});

  // Step 4: Training overrides
  const [trainingDays, setTrainingDays] = useState([]);

  const timeConfig = TIME_SLOTS[regulation];
  const sections = useMemo(() => getSections(department, year), [department, year]);

  // Auto-select all subjects when navigating to subjects step
  const handleStepChange = (newStep) => {
    if (newStep === 1 && selectedSubjects.length === 0) {
      setSelectedSubjects(subjects.filter(s => s.type !== 'elective').map(s => ({ ...s })));
    }
    setCurrentStep(newStep);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate brief processing time for UX
    await new Promise(r => setTimeout(r, 1500));
    
    const enrichedSubjects = selectedSubjects.map(s => ({
      ...s,
      facultyId: facultyAssignments[s.code]?.id || `faculty_${s.code}`,
      facultyName: facultyAssignments[s.code]?.name || 'Faculty TBD',
    }));

    const result = generateTimetable({
      department, regulation, year, section,
      subjects: enrichedSubjects,
      existingSchedules: [],
      trainingOverrides: trainingDays.map(d => ({ day: d, description: 'Training Day' })),
      room,
    });

    setGeneratedSchedule(result);
    setIsGenerating(false);
  };

  const handleExportExcel = () => {
    if (generatedSchedule) {
      exportToExcel(generatedSchedule, timeConfig, `${department}_${regulation}_Y${year}_${section}_Timetable`);
    }
  };

  const handleExportPDF = () => {
    if (generatedSchedule) {
      exportToPDF(generatedSchedule, timeConfig, `${department}_${regulation}_Y${year}_${section}_Timetable`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={24} style={{ color: 'var(--accent-primary)' }} />
          AI Timetable Generator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Constraint-satisfaction engine with automated lab placement and elective alignment.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="animate-fade-in-up delay-1" style={{
        display: 'flex', gap: '4px', marginBottom: '24px', opacity: 0,
        background: 'var(--bg-card)', padding: '4px', borderRadius: '12px',
        border: '1px solid var(--border-primary)',
      }}>
        {STEPS.map((step, i) => (
          <button
            key={step.id}
            onClick={() => handleStepChange(i)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '0.813rem', fontWeight: i === currentStep ? 700 : 400,
              background: i === currentStep ? 'var(--accent-primary-subtle)' : 'transparent',
              color: i === currentStep ? 'var(--accent-primary)' : i < currentStep ? 'var(--success)' : 'var(--text-tertiary)',
              transition: 'all 200ms ease',
            }}
          >
            {i < currentStep ? <Check size={14} /> : <step.icon size={14} />}
            <span style={{ display: 'none', '@media(min-width:768px)': { display: 'inline' } }}>{step.label}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="solid-card animate-fade-in-up delay-2" style={{ padding: '24px', opacity: 0 }}>
        {/* ── Step 1: Target Selection ── */}
        {currentStep === 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>Select Target Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Department</label>
                <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)} id="select-department">
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Regulation</label>
                <select className="input-field" value={regulation} onChange={e => setRegulation(e.target.value)} id="select-regulation">
                  {REGULATIONS.map(r => <option key={r.id} value={r.id}>{r.name} ({r.description})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Year</label>
                <select className="input-field" value={year} onChange={e => setYear(Number(e.target.value))} id="select-year">
                  {(REGULATIONS.find(r => r.id === regulation)?.years || []).map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Semester</label>
                <select className="input-field" value={semester} onChange={e => setSemester(Number(e.target.value))} id="select-semester">
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Section</label>
                <select className="input-field" value={section} onChange={e => setSection(e.target.value)} id="select-section">
                  {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Room No.</label>
                <input className="input-field" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g., 301" id="input-room" />
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'var(--accent-blue-subtle)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p style={{ fontSize: '0.813rem', color: 'var(--accent-blue)' }}>
                <strong>Lunch Slot:</strong> {regulation === 'R25' ? '12:20 PM – 01:10 PM (Junior Schedule)' : '01:10 PM – 01:50 PM (Senior Schedule)'}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Subject Selection ── */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
              Curriculum Subjects — {regulation} Year {year} Sem {semester}
            </h3>
            <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              {subjects.length} subjects found. Toggle selection as needed.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subjects.map(subject => {
                const isSelected = selectedSubjects.some(s => s.code === subject.code);
                return (
                  <div
                    key={subject.code}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSubjects(prev => prev.filter(s => s.code !== subject.code));
                      } else {
                        setSelectedSubjects(prev => [...prev, { ...subject }]);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '10px',
                      background: isSelected ? 'var(--accent-blue-subtle)' : 'var(--surface-glass)',
                      border: `1px solid ${isSelected ? 'rgba(59,130,246,0.3)' : 'var(--border-primary)'}`,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'}`,
                      background: isSelected ? 'var(--accent-blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && <Check size={12} color="white" />}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', minWidth: '80px' }}>
                      {subject.code}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{subject.name}</span>
                    <span className={`badge badge-${subject.type === 'lab' ? 'blue' : subject.type === 'elective' ? 'green' : 'primary'}`}>
                      {subject.type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subject.credits} cr</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Faculty Assignment ── */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Assign Faculty to Subjects</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedSubjects.map(subject => (
                <div key={subject.code} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border-primary)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', minWidth: '80px' }}>
                    {subject.code}
                  </span>
                  <span style={{ fontSize: '0.813rem', minWidth: '160px' }}>{subject.name}</span>
                  <input
                    className="input-field"
                    placeholder="Faculty name"
                    value={facultyAssignments[subject.code]?.name || ''}
                    onChange={e => setFacultyAssignments(prev => ({
                      ...prev,
                      [subject.code]: { id: `f_${subject.code}`, name: e.target.value }
                    }))}
                    style={{ maxWidth: '200px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Generate & Preview ── */}
        {currentStep === 3 && (
          <div>
            {!generatedSchedule ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '20px',
                  background: 'var(--accent-primary-subtle)', margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={36} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Ready to Generate</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                  The AI engine will use constraint-satisfaction to produce an optimized timetable for <strong>{department} {regulation} Year {year} Section {section}</strong> with {selectedSubjects.length} subjects.
                </p>
                
                {trainingDays.length > 0 && (
                  <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '10px', background: 'var(--accent-amber-subtle)', display: 'inline-block' }}>
                    <span style={{ fontSize: '0.813rem', color: 'var(--accent-amber)' }}>
                      Training override on: {trainingDays.join(', ')}
                    </span>
                  </div>
                )}

                {/* Training Day Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                    Optional: Select training/placement override days
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {WEEKDAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => setTrainingDays(prev => 
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                        )}
                        className={`btn btn-sm ${trainingDays.includes(day) ? 'btn-primary' : 'btn-ghost'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn btn-primary btn-lg"
                  style={{ minWidth: '200px' }}
                >
                  {isGenerating ? (
                    <><Loader2 size={18} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={18} /> Generate Timetable</>
                  )}
                </button>
              </div>
            ) : (
              <div>
                {/* Status Banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
                  background: generatedSchedule.status === 'success' ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                  border: `1px solid ${generatedSchedule.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {generatedSchedule.status === 'success' ? <Check size={18} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: generatedSchedule.status === 'success' ? 'var(--success)' : 'var(--warning)' }}>
                      {generatedSchedule.status === 'success' ? 'Timetable generated successfully!' : `Generated with ${generatedSchedule.errors.length} warning(s)`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleExportExcel} className="btn btn-ghost btn-sm" id="export-excel">
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" id="export-pdf">
                      <Download size={14} /> PDF
                    </button>
                    <button onClick={handleGenerate} className="btn btn-ghost btn-sm">
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Errors */}
                {generatedSchedule.errors.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {generatedSchedule.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: 'var(--warning)', padding: '4px 0', display: 'flex', gap: '6px' }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                        {err}
                      </div>
                    ))}
                  </div>
                )}

                {/* Rendered Timetable */}
                <TimetableGrid
                  schedule={generatedSchedule}
                  timeConfig={timeConfig}
                  showHeader={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          onClick={() => handleStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="btn btn-ghost"
          style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        {currentStep < STEPS.length - 1 && (
          <button
            onClick={() => handleStepChange(currentStep + 1)}
            className="btn btn-primary"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
