/**
 * ExamSeatingController — 4-step wizard for examination seating plan generation.
 *
 * Step 1: Session Configuration (date, FN/AN, exam title, regulations, blocks)
 * Step 2: Subject & Student Mapping (add subjects, upload CSV, preview breakdown)
 * Step 3: Generate & Preview (run engine, visual room grids, invigilator assignment)
 * Step 4: Publish & Export (save to Firestore, batch PDF, Excel)
 *
 * Faculty Availability Model:
 * All faculty are available by default. Admins can mark specific faculty as
 * "unavailable" for a session (on leave, external duty, conducting viva, etc.)
 * before generation. This mirrors real examination branch workflows.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, ChevronRight, ChevronLeft, Calendar, Building2,
  Users, Upload, Sparkles, FileSpreadsheet, Download, Check,
  AlertTriangle, Loader2, Plus, Trash2, X, User, Search,
  Printer, CheckCircle, BookOpen, Eye, EyeOff
} from 'lucide-react';
import {
  generateSeatingPlan,
  parseStudentCSV,
  EXAM_SESSIONS,
  EXAM_BLOCKS,
  EXAM_TYPES,
  REGULATION_OPTIONS,
} from '../../lib/scheduling/SeatingAllocationEngine';
import {
  exportSingleRoomPDF,
  exportBatchPDF,
  exportInvigilatorDutySheet,
} from '../../lib/export/examSeatingPdfExporter';
import SeatingSheetPreview from '../../components/exam/SeatingSheetPreview';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, addDoc, doc, writeBatch
} from 'firebase/firestore';
import useAuthStore from '../../stores/authStore';

const STEP_LABELS = [
  { label: 'Session Setup', icon: Calendar, desc: 'Configure date, session & blocks' },
  { label: 'Subjects & Students', icon: BookOpen, desc: 'Map subjects & upload students' },
  { label: 'Generate & Preview', icon: Sparkles, desc: 'Run allocation engine' },
  { label: 'Publish & Export', icon: Download, desc: 'Save and download PDFs' },
];

const BLOCK_COLORS = {
  Aakash: '#3B82F6', Pratham: '#10B981', Srujan: '#8B5CF6',
  Nirmithi: '#E8522E', Avishkar: '#F59E0B',
};

export default function ExamSeatingController() {
  const { profile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);

  // ── Step 1 State ──
  const [sessionDate, setSessionDate] = useState('');
  const [sessionSlot, setSessionSlot] = useState('FN');
  const [examTitle, setExamTitle] = useState('');
  const [examType, setExamType] = useState('regular');
  const [selectedRegulations, setSelectedRegulations] = useState(['R22']);
  const [selectedBlocks, setSelectedBlocks] = useState(['Srujan']);

  // ── Step 2 State ──
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState({ code: '', name: '', branches: '', year: '', semester: '' });
  const [studentData, setStudentData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');

  // ── Step 3 State ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [unavailableFaculty, setUnavailableFaculty] = useState(new Set());
  const [showFacultyPanel, setShowFacultyPanel] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');

  // ── Step 4 State ──
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // ── Load rooms and faculty from Firestore ──
  useEffect(() => {
    getDocs(collection(db, 'exam_rooms')).then(snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDocs(collection(db, 'faculty')).then(snap => {
      setFacultyList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── Filtered rooms by selected blocks ──
  const filteredRooms = useMemo(() => {
    return rooms
      .filter(r => selectedBlocks.includes(r.block) && r.isActive !== false)
      .sort((a, b) => {
        if (a.block !== b.block) return a.block.localeCompare(b.block);
        if (a.floor !== b.floor) return (a.floor || 0) - (b.floor || 0);
        return String(a.roomNumber).localeCompare(String(b.roomNumber));
      });
  }, [rooms, selectedBlocks]);

  // ── Available faculty (excluding unavailable) ──
  const availableFaculty = useMemo(() => {
    return facultyList.filter(f => !unavailableFaculty.has(f.id));
  }, [facultyList, unavailableFaculty]);

  const filteredFacultyForPanel = useMemo(() => {
    if (!facultySearch.trim()) return facultyList;
    const q = facultySearch.toLowerCase();
    return facultyList.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q)
    );
  }, [facultyList, facultySearch]);

  // ── Student branch breakdown ──
  const branchBreakdown = useMemo(() => {
    const map = {};
    studentData.forEach(s => {
      map[s.branch] = (map[s.branch] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [studentData]);

  // ═══════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════

  const handleAddSubject = () => {
    if (!newSubject.code.trim() || !newSubject.name.trim()) return;
    setSubjects(prev => [...prev, {
      ...newSubject,
      branches: newSubject.branches.split(',').map(b => b.trim()).filter(Boolean),
      id: Date.now(),
    }]);
    setNewSubject({ code: '', name: '', branches: '', year: '', semester: '' });
  };

  const handleRemoveSubject = (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const { students, errors } = parseStudentCSV(evt.target.result);
      setStudentData(students);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleToggleRegulation = (reg) => {
    setSelectedRegulations(prev =>
      prev.includes(reg) ? prev.filter(r => r !== reg) : [...prev, reg]
    );
  };

  const handleToggleBlock = (blockName) => {
    setSelectedBlocks(prev =>
      prev.includes(blockName)
        ? prev.filter(b => b !== blockName)
        : [...prev, blockName]
    );
  };

  const handleToggleFacultyAvailability = (facultyId) => {
    setUnavailableFaculty(prev => {
      const next = new Set(prev);
      if (next.has(facultyId)) next.delete(facultyId);
      else next.add(facultyId);
      return next;
    });
  };

  // ── GENERATE ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    // Simulate async processing
    await new Promise(r => setTimeout(r, 800));

    const sessionInfo = {
      date: sessionDate,
      session: sessionSlot,
      examTitle: examTitle || `B.Tech ${examType === 'supplementary' ? 'Supplementary' : 'Regular'} Examinations`,
      examType,
      subjects,
    };

    const plan = generateSeatingPlan({
      students: studentData,
      rooms: filteredRooms,
      availableFaculty: availableFaculty.map(f => ({
        id: f.id || f.uid,
        name: f.name,
        department: f.department,
        designation: f.designation,
      })),
      sessionInfo,
      unavailableFacultyIds: [...unavailableFaculty],
    });

    setResult(plan);
    setIsGenerating(false);
  };

  // ── PUBLISH ──
  const handlePublish = async () => {
    if (!result || result.roomPlans.length === 0) return;
    setIsPublishing(true);

    try {
      const batch = writeBatch(db);

      for (const plan of result.roomPlans) {
        const planRef = doc(collection(db, 'seating_plans'));
        batch.set(planRef, {
          sessionDate,
          sessionSlot,
          examTitle,
          examType,
          roomId: plan.room.id,
          roomNumber: plan.room.roomNumber,
          block: plan.room.block,
          floor: plan.room.floor,
          gridData: plan.grid,
          branches: plan.branches,
          branchCount: plan.branchCount,
          studentCount: plan.studentCount,
          assignedInvigilators: plan.assignedInvigilators || [],
          totalRegistered: plan.totalRegistered,
          createdBy: profile?.uid || 'unknown',
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      setPublished(true);
    } catch (err) {
      console.error('Publish error:', err);
    }
    setIsPublishing(false);
  };

  // ── PDF EXPORTS ──
  const sessionInfo = {
    date: sessionDate,
    session: sessionSlot,
    examTitle: examTitle || 'Examination',
    examType,
    subjects,
  };

  const handleExportBatchPDF = () => {
    if (result) exportBatchPDF(result.roomPlans, sessionInfo);
  };

  const handleExportDutySheet = () => {
    if (result) exportInvigilatorDutySheet(result.invigilatorSummary, sessionInfo);
  };

  const handleExportSingleRoom = (plan) => {
    exportSingleRoomPDF(plan, sessionInfo);
  };

  // ── NAVIGATION ──
  const canNext = () => {
    if (currentStep === 0) return sessionDate && examTitle;
    if (currentStep === 1) return studentData.length > 0;
    if (currentStep === 2) return result && result.roomPlans.length > 0;
    return true;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardList size={24} style={{ color: '#E8522E' }} />
          Exam Seating Plan Controller
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Generate anti-malpractice interleaved seating plans with dynamic invigilation allocation.
        </p>
      </div>

      {/* ── Stepper ── */}
      <div className="solid-card animate-fade-in-up delay-1" style={{ padding: '16px 20px', marginBottom: '20px', opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {STEP_LABELS.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0', flex: 1 }}>
              <div
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: idx <= currentStep ? 'pointer' : 'default',
                  opacity: idx <= currentStep ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: idx === currentStep
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))'
                    : idx < currentStep
                    ? 'var(--accent-green)'
                    : 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: idx <= currentStep ? 'white' : 'var(--text-muted)',
                  boxShadow: idx === currentStep ? '0 4px 12px var(--accent-primary-glow)' : 'none',
                  transition: 'all 250ms ease',
                }}>
                  {idx < currentStep ? <Check size={16} /> : <step.icon size={16} />}
                </div>
                <div style={{ display: idx === currentStep || window.innerWidth > 900 ? 'block' : 'none' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{step.label}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>{step.desc}</div>
                </div>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', margin: '0 12px',
                  background: idx < currentStep ? 'var(--accent-green)' : 'var(--border-primary)',
                  transition: 'background 250ms ease',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 1: Session Configuration              */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 0 && (
        <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: Form */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Exam Session Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Date */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Exam Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  id="exam-date-input"
                />
              </div>

              {/* Session */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Session *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {Object.values(EXAM_SESSIONS).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSessionSlot(s.id)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', textAlign: 'center',
                        background: sessionSlot === s.id ? 'var(--accent-primary-subtle)' : 'var(--surface-glass)',
                        border: `1.5px solid ${sessionSlot === s.id ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                        color: sessionSlot === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: sessionSlot === s.id ? 700 : 400,
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{s.id}</div>
                      <div style={{ fontSize: '0.688rem' }}>{s.start} – {s.end}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exam Title */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Exam Title *</label>
                <input
                  className="input-field"
                  placeholder="e.g. B.Tech III-II Sem Regular Examinations, July 2026"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  id="exam-title-input"
                />
              </div>

              {/* Exam Type */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {EXAM_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setExamType(t.id)}
                      style={{
                        padding: '6px 16px', borderRadius: '8px', fontSize: '0.813rem', fontWeight: 600,
                        background: examType === t.id ? '#10B98120' : 'var(--surface-glass)',
                        color: examType === t.id ? '#10B981' : 'var(--text-secondary)',
                        border: `1.5px solid ${examType === t.id ? '#10B981' : 'var(--border-primary)'}`,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Regulations */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Regulations</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {REGULATION_OPTIONS.map(reg => (
                    <button
                      key={reg}
                      onClick={() => handleToggleRegulation(reg)}
                      style={{
                        padding: '5px 14px', borderRadius: '8px', fontSize: '0.813rem', fontWeight: 600,
                        background: selectedRegulations.includes(reg) ? '#3B82F615' : 'var(--surface-glass)',
                        color: selectedRegulations.includes(reg) ? '#3B82F6' : 'var(--text-muted)',
                        border: `1.5px solid ${selectedRegulations.includes(reg) ? '#3B82F6' : 'var(--border-primary)'}`,
                      }}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Block Selection */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Select Blocks</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
              Choose which building blocks to use for this exam session.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {EXAM_BLOCKS.map(block => {
                const isSelected = selectedBlocks.includes(block.name);
                const blockRooms = rooms.filter(r => r.block === block.name && r.isActive !== false);
                const capacity = blockRooms.reduce((s, r) => s + (r.capacity || 24), 0);
                return (
                  <button
                    key={block.id}
                    onClick={() => handleToggleBlock(block.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: '12px',
                      background: isSelected
                        ? `${BLOCK_COLORS[block.name]}12`
                        : 'var(--surface-glass)',
                      border: `1.5px solid ${isSelected ? BLOCK_COLORS[block.name] : 'var(--border-primary)'}`,
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: isSelected ? `${BLOCK_COLORS[block.name]}25` : 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms ease',
                    }}>
                      {isSelected
                        ? <Check size={16} style={{ color: BLOCK_COLORS[block.name] }} />
                        : <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? BLOCK_COLORS[block.name] : 'var(--text-primary)' }}>
                        {block.name}
                      </div>
                      <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
                        {blockRooms.length} rooms • {capacity} seats
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{
              marginTop: '16px', padding: '12px', borderRadius: '10px',
              background: 'var(--accent-green-subtle)',
              fontSize: '0.813rem', fontWeight: 600, color: 'var(--accent-green)',
              textAlign: 'center',
            }}>
              {filteredRooms.length} rooms selected • {filteredRooms.reduce((s, r) => s + (r.capacity || 24), 0)} total seats
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 2: Subjects & Students                */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: Subjects */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Exam Subjects</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <input className="input-field" placeholder="Code" value={newSubject.code} onChange={e => setNewSubject(p => ({ ...p, code: e.target.value }))} style={{ width: '100px' }} id="subject-code-input" />
              <input className="input-field" placeholder="Subject Name" value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} id="subject-name-input" />
              <input className="input-field" placeholder="Branches (CSV)" value={newSubject.branches} onChange={e => setNewSubject(p => ({ ...p, branches: e.target.value }))} style={{ width: '140px' }} id="subject-branches-input" />
              <input className="input-field" placeholder="Year" value={newSubject.year} onChange={e => setNewSubject(p => ({ ...p, year: e.target.value }))} style={{ width: '60px' }} />
              <input className="input-field" placeholder="Sem" value={newSubject.semester} onChange={e => setNewSubject(p => ({ ...p, semester: e.target.value }))} style={{ width: '60px' }} />
              <button onClick={handleAddSubject} className="btn btn-primary btn-sm" id="add-subject-btn">
                <Plus size={14} /> Add
              </button>
            </div>

            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.813rem' }}>
                No subjects added yet. Add exam subjects above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {subjects.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'var(--surface-glass)',
                    border: '1px solid var(--border-primary)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', minWidth: '80px' }}>
                      {s.code}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.813rem', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
                      {s.branches?.join(', ')}
                    </span>
                    <button onClick={() => handleRemoveSubject(s.id)} style={{ color: 'var(--danger)', padding: '2px' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Student Upload */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Student Registrations</h3>
            
            {/* CSV Upload */}
            <div style={{
              border: '2px dashed var(--border-secondary)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              background: csvFileName ? 'var(--accent-green-subtle)' : 'transparent',
            }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
              {csvFileName ? (
                <>
                  <CheckCircle size={28} style={{ color: 'var(--accent-green)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {csvFileName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {studentData.length} students loaded
                  </div>
                </>
              ) : (
                <>
                  <Upload size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Upload Student CSV
                  </div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Columns: HallTicketNo, Name, Branch, Year, Semester, Regulation
                  </div>
                </>
              )}
            </div>

            {/* CSV Errors */}
            {csvErrors.length > 0 && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--danger-subtle)', marginBottom: '12px' }}>
                {csvErrors.slice(0, 5).map((err, i) => (
                  <div key={i} style={{ fontSize: '0.688rem', color: 'var(--danger)', display: 'flex', gap: '4px', padding: '2px 0' }}>
                    <AlertTriangle size={12} /> {err}
                  </div>
                ))}
              </div>
            )}

            {/* Branch Breakdown */}
            {branchBreakdown.length > 0 && (
              <div>
                <div style={{ fontSize: '0.813rem', fontWeight: 700, marginBottom: '8px' }}>Branch Breakdown</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {branchBreakdown.map(([branch, count]) => (
                    <div key={branch} style={{
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'var(--accent-blue-subtle)',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      <span style={{ color: 'var(--accent-blue)' }}>{branch}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: '12px', padding: '10px', borderRadius: '8px',
                  background: 'var(--surface-glass)', textAlign: 'center',
                  fontSize: '0.875rem', fontWeight: 700,
                }}>
                  Total: {studentData.length} students
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 3: Generate & Preview                 */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="animate-fade-in-up">
          {/* Generation Controls */}
          <div className="solid-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || studentData.length === 0}
              className="btn btn-primary"
              id="generate-seating-btn"
            >
              {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Seating Plan</>}
            </button>

            <button
              onClick={() => setShowFacultyPanel(!showFacultyPanel)}
              className="btn btn-ghost"
              id="toggle-faculty-panel-btn"
            >
              <Users size={16} />
              Faculty Availability ({availableFaculty.length}/{facultyList.length})
              {showFacultyPanel ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {studentData.length} students • {filteredRooms.length} rooms • {availableFaculty.length} faculty
            </div>
          </div>

          {/* Faculty Availability Panel */}
          {showFacultyPanel && (
            <div className="solid-card animate-fade-in-up" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                  Faculty Availability
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '8px', fontSize: '0.75rem' }}>
                    Mark faculty unavailable for this session (on leave, external duty, viva, etc.)
                  </span>
                </h4>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  borderRadius: '8px', padding: '5px 10px',
                }}>
                  <Search size={13} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Filter faculty..."
                    value={facultySearch}
                    onChange={e => setFacultySearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--text-primary)', width: '140px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {filteredFacultyForPanel.map(f => {
                  const isUnavailable = unavailableFaculty.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleToggleFacultyAvailability(f.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 10px', borderRadius: '8px',
                        background: isUnavailable ? 'var(--danger-subtle)' : 'var(--surface-glass)',
                        border: `1px solid ${isUnavailable ? 'var(--danger)' : 'var(--border-primary)'}`,
                        fontSize: '0.75rem', textAlign: 'left',
                        opacity: isUnavailable ? 0.7 : 1,
                        transition: 'all 150ms ease',
                      }}
                    >
                      <User size={12} style={{ color: isUnavailable ? 'var(--danger)' : 'var(--accent-blue)', flexShrink: 0 }} />
                      <span style={{
                        fontWeight: isUnavailable ? 400 : 600,
                        textDecoration: isUnavailable ? 'line-through' : 'none',
                        color: isUnavailable ? 'var(--danger)' : 'var(--text-primary)',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        {f.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {unavailableFaculty.size > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.688rem', color: 'var(--danger)', fontWeight: 600 }}>
                  {unavailableFaculty.size} faculty marked unavailable
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Students Seated', value: result.summary.totalSeated, color: '#3B82F6' },
                  { label: 'Rooms Used', value: result.summary.totalRoomsUsed, color: '#10B981' },
                  { label: 'Invigilators', value: result.summary.totalInvigilators, color: '#8B5CF6' },
                  { label: 'Single-Branch Rooms', value: result.summary.singleBranchRooms, color: '#06B6D4' },
                  { label: 'Multi-Branch Rooms', value: result.summary.multiBranchRooms, color: '#E8522E' },
                ].map((stat, i) => (
                  <div key={i} className="solid-card" style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Errors & Warnings */}
              {result.errors.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--danger-subtle)', marginBottom: '12px' }}>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--danger)', padding: '2px 0' }}>
                      <AlertTriangle size={13} /> {err}
                    </div>
                  ))}
                </div>
              )}
              {result.validation?.warnings?.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--warning-subtle)', marginBottom: '12px' }}>
                  {result.validation.warnings.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--warning)', padding: '2px 0' }}>
                      <AlertTriangle size={13} /> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Room Grid Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.roomPlans.map((plan, idx) => (
                  <SeatingSheetPreview
                    key={idx}
                    roomPlan={plan}
                    onDownloadPDF={() => handleExportSingleRoom(plan)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 4: Publish & Export                   */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 3 && result && (
        <div className="animate-fade-in-up">
          <div className="solid-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
            {published ? (
              <>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--accent-green-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle size={32} style={{ color: 'var(--accent-green)' }} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Seating Plan Published!</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '4px' }}>
                  {result.roomPlans.length} room plans saved to database.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Ready to Publish</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  {result.summary.totalSeated} students across {result.summary.totalRoomsUsed} rooms with {result.summary.totalInvigilators} invigilators.
                </p>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="btn btn-green btn-lg"
                  id="publish-seating-btn"
                >
                  {isPublishing ? <><Loader2 size={18} className="animate-spin" /> Publishing...</> : <><CheckCircle size={18} /> Publish to Database</>}
                </button>
              </>
            )}
          </div>

          {/* Export Options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <button
              onClick={handleExportBatchPDF}
              className="solid-card"
              style={{
                padding: '24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              id="export-batch-pdf-btn"
            >
              <FileSpreadsheet size={28} style={{ color: '#E8522E', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Batch PDF</div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                All {result.roomPlans.length} rooms in one PDF
              </div>
            </button>

            <button
              onClick={handleExportDutySheet}
              className="solid-card"
              style={{
                padding: '24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              id="export-duty-sheet-btn"
            >
              <Users size={28} style={{ color: '#8B5CF6', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Duty Roster PDF</div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Invigilator assignment sheet
              </div>
            </button>

            <button
              onClick={handleExportBatchPDF}
              className="solid-card"
              style={{
                padding: '24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              <Printer size={28} style={{ color: '#3B82F6', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Print All</div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Generate & open print dialog
              </div>
            </button>
          </div>

          {/* Invigilator Summary Table */}
          {result.invigilatorSummary && result.invigilatorSummary.length > 0 && (
            <div className="solid-card" style={{ padding: '20px', marginTop: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#8B5CF6' }} /> Invigilation Assignment Summary
              </h3>
              <div className="timetable-container">
                <table className="timetable-grid">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Faculty Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Room</th>
                      <th>Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invigilatorSummary.map((inv, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600, textAlign: 'left' }}>{inv.name}</td>
                        <td>{inv.department}</td>
                        <td style={{ fontSize: '0.75rem' }}>{inv.designation}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{inv.assignedRoom}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.688rem', fontWeight: 600,
                            background: `${BLOCK_COLORS[inv.assignedBlock] || '#666'}15`,
                            color: BLOCK_COLORS[inv.assignedBlock] || '#666',
                          }}>
                            {inv.assignedBlock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Footer ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '24px', padding: '16px 0',
      }}>
        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="btn btn-ghost"
          id="step-prev-btn"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Step {currentStep + 1} of {STEP_LABELS.length}
        </div>

        {currentStep < STEP_LABELS.length - 1 && (
          <button
            onClick={() => setCurrentStep(s => Math.min(STEP_LABELS.length - 1, s + 1))}
            disabled={!canNext()}
            className="btn btn-primary"
            id="step-next-btn"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
        {currentStep === STEP_LABELS.length - 1 && (
          <div />
        )}
      </div>
    </div>
  );
}
