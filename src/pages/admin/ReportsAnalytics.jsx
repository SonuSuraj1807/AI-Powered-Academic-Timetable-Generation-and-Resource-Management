import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  BarChart3, Users, Clock, Home, CheckCircle2, Building2, ChevronDown, ChevronUp, 
  Search, Filter, Layers, CheckCircle, AlertCircle, Sparkles, BookOpen
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const VBIT_BLOCKS_REGISTRY = [
  {
    id: 'AVISHKAR',
    name: 'Avishkar Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: [
      '001', '002', '101', '102', '201', '202', '208', '301', '304', '305', '306', '401', '407', '409'
    ]
  },
  {
    id: 'NIRMITHI',
    name: 'Nirmithi Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['003', '103', '203', '302', '402']
  },
  {
    id: 'SRUJAN',
    name: 'Srujan Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['004', '104', '204', '303', '403']
  },
  {
    id: 'PRAGNA',
    name: 'Pragna Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['005', '105', '205', '307', '404']
  },
  {
    id: 'PRATHIBHA',
    name: 'Prathibha Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['006', '106', '206', '308', '405']
  },
  {
    id: 'PRATHAM',
    name: 'Pratham Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['007', '107', '207', '309', '406']
  },
  {
    id: 'AAKASH',
    name: 'Aakash Block',
    type: 'Academic Classrooms & Labs',
    badge: 'Academic',
    defaultRooms: ['008', '108', '209', '310', '408']
  },
  {
    id: 'PRASHASAN',
    name: 'Prashasan Block',
    type: '20 Computer & Engg Labs + Central Library',
    badge: 'Labs & Library',
    defaultRooms: [
      'Central Library',
      ...Array.from({ length: 20 }, (_, i) => `Lab ${String(i + 1).padStart(2, '0')}`)
    ]
  },
  {
    id: 'NALANDHA',
    name: 'Nalandha Block',
    type: 'Main Auditorium, SAC & IIIC Offices',
    badge: 'Admin & Events',
    defaultRooms: [
      'Main Auditorium', 'SAC Director Console', 'IIIC Staff Room 1', 'IIIC Staff Room 2'
    ]
  }
];

// Determine floor category from room code/number
const getFloorFromRoom = (roomStr) => {
  if (!roomStr) return 'Ground Floor (001-099)';
  const str = String(roomStr).trim();
  
  if (str.toLowerCase().includes('library')) return '1st Floor (Central Library)';
  if (str.toLowerCase().includes('auditorium')) return 'Ground Floor (Auditorium)';
  if (str.toLowerCase().includes('sac') || str.toLowerCase().includes('iiic')) return '2nd Floor (Admin Wing)';
  
  const cleanNum = str.replace(/[^0-9]/g, '');
  if (!cleanNum) return 'Ground Floor (001-099)';
  
  const num = parseInt(cleanNum, 10);
  if (num < 100) return 'Ground Floor (001-099)';
  if (num >= 100 && num < 200) return '1st Floor (101-199)';
  if (num >= 200 && num < 300) return '2nd Floor (201-299)';
  if (num >= 300 && num < 400) return '3rd Floor (301-399)';
  if (num >= 400 && num < 500) return '4th Floor (401-499)';
  return 'Ground Floor (001-099)';
};

