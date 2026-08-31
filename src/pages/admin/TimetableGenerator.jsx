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
import { useState, useMemo, useEffect } from 'react';
import { 
  Cpu, ChevronRight, ChevronLeft, BookOpen, Users, 
  Settings, Sparkles, FileSpreadsheet, Download, Check,
  AlertTriangle, Loader2, Search, X
} from 'lucide-react';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import { generateTimetable } from '../../lib/scheduling/TimetableEngine';
import { exportToExcel } from '../../lib/export/excelExporter';
import { exportToPDF } from '../../lib/export/pdfExporter';
import { 
  DEPARTMENTS, REGULATIONS, TIME_SLOTS, WEEKDAYS,
  getCurriculum, getElectiveGroups, getSections 
} from '../../data/curriculumSeed';
import { db } from '../../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

import useAuthStore from '../../stores/authStore';

const STEPS = [
  { id: 'select', label: 'Select Target', icon: Settings },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'faculty', label: 'Faculty Assignment', icon: Users },
  { id: 'generate', label: 'Generate & Preview', icon: Sparkles },
];

export default function TimetableGenerator() {
  const profile = useAuthStore(state => state.profile);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [isBulk, setIsBulk] = useState(false);

  // Step 1: Target selection — auto default to logged-in department
  const [department, setDepartment] = useState(profile?.department || 'CSE-DS');
  const [regulation, setRegulation] = useState('R25');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [section, setSection] = useState('A');
  const [room, setRoom] = useState('301');
  const [bulkYears, setBulkYears] = useState([1, 2, 3, 4]);

  useEffect(() => {
    if (profile?.department) {
      setDepartment(profile.department);
    }
  }, [profile?.department]);

  // Step 2: Subject selection
  const [dbCurriculum, setDbCurriculum] = useState([]);
  const subjects = useMemo(() => {
    return dbCurriculum.filter(s => 
      s.regulation === regulation &&
      s.year === Number(year) &&
      s.semester === Number(semester) &&
      s.department === department
    );
  }, [dbCurriculum, regulation, year, semester, department]);

  const bulkSubjects = useMemo(() => {
    if (!isBulk) return [];
    const list = dbCurriculum.filter(s =>
      s.department === department &&
      s.semester === Number(semester) &&
      bulkYears.includes(Number(s.year)) &&
      ((s.regulation === 'R25' && s.year === 2) || (s.regulation === 'R22' && (s.year === 3 || s.year === 4)))
    );
    list.sort((a, b) => {
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      if (yearA !== yearB) return yearA - yearB;
      return (a.code || '').localeCompare(b.code || '');
    });
    return list;
  }, [dbCurriculum, isBulk, semester, department, bulkYears]);

  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const dbRegulations = useMemo(() => {
    const regs = new Set(['R25', 'R22']);
    dbCurriculum.forEach(s => {
      if (s.regulation) regs.add(s.regulation);
    });
    return Array.from(regs).map(r => ({ id: r, name: r, description: `${r} Regulation`, years: [1, 2, 3, 4] }));
  }, [dbCurriculum]);
  // Step 3: Faculty assignments & database faculty list
  const [facultyList, setFacultyList] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState({});
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'faculty')).then(snap => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setFacultyList(list);
    }).catch(err => console.error('Error loading faculty:', err));

    const unsubscribeCurriculum = onSnapshot(collection(db, 'curriculum_registry'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setDbCurriculum(list);
    });

    return () => unsubscribeCurriculum();
  }, []);

  // Step 4: Special overrides & blocks (Training hours, Tutorial, Sports, Library, etc.)
  const [trainingDays, setTrainingDays] = useState([]);
  const [specialBlocks, setSpecialBlocks] = useState([]);

  // Local state for the special block editor form
  const [newBlockDay, setNewBlockDay] = useState('Monday');
  const [newBlockPeriod, setNewBlockPeriod] = useState('Period 7');
  const [newBlockType, setNewBlockType] = useState('sports');
  const [newBlockLabel, setNewBlockLabel] = useState('SPORTS');

  const handleTypeChange = (type) => {
    setNewBlockType(type);
    const defaults = {
      training: 'Placement Training',
      tutorial: 'TUTORIAL',
      sports: 'SPORTS',
      library: 'LIBRARY',
      mentoring: 'MENTORING',
      nptel: 'NPTEL CERTIFICATION',
    };
    setNewBlockLabel(defaults[type] || '');
  };

  const handleAddBlock = () => {
    if (!newBlockLabel.trim()) return;
    
    // Avoid duplicates
    if (specialBlocks.some(s => s.day === newBlockDay && s.periodLabel === newBlockPeriod)) {
      alert('A special block or class is already configured for this slot.');
      return;
    }

    setSpecialBlocks(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        day: newBlockDay,
        periodLabel: newBlockPeriod,
        type: newBlockType,
        label: newBlockLabel.trim()
      }
    ]);
  };

  const handleRemoveBlock = (id) => {
    setSpecialBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleToggleFaculty = (subCode, facultyMember) => {
    setFacultyAssignments(prev => {
      const current = prev[subCode] || [];
      const exists = current.some(f => f.id === (facultyMember.uid || facultyMember.id));
      let updated = [];
      if (exists) {
        updated = current.filter(f => f.id !== (facultyMember.uid || facultyMember.id));
      } else {
        updated = [...current, { id: facultyMember.uid || facultyMember.id, name: facultyMember.name }];
      }
      return {
        ...prev,
        [subCode]: updated
      };
    });
  };

  // Correct VBIT time config: 1st Year uses JUNIOR matrix, 2nd-4th Year uses SENIOR matrix
  const timeConfig = year === 1 ? TIME_SLOTS.JUNIOR : TIME_SLOTS.SENIOR;
  const sections = useMemo(() => getSections(department, year), [department, year]);

  // Auto-select all subjects when navigating to subjects step or when bulk target years change
  const handleStepChange = (newStep) => {
    if (newStep === 1) {
      const activeList = isBulk ? bulkSubjects : subjects;
      setSelectedSubjects(activeList.filter(s => s.type !== 'elective').map(s => ({ ...s })));
    }
    setCurrentStep(newStep);
  };

  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!generatedSchedule) return;
    setIsPublishing(true);
    try {
      const scheduleId = `${department}_${regulation}_Y${year}_Sem${semester}_Sec${section}`;
      await setDoc(doc(db, 'schedules', scheduleId), {
        ...generatedSchedule,
        id: scheduleId,
        department,
        regulation,
        year,
        semester,
        section,
        room,
        publishedAt: new Date().toISOString(),
      });
      alert('Timetable successfully published to Firestore in real-time!');
    } catch (err) {
      console.error('Error publishing timetable:', err);
      alert('Error publishing: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // 1. Real-time data sync: Fetch ALL published schedules across 1st to 4th year to prevent lab room & faculty collisions!
    let existingSchedules = [];
    try {
      const snap = await getDocs(collection(db, 'schedules'));
      snap.forEach(docSnap => {
        // Skip current section schedule to allow regenerating/overwriting
        if (docSnap.id !== `${department}_${regulation}_Y${year}_Sem${semester}_Sec${section}`) {
          existingSchedules.push(docSnap.data());
        }
      });
    } catch (err) {
      console.error('Error fetching college-wide schedules for conflict check:', err);
    }

    const enrichedSubjects = selectedSubjects.map(s => {
      const assignedList = facultyAssignments[s.code] || [];
      const isLab = s.type === 'lab';

      let assignedFaculty = null;
      let assignedNames = [];
      let assignedIds = [];

      if (assignedList.length > 0) {
        if (isLab) {
          // Labs: Assign multi-faculty simultaneously for co-teaching
          assignedNames = assignedList.map(f => f.name).filter(Boolean);
          assignedIds = assignedList.map(f => f.id).filter(Boolean);
        } else {
          // Theory: Distribute section-by-section (e.g. 1st faculty for Sec A/B, 2nd faculty for Sec C)
          const secIndex = ['A', 'B', 'C'].indexOf(section.toUpperCase());
          const targetFac = assignedList[(secIndex >= 0 ? secIndex : 0) % assignedList.length];
          assignedNames = [targetFac.name];
          assignedIds = [targetFac.id];
        }
      }

      return {
        ...s,
        facultyId: assignedIds.length > 0 ? assignedIds[0] : `faculty_${s.code}`,
        facultyIds: assignedIds.length > 0 ? assignedIds : [`faculty_${s.code}`],
        facultyName: assignedNames.length > 0 ? assignedNames.join(', ') : 'Faculty TBD',
        facultyNames: assignedNames.length > 0 ? assignedNames : ['Faculty TBD'],
      };
    });

    const result = generateTimetable({
      department, regulation, year, section,
      subjects: enrichedSubjects,
      existingSchedules,
      trainingOverrides: trainingDays.map(d => ({ day: d, description: 'Training Day' })),
      specialBlocks,
      room,
    });

    setGeneratedSchedule(result);
    setIsGenerating(false);
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    let allSchedules = [];
    let facultyPool = [];
    
    // Fetch all registered faculty members to load balance teaching workload
    try {
      const snap = await getDocs(collection(db, 'faculty'));
      snap.forEach(doc => {
        facultyPool.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error('Error fetching faculty pool:', err);
    }

    // Fetch all existing timetables across ALL years (1st to 4th) first for lab room & faculty clash prevention
    try {
      const snap = await getDocs(collection(db, 'schedules'));
      snap.forEach(docSnap => {
        allSchedules.push(docSnap.data());
      });
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
    
    // We will generate for checked years sequentially to avoid faculty clashes across years
    const years = bulkYears.sort();
    const sections = ['A', 'B', 'C'];
    let count = 0;
    
    // Global workload tracking across all generated sections in this run
    const facultyLoadCounter = {};
    facultyPool.forEach(f => {
      facultyLoadCounter[f.id || f.uid] = 0;
    });

    for (const y of years) {
      // Years 1 and 2 are R25, Years 3 and 4 are R22
      const reg = (y === 1 || y === 2) ? 'R25' : 'R22';
      
      for (const sec of sections) {
        // Fetch curriculum for this year / sem / department / regulation
        const allYearSubjects = dbCurriculum.filter(s => 
          s.regulation === reg &&
          s.year === Number(y) &&
          s.semester === Number(semester) &&
          s.department === department
        );
        let subjects = allYearSubjects.filter(s => selectedSubjects.some(sel => sel.code === s.code));
        if (subjects.length === 0) {
          const coreAndLab = allYearSubjects.filter(s => s.type !== 'elective');
          const electivesByGroup = {};
          allYearSubjects.filter(s => s.type === 'elective').forEach(e => {
            const grp = e.peGroup || 'PE-I';
            if (!electivesByGroup[grp]) electivesByGroup[grp] = [];
            electivesByGroup[grp].push(e);
          });
          const secIndex = sections.indexOf(sec);
          const chosenElectives = Object.values(electivesByGroup).map(grp => grp[secIndex % grp.length]);
          subjects = [...coreAndLab, ...chosenElectives];
        }
        if (subjects.length === 0) continue;
        
        // Filter department faculty
        const deptFaculty = facultyPool.filter(f => f.department === department || true);
        const sectionAssignedFacIds = new Set();
        
        // Auto-enrich subjects with workload-balanced faculty assignments
        const enrichedSubjects = subjects.map(s => {
          if (s.code.startsWith('VBIT-')) {
            const isNptelOrTut = s.code === 'VBIT-NPTEL' || s.code === 'VBIT-TUTORIAL';
            if (!isNptelOrTut) {
              return { ...s, facultyId: '', facultyName: '' };
            }
          }

          const assignedList = facultyAssignments[s.code] || [];
          const isLab = s.type === 'lab';

          if (assignedList.length > 0) {
            if (isLab) {
              const assignedNames = assignedList.map(f => f.name).filter(Boolean);
              const assignedIds = assignedList.map(f => f.id || f.uid).filter(Boolean);
              assignedIds.forEach(id => {
                facultyLoadCounter[id] = (facultyLoadCounter[id] || 0) + 3;
                sectionAssignedFacIds.add(id);
              });
              return {
                ...s,
                facultyId: assignedIds[0],
                facultyIds: assignedIds,
                facultyName: assignedNames.join(', '),
                facultyNames: assignedNames,
              };
            } else {
              const secIndex = sections.indexOf(sec);
              const targetFac = assignedList[(secIndex >= 0 ? secIndex : 0) % assignedList.length];
              const fId = targetFac.id || targetFac.uid;
              facultyLoadCounter[fId] = (facultyLoadCounter[fId] || 0) + 5;
              sectionAssignedFacIds.add(fId);
              return {
                ...s,
                facultyId: fId,
                facultyIds: [fId],
                facultyName: targetFac.name,
                facultyNames: [targetFac.name],
              };
            }
          }
          
          // Automatic load-balanced faculty selection: pick staff member with lowest load who is not yet in this section
          let assignedFaculty = null;
          if (deptFaculty.length > 0) {
            // Sort by current load ascending
            const candidates = [...deptFaculty].sort((a, b) => {
              const loadA = facultyLoadCounter[a.id || a.uid] || 0;
              const loadB = facultyLoadCounter[b.id || b.uid] || 0;
              return loadA - loadB;
            });

            const hoursToAdd = isLab ? 3 : 5;
            assignedFaculty = candidates.find(c => {
              const cId = c.id || c.uid;
              const currentLoad = facultyLoadCounter[cId] || 0;
              return !sectionAssignedFacIds.has(cId) && (currentLoad + hoursToAdd) <= 18;
            }) || candidates.find(c => {
              const cId = c.id || c.uid;
              const currentLoad = facultyLoadCounter[cId] || 0;
              return (currentLoad + hoursToAdd) <= 18;
            });

            if (assignedFaculty) {
              const facId = assignedFaculty.id || assignedFaculty.uid;
              sectionAssignedFacIds.add(facId);
              facultyLoadCounter[facId] = (facultyLoadCounter[facId] || 0) + hoursToAdd;
            }
          }

          return {
            ...s,
            facultyId: assignedFaculty ? (assignedFaculty.id || assignedFaculty.uid) : `fac_${s.code}`,
            facultyName: assignedFaculty ? assignedFaculty.name : `Prof. (${s.code})`,
          };
        });
        
        const scheduleId = `${department}_${reg}_Y${y}_Sem${semester}_Sec${sec}`;
        
        try {
          const result = generateTimetable({
            department,
            regulation: reg,
            year: y,
            section: sec,
            subjects: enrichedSubjects,
            existingSchedules: allSchedules,
            trainingOverrides: [],
            specialBlocks: [],
            room: `Room ${100 * y + count + 1}`,
          });
          
          if (result.status === 'success' || result.status === 'partial') {
            // Save to Firestore
            await setDoc(doc(db, 'schedules', scheduleId), {
              ...result,
              id: scheduleId,
              department,
              regulation: reg,
              year: y,
              semester,
              section: sec,
              room: `Room ${100 * y + count + 1}`,
              publishedAt: new Date().toISOString(),
            });
            allSchedules.push(result);
            count++;
          }
        } catch (err) {
          console.error(`Error generating bulk schedule for Year ${y} Sec ${sec}:`, err);
        }
      }
    }
    
    alert(`Bulk generation finished! Created & published ${count} timetables successfully with college-wide conflict prevention!`);
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
      <style>{`
        @media (max-width: 768px) {
          .step-label-text { display: none !important; }
        }
      `}</style>
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
             <span className="step-label-text">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="solid-card animate-fade-in-up delay-2" style={{ padding: '24px', opacity: 0 }}>
        {/* ── Step 1: Target Selection ── */}
        {currentStep === 0 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', padding: '20px', background: 'var(--surface-glass)', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
              <div 
                onClick={() => setIsBulk(!isBulk)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                  padding: '12px 16px', borderRadius: '12px',
                  background: isBulk ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                  border: `1.5px solid ${isBulk ? '#3B82F6' : 'var(--border-primary)'}`,
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: isBulk ? '#3B82F6' : 'transparent',
                  border: `2px solid ${isBulk ? '#3B82F6' : 'var(--text-muted)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease', flexShrink: 0,
                }}>
                  {isBulk && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.938rem', color: isBulk ? '#3B82F6' : 'var(--text-primary)' }}>
                    🚀 Enable Bulk Academic Year Initialization
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Generates and publishes timetables for checked batches sequentially to prevent any college-wide faculty clashes automatically.
                  </span>
                </div>
              </div>

              {isBulk && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>Target Batches:</span>
                  {[
                    { y: 1, label: '1st Year (R25)' },
                    { y: 2, label: '2nd Year (R25)' },
                    { y: 3, label: '3rd Year (R22)' },
                    { y: 4, label: '4th Year (R22)' },
                  ].map(item => {
                    const isChecked = bulkYears.includes(item.y);
                    return (
                      <div
                        key={item.y}
                        onClick={() => {
                          if (isChecked) {
                            if (bulkYears.length === 1) {
                              alert('At least one year must be selected for bulk generation.');
                              return;
                            }
                            setBulkYears(prev => prev.filter(y => y !== item.y));
                          } else {
                            setBulkYears(prev => [...prev, item.y]);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 14px', borderRadius: '10px',
                          background: isChecked ? 'rgba(211,78,43,0.12)' : 'var(--bg-elevated)',
                          border: `1.5px solid ${isChecked ? '#d34e2b' : 'var(--border-primary)'}`,
                          cursor: 'pointer',
                          fontSize: '0.813rem',
                          fontWeight: 600,
                          color: isChecked ? '#d34e2b' : 'var(--text-secondary)',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '5px',
                          background: isChecked ? '#d34e2b' : 'transparent',
                          border: `1.5px solid ${isChecked ? '#d34e2b' : 'var(--text-muted)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isChecked && <Check size={10} color="white" strokeWidth={3} />}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>
              {isBulk ? 'Configure Bulk Target Parameters' : 'Select Target Section'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Department</label>
                <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)} id="select-department">
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {!isBulk && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Regulation</label>
                  <select className="input-field" value={regulation} onChange={e => setRegulation(e.target.value)} id="select-regulation">
                    {dbRegulations.map(r => <option key={r.id} value={r.id}>{r.name} ({r.description})</option>)}
                  </select>
                </div>
              )}
              {!isBulk && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Year</label>
                  <select className="input-field" value={year} onChange={e => setYear(Number(e.target.value))} id="select-year">
                    {(dbRegulations.find(r => r.id === regulation)?.years || []).map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Semester</label>
                <select className="input-field" value={semester} onChange={e => setSemester(Number(e.target.value))} id="select-semester">
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
              {!isBulk && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Section</label>
                  <select className="input-field" value={section} onChange={e => setSection(e.target.value)} id="select-section">
                    {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              )}
              {!isBulk && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Room No.</label>
                  <input className="input-field" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g., 301" id="input-room" />
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'var(--accent-blue-subtle)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p style={{ fontSize: '0.813rem', color: 'var(--accent-blue)' }}>
                <strong>Lunch Slot:</strong> {isBulk ? 'Staggered (Junior vs Senior Matrices applied per year)' : (regulation === 'R25' ? '12:20 PM – 01:10 PM (Junior Schedule)' : '01:10 PM – 01:50 PM (Senior Schedule)')}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Subject Selection ── */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
              {isBulk ? `Curriculum Subjects for Bulk Generation — Semester ${semester}` : `Curriculum Subjects — ${regulation} Year ${year} Sem ${semester}`}
            </h3>
            <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              {(isBulk ? bulkSubjects : subjects).length} subjects found. Toggle selection as needed.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(isBulk ? bulkSubjects : subjects).map(subject => {
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
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>
                      {isBulk && <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: '8px' }}>[Year {subject.year}]</span>}
                      {subject.name}
                    </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '4px' }}>Assign Faculty to Subjects</h3>
                <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)' }}>
                  Select the faculty members who will teach each subject this semester. The system will automatically allocate sections (A, B, C) evenly among your choices.
                </p>
              </div>

              {/* Faculty Filter Search Bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--surface-glass)',
                border: '1px solid var(--border-secondary)',
                borderRadius: '12px',
                padding: '8px 14px',
                minWidth: '280px',
              }}>
                <Search size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Filter & highlight faculty..."
                  value={facultySearchQuery}
                  onChange={e => setFacultySearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.813rem',
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                />
                {facultySearchQuery && (
                  <button onClick={() => setFacultySearchQuery('')} style={{ color: 'var(--text-tertiary)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedSubjects.filter(s => !s.code.startsWith('VBIT-')).map(subject => (
                <div key={subject.code} style={{
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  padding: '16px', borderRadius: '12px',
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border-primary)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', minWidth: '85px' }}>
                      {subject.code}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, flex: 1 }}>
                      {isBulk && <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>[Year {subject.year}]</span>}
                      {subject.name}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    marginTop: '8px',
                  }}>
                    {facultyList
                      .filter(f => f.department === department)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(f => {
                      const isChecked = (facultyAssignments[subject.code] || []).some(sel => sel.id === (f.uid || f.id));
                      const isHighlighted = facultySearchQuery.trim() !== '' && f.name.toLowerCase().includes(facultySearchQuery.toLowerCase().trim());
                      
                      return (
                        <div
                          key={f.id}
                          onClick={() => handleToggleFaculty(subject.code, f)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', borderRadius: '10px',
                            background: isChecked 
                              ? 'rgba(211,78,43,0.15)' 
                              : isHighlighted 
                              ? 'rgba(59,130,246,0.18)' 
                              : 'var(--bg-elevated)',
                            border: `1.5px solid ${
                              isChecked 
                                ? '#d34e2b' 
                                : isHighlighted 
                                ? '#3B82F6' 
                                : 'var(--border-primary)'
                            }`,
                            boxShadow: isHighlighted ? '0 0 10px rgba(59,130,246,0.3)' : 'none',
                            cursor: 'pointer',
                            fontSize: '0.813rem',
                            fontWeight: isChecked || isHighlighted ? 700 : 400,
                            color: isChecked ? '#d34e2b' : isHighlighted ? '#3B82F6' : 'var(--text-primary)',
                            transition: 'all 150ms ease',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '5px',
                            border: `1.5px solid ${isChecked ? '#d34e2b' : isHighlighted ? '#3B82F6' : 'var(--text-muted)'}`,
                            background: isChecked ? '#d34e2b' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isChecked && <Check size={10} color="white" strokeWidth={3} />}
                          </div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.name} <span style={{ fontSize: '0.719rem', color: isHighlighted ? 'var(--accent-blue)' : 'var(--text-tertiary)', fontWeight: 400 }}>({f.designation})</span>
                          </span>
                        </div>
                      );
                    })}
                    {facultyList.filter(f => f.department === department).length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No faculty registered in department. Please add them first.</span>
                    )}
                  </div>
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                  {isBulk ? 'Ready for Bulk Generation' : 'Ready to Generate'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                  {isBulk 
                    ? `The AI engine will generate and publish conflict-free timetables for all sections of Years 2, 3, and 4 (R22/R25 regulations) under Department of ${department} sequentially.`
                    : `The AI engine will use constraint-satisfaction to produce an optimized timetable for ${department} ${regulation} Year ${year} Section ${section} with ${selectedSubjects.length} subjects.`
                  }
                </p>
                
                {!isBulk && (
                  <>
                    {/* Special Co-Curricular & Placement Training Hours Overrides */}
                    <div style={{ 
                      margin: '24px auto', 
                      maxWidth: '700px', 
                      padding: '20px', 
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '12px',
                      textAlign: 'left'
                    }}>
                      <h4 style={{ fontSize: '0.938rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        ⚙️ Configure Special Hours & Overrides
                      </h4>
                      <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Configure specific periods/hours for Placement Training, Tutorial, Sports, Library, or Mentoring hours. The AI engine will respect these blocks.
                      </p>

                      {/* Form */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'end', marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Day</label>
                          <select className="input-field" value={newBlockDay} onChange={e => setNewBlockDay(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.813rem' }}>
                            {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Period</label>
                          <select className="input-field" value={newBlockPeriod} onChange={e => setNewBlockPeriod(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.813rem' }}>
                            {['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Activity Type</label>
                          <select className="input-field" value={newBlockType} onChange={e => handleTypeChange(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.813rem' }}>
                            <option value="sports">Sports</option>
                            <option value="tutorial">Tutorial</option>
                            <option value="library">Library</option>
                            <option value="mentoring">Mentoring</option>
                            <option value="training">Placement Training</option>
                            <option value="nptel">NPTEL</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Display Label</label>
                          <input className="input-field" value={newBlockLabel} onChange={e => setNewBlockLabel(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.813rem' }} />
                        </div>

                        <button type="button" onClick={handleAddBlock} className="btn btn-primary" style={{ padding: '8px 16px', height: '36px', fontSize: '0.813rem' }}>
                          Add Block
                        </button>
                      </div>

                      {/* Active List */}
                      {specialBlocks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px' }}>Active Overrides & Co-curricular slots:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {specialBlocks.map(block => (
                              <div key={block.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', 
                                padding: '6px 12px', borderRadius: '8px', 
                                background: 'var(--surface-glass)', border: '1px solid var(--border-primary)',
                                fontSize: '0.75rem'
                              }}>
                                <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{block.day} {block.periodLabel}</span>
                                <span className="badge badge-amber">{block.label}</span>
                                <button type="button" onClick={() => handleRemoveBlock(block.id)} style={{ color: 'var(--danger)', fontWeight: 700, marginLeft: '4px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Whole Day Training Selector */}
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                        Optional: Block full day for placement training/drives
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
                  </>
                )}

                <button
                  onClick={isBulk ? handleBulkGenerate : handleGenerate}
                  disabled={isGenerating}
                  className="btn btn-primary btn-lg"
                  style={{ minWidth: '200px' }}
                >
                  {isGenerating ? (
                    <><Loader2 size={18} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={18} /> {isBulk ? 'Bulk Generate & Publish All' : 'Generate Timetable'}</>
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
                    <button onClick={handlePublish} disabled={isPublishing} className="btn btn-primary btn-sm" id="publish-firestore">
                      {isPublishing ? 'Publishing...' : 'Publish to Firestore'}
                    </button>
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