export default function ReportsAnalytics() {
  const [schedules, setSchedules] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedBlockFilter, setSelectedBlockFilter] = useState('ALL');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ALLOCATED' | 'AVAILABLE'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBlocks, setExpandedBlocks] = useState({});

  useEffect(() => {
    const unsubSched = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setSchedules(list);
    });

    const unsubFaculty = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setFaculty(list);
      setLoading(false);
    });

    return () => {
      unsubSched();
      unsubFaculty();
    };
  }, []);

  // Compute allocated rooms mapping with schedule metadata
  const allocatedRoomMap = useMemo(() => {
    const map = {};

    const registerAllocation = (rawRoom, dept, year, sec, reg, source = 'Timetable') => {
      if (!rawRoom) return;
      const str = String(rawRoom).replace(/^Room\s+/i, '').trim();
      if (!str) return;

      const numOnly = str.replace(/[^0-9]/g, '');
      const paddedNum = numOnly ? String(numOnly).padStart(3, '0') : null;

      const roomData = {
        allocated: true,
        department: dept || 'CSE-DS',
        year: year || '4',
        section: sec || 'A',
        regulation: reg || 'R22',
        source,
      };

      map[str] = roomData;
      if (paddedNum) map[paddedNum] = roomData;
      if (numOnly) map[numOnly] = roomData;
    };

    schedules.forEach(sched => {
      if (sched.room) {
        registerAllocation(sched.room, sched.department, sched.year, sched.section, sched.regulation, 'Academic Schedule');
      }
      if (sched.grid) {
        Object.keys(sched.grid).forEach(day => {
          (sched.grid[day] || []).forEach(slot => {
            if (slot && slot.room) {
              registerAllocation(slot.room, sched.department, sched.year, sched.section, sched.regulation, 'Lab/Class Slot');
            }
          });
        });
      }
    });

    return map;
  }, [schedules]);

  // Expand / Collapse block accordion toggle
  const toggleBlockExpand = (blockId) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const profile = useAuthStore(state => state.profile);
  const isAuthority = profile?.role === 'superadmin' || profile?.role === 'principal';
  const userDept = profile?.department || 'CSE-DS';

  const facultyDeptMap = useMemo(() => {
    const map = {};
    faculty.forEach(f => {
      if (f.name) {
        map[f.name.trim().toLowerCase()] = f.department;
      }
    });
    return map;
  }, [faculty]);

  // Compute Faculty Workloads
  const facultyHours = useMemo(() => {
    const hours = {};
    const relevantSchedules = isAuthority
      ? schedules
      : schedules.filter(s => s.department === userDept);

    relevantSchedules.forEach(sched => {
      if (!sched.grid) return;
      Object.keys(sched.grid).forEach(day => {
        sched.grid[day].forEach(slot => {
          if (slot && slot.facultyName && slot.type !== 'break' && slot.type !== 'lunch') {
            const names = slot.facultyName.split(',').map(n => n.trim()).filter(Boolean);
            names.forEach(fac => {
              const facDept = facultyDeptMap[fac.toLowerCase()] || sched.department;
              if (!isAuthority && facDept !== userDept) return;

              if (!hours[fac]) {
                hours[fac] = { periods: 0, department: facDept || sched.department };
              }
              hours[fac].periods += 1;
            });
          }
        });
      });
    });
    return hours;
  }, [schedules, isAuthority, userDept, facultyDeptMap]);

  // Total Campus Metrics Calculated Dynamically
  const totalAllocatedRoomsCount = useMemo(() => {
    let count = 0;
    VBIT_BLOCKS_REGISTRY.forEach(block => {
      block.defaultRooms.forEach(roomCode => {
        const cleanCode = String(roomCode).replace(/^Room\s+/i, '').trim();
        const numOnly = cleanCode.replace(/[^0-9]/g, '');
        const paddedNum = numOnly ? String(numOnly).padStart(3, '0') : null;
        if (allocatedRoomMap[cleanCode] || (paddedNum && allocatedRoomMap[paddedNum]) || (numOnly && allocatedRoomMap[numOnly])) {
          count++;
        }
      });
    });
    return count;
  }, [allocatedRoomMap]);

  const totalCampusRoomsCount = VBIT_BLOCKS_REGISTRY.reduce((acc, b) => acc + b.defaultRooms.length, 0);
  const roomUtilization = totalCampusRoomsCount > 0 ? Math.round((totalAllocatedRoomsCount / totalCampusRoomsCount) * 100) : 0;

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '20px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={24} style={{ color: 'var(--accent-primary)' }} />
          Campus Resource Analytics & Room Allocation Matrix
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time institutional diagnostics across VBIT Academic Blocks, Prashasan Labs, Nalandha Administrative Center, and teaching staff workloads.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="solid-card" style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', background: 'rgba(59,130,246,0.12)', borderRadius: '14px', color: '#3B82F6' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Active Timetables</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{schedules.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', background: 'rgba(16,185,129,0.12)', borderRadius: '14px', color: '#10B981' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Teaching Staff Pool</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{faculty.length}</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', background: 'rgba(232,82,46,0.12)', borderRadius: '14px', color: '#E8522E' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Campus Blocks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{VBIT_BLOCKS_REGISTRY.length} Blocks</div>
          </div>
        </div>

        <div className="solid-card" style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', background: 'rgba(139,92,246,0.12)', borderRadius: '14px', color: '#8B5CF6' }}>
            <Home size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Room Occupancy Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{roomUtilization}%</div>
          </div>
        </div>
      </div>

      {/* Main Split Console: Room Matrix & Faculty Loads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT PANEL: HIERARCHICAL BLOCK & FLOOR ROOM ALLOCATION MATRIX */}
        <div className="solid-card" style={{ gridColumn: 'span 7 / span 7', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                Campus Room Allocation Matrix (Block & Floor Hierarchy)
              </h2>
              <p style={{ fontSize: '0.781rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Expand campus blocks to inspect floor-by-floor room availability and section assignments.
              </p>
            </div>
            
            <span className="badge badge-purple" style={{ fontWeight: 700 }}>
              {totalAllocatedRoomsCount} / {totalCampusRoomsCount} Rooms Occupied
            </span>
          </div>

          {/* Interactive Filter Toolbar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '20px', background: 'var(--surface-glass)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search Room (e.g. 304, Lab 01)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.813rem' }}
              />
            </div>

            {/* Block Filter */}
            <select
              className="input-field"
              value={selectedBlockFilter}
              onChange={e => setSelectedBlockFilter(e.target.value)}
              style={{ fontSize: '0.813rem' }}
            >
              <option value="ALL">All 9 VBIT Blocks</option>
              {VBIT_BLOCKS_REGISTRY.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Floor Filter */}
            <select
              className="input-field"
              value={selectedFloorFilter}
              onChange={e => setSelectedFloorFilter(e.target.value)}
              style={{ fontSize: '0.813rem' }}
            >
              <option value="ALL">All Floors (Ground - 4th)</option>
              <option value="Ground Floor (001-099)">Ground Floor (001-099)</option>
              <option value="1st Floor (101-199)">1st Floor (101-199)</option>
              <option value="2nd Floor (201-299)">2nd Floor (201-299)</option>
              <option value="3rd Floor (301-399)">3rd Floor (301-399)</option>
              <option value="4th Floor (401-499)">4th Floor (401-499)</option>
            </select>
          </div>

          {/* BLOCK ACCORDION LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {VBIT_BLOCKS_REGISTRY.filter(b => selectedBlockFilter === 'ALL' || b.id === selectedBlockFilter).map(block => {
              const isExpanded = selectedBlockFilter !== 'ALL' ? (expandedBlocks[block.id] !== false) : !!expandedBlocks[block.id];

              // Group block rooms by floor
              const roomsByFloor = {};
              block.defaultRooms.forEach(roomCode => {
                const floorName = getFloorFromRoom(roomCode);
                if (!roomsByFloor[floorName]) roomsByFloor[floorName] = [];
                
                const cleanCode = String(roomCode).replace(/^Room\s+/i, '').trim();
                const numOnly = cleanCode.replace(/[^0-9]/g, '');
                const paddedNum = numOnly ? String(numOnly).padStart(3, '0') : null;
                const allocation = allocatedRoomMap[cleanCode] || (paddedNum && allocatedRoomMap[paddedNum]) || (numOnly && allocatedRoomMap[numOnly]);

                roomsByFloor[floorName].push({
                  roomCode,
                  isAllocated: !!allocation,
                  details: allocation || null,
                });
              });

              // Filter rooms based on search & floor filters
              let blockTotalRooms = 0;
              let blockAllocatedRooms = 0;

              Object.keys(roomsByFloor).forEach(floorKey => {
                roomsByFloor[floorKey] = roomsByFloor[floorKey].filter(r => {
                  if (selectedFloorFilter !== 'ALL' && floorKey !== selectedFloorFilter) return false;
                  if (statusFilter === 'ALLOCATED' && !r.isAllocated) return false;
                  if (statusFilter === 'AVAILABLE' && r.isAllocated) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const rCode = r.roomCode.toLowerCase();
                    const dept = r.details?.department?.toLowerCase() || '';
                    if (!rCode.includes(q) && !dept.includes(q)) return false;
                  }
                  return true;
                });

                blockTotalRooms += roomsByFloor[floorKey].length;
                blockAllocatedRooms += roomsByFloor[floorKey].filter(r => r.isAllocated).length;
              });

              if (blockTotalRooms === 0) return null;

              return (
                <div
                  key={block.id}
                  style={{
                    borderRadius: '14px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Block Header (Collapsible Clickable Bar) */}
                  <div
                    onClick={() => toggleBlockExpand(block.id)}
                    style={{
                      padding: '14px 18px',
                      background: 'var(--surface-glass)',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: isExpanded ? '1px solid var(--border-primary)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.938rem', color: 'var(--text-primary)' }}>
                          {block.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {block.type}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge badge-${block.badge === 'Labs & Library' ? 'blue' : block.badge === 'Admin & Events' ? 'amber' : 'purple'}`}>
                        {block.badge}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {blockAllocatedRooms} / {blockTotalRooms} Occupied
                      </span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Block Body (Floors Accordion Sub-Sections) */}
                  {isExpanded && (
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.keys(roomsByFloor).map(floorName => {
                        const floorRooms = roomsByFloor[floorName];
                        if (floorRooms.length === 0) return null;

                        return (
                          <div key={floorName}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                              {floorName}
                            </div>

                            {/* Room Grid Tiles */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                              {floorRooms.map(rm => (
                                <div
                                  key={rm.roomCode}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    background: rm.isAllocated ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-glass)',
                                    border: `1px solid ${rm.isAllocated ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.813rem', color: 'var(--text-primary)' }}>
                                      Room {rm.roomCode}
                                    </span>
                                    <span className={`badge badge-${rm.isAllocated ? 'green' : 'gray'}`} style={{ fontSize: '0.65rem' }}>
                                      {rm.isAllocated ? 'Allocated' : 'Available'}
                                    </span>
                                  </div>

                                  {rm.isAllocated && rm.details ? (
                                    <div style={{ fontSize: '0.719rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                        {rm.details.department} (Yr {rm.details.year}-{rm.details.section})
                                      </div>
                                      <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)' }}>
                                        Reg: {rm.details.regulation}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                      Open for allocation
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: FACULTY TEACHING LOADS (Sticky Bounded Container) */}
        <div style={{ gridColumn: 'span 5 / span 5', position: 'sticky', top: '80px', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <div className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 120px)', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Users size={18} style={{ color: 'var(--accent-primary)' }} />
              Faculty Teaching Workloads (Periods/Week)
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(facultyHours).map(fac => (
                <div
                  key={fac}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--surface-glass)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-primary)',
                    fontSize: '0.813rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {fac}
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                        {facultyHours[fac].department}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.719rem', color: 'var(--text-tertiary)' }}>Scheduled Teaching Load</div>
                  </div>
                  <span className="badge badge-blue" style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                    {facultyHours[fac].periods} periods
                  </span>
                </div>
              ))}
              {Object.keys(facultyHours).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.813rem', textAlign: 'center', padding: '20px' }}>
                  No active faculty workloads recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
