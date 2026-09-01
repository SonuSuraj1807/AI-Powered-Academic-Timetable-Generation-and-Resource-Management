/**
 * ExamRoomManagement — CRUD management page for examination rooms.
 *
 * Allows admins to add, edit, and delete exam rooms organized by
 * VBIT building blocks (Aakash, Pratham, Srujan, Nirmithi, Avishkar).
 * Rooms are stored in Firestore `exam_rooms` collection.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, Trash2, Edit3, Save, X, Search,
  Layers, Check, AlertTriangle, Loader2, ChevronDown
} from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs, writeBatch
} from 'firebase/firestore';
import { EXAM_BLOCKS, seedDefaultExamRooms } from '../../lib/scheduling/SeatingAllocationEngine';

const FLOOR_OPTIONS = [
  { value: 0, label: 'Ground Floor' },
  { value: 1, label: '1st Floor' },
  { value: 2, label: '2nd Floor' },
  { value: 3, label: '3rd Floor' },
  { value: 4, label: '4th Floor' },
];

const BLOCK_COLORS = {
  Avishkar: '#F59E0B',
  Nirmithi: '#E8522E',
  Srujan: '#8B5CF6',
  Pragna: '#EC4899',
  Prathibha: '#6366F1',
  Pratham: '#10B981',
  Aakash: '#3B82F6',
  Prashasan: '#14B8A6',
  Nalandha: '#F97316',
};

const DEFAULT_ROOM = {
  roomNumber: '',
  block: 'Srujan',
  floor: 1,
  rows: 6,
  cols: 4,
  capacity: 24,
  isActive: true,
};

export default function ExamRoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBlock, setFilterBlock] = useState('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_ROOM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Firestore listener & auto-seed
  useEffect(() => {
    seedDefaultExamRooms(db, getDocs, collection, doc, writeBatch).then(() => {
      const unsub = onSnapshot(collection(db, 'exam_rooms'), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRooms(data);
        setLoading(false);
      });
      return () => unsub();
    });
  }, []);

  // Update capacity when rows/cols change
  useEffect(() => {
    setFormData(prev => ({ ...prev, capacity: prev.rows * prev.cols }));
  }, [formData.rows, formData.cols]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms
      .filter(r => filterBlock === 'ALL' || r.block === filterBlock)
      .filter(r =>
        search === '' ||
        r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.block.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (a.block !== b.block) return a.block.localeCompare(b.block);
        if (a.floor !== b.floor) return (a.floor || 0) - (b.floor || 0);
        return String(a.roomNumber).localeCompare(String(b.roomNumber));
      });
  }, [rooms, filterBlock, search]);

  // Stats
  const stats = useMemo(() => {
    const active = rooms.filter(r => r.isActive !== false);
    return {
      total: rooms.length,
      active: active.length,
      totalCapacity: active.reduce((s, r) => s + (r.capacity || 24), 0),
      byBlock: EXAM_BLOCKS.map(b => ({
        ...b,
        count: rooms.filter(r => r.block === b.name).length,
        capacity: rooms.filter(r => r.block === b.name && r.isActive !== false)
          .reduce((s, r) => s + (r.capacity || 24), 0),
      })),
    };
  }, [rooms]);

  const openAddModal = () => {
    setEditingRoom(null);
    setFormData({ ...DEFAULT_ROOM });
    setShowModal(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      block: room.block,
      floor: room.floor ?? 1,
      rows: room.rows ?? 6,
      cols: room.cols ?? 4,
      capacity: room.capacity ?? 24,
      isActive: room.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.roomNumber.trim()) return;
    setSaving(true);
    try {
      const data = {
        roomNumber: formData.roomNumber.trim(),
        block: formData.block,
        floor: Number(formData.floor),
        rows: Number(formData.rows),
        cols: Number(formData.cols),
        capacity: Number(formData.rows) * Number(formData.cols),
        isActive: formData.isActive,
        updatedAt: new Date().toISOString(),
      };

      if (editingRoom) {
        await updateDoc(doc(db, 'exam_rooms', editingRoom.id), data);
      } else {
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'exam_rooms'), data);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Save room error:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (roomId) => {
    try {
      await deleteDoc(doc(db, 'exam_rooms', roomId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete room error:', err);
    }
  };

  const handleToggleActive = async (room) => {
    try {
      await updateDoc(doc(db, 'exam_rooms', room.id), {
        isActive: !(room.isActive !== false),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={24} style={{ color: '#8B5CF6' }} />
          Exam Room Management
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Configure examination halls across VBIT blocks for seating plan allocation.
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px', opacity: 0 }}>
        <div className="solid-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Rooms</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3B82F6' }}>{stats.total}</div>
        </div>
        <div className="solid-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Rooms</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>{stats.active}</div>
        </div>
        <div className="solid-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Seating Capacity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8B5CF6' }}>{stats.totalCapacity}</div>
        </div>
        <div className="solid-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Max Students / Session</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#E8522E' }}>{stats.totalCapacity}</div>
        </div>
      </div>

      {/* ── Block Distribution ── */}
      <div className="solid-card animate-fade-in-up delay-2" style={{ padding: '16px', marginBottom: '20px', opacity: 0 }}>
        <div style={{ fontSize: '0.813rem', fontWeight: 700, marginBottom: '12px' }}>Block Distribution</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {stats.byBlock.map(b => (
            <div key={b.id} style={{
              flex: '1 1 140px',
              padding: '12px',
              borderRadius: '10px',
              background: `${BLOCK_COLORS[b.name]}10`,
              border: `1px solid ${BLOCK_COLORS[b.name]}30`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BLOCK_COLORS[b.name] }}>{b.name}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{b.count}</div>
              <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>{b.capacity} seats</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="solid-card animate-fade-in-up delay-3" style={{ padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', opacity: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: '10px', padding: '7px 12px', flex: '1 1 220px',
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.813rem', color: 'var(--text-primary)', width: '100%' }}
            id="exam-room-search"
          />
        </div>

        <select
          className="input-field"
          value={filterBlock}
          onChange={e => setFilterBlock(e.target.value)}
          style={{ width: '160px', padding: '7px 12px', fontSize: '0.813rem' }}
          id="exam-room-block-filter"
        >
          <option value="ALL">All Blocks</option>
          {EXAM_BLOCKS.map(b => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>

        <button onClick={openAddModal} className="btn btn-primary" id="add-exam-room-btn">
          <Plus size={16} /> Add Room
        </button>
      </div>

      {/* ── Rooms Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-blue)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="solid-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Building2 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>No Rooms Found</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.813rem', marginTop: '4px' }}>
            {rooms.length === 0 ? 'Add your first exam room to get started.' : 'No rooms match your filters.'}
          </p>
          {rooms.length === 0 && (
            <button onClick={openAddModal} className="btn btn-primary" style={{ marginTop: '16px' }}>
              <Plus size={16} /> Add First Room
            </button>
          )}
        </div>
      ) : (
        <div className="solid-card animate-fade-in-up" style={{ overflow: 'hidden' }}>
          <div className="timetable-container" style={{ border: 'none' }}>
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Room No.</th>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Grid</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room, idx) => (
                  <tr key={room.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.875rem' }}>{room.roomNumber}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        background: `${BLOCK_COLORS[room.block] || '#666'}15`,
                        color: BLOCK_COLORS[room.block] || '#666',
                      }}>
                        <Building2 size={12} />
                        {room.block}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.813rem' }}>
                      {FLOOR_OPTIONS.find(f => f.value === room.floor)?.label || `Floor ${room.floor}`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {room.rows || 6} × {room.cols || 4}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: '1rem',
                        color: (room.capacity || 24) >= 24 ? '#10B981' : '#F59E0B',
                      }}>
                        {room.capacity || 24}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(room)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.688rem', fontWeight: 600,
                          background: room.isActive !== false ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                          color: room.isActive !== false ? 'var(--success)' : 'var(--danger)',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        {room.isActive !== false ? <><Check size={10} /> Active</> : <><X size={10} /> Inactive</>}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(room)}
                          style={{
                            padding: '5px 8px', borderRadius: '6px',
                            background: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)',
                            transition: 'all 150ms ease',
                          }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        {deleteConfirm === room.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleDelete(room.id)}
                              style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--danger-subtle)', color: 'var(--danger)' }}
                              title="Confirm Delete"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--surface-glass)', color: 'var(--text-muted)' }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(room.id)}
                            style={{
                              padding: '5px 8px', borderRadius: '6px',
                              background: 'var(--danger-subtle)', color: 'var(--danger)',
                              transition: 'all 150ms ease',
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="solid-card animate-fade-in-scale"
            style={{ width: '480px', maxWidth: '95vw', padding: '28px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} style={{ color: '#8B5CF6' }} />
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Room Number */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Room Number *</label>
                <input
                  className="input-field"
                  placeholder="e.g. 301, A-201, Lab-5"
                  value={formData.roomNumber}
                  onChange={e => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                  id="room-number-input"
                />
              </div>

              {/* Block */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Block *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {EXAM_BLOCKS.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setFormData(prev => ({ ...prev, block: b.name }))}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.813rem', fontWeight: 600,
                        background: formData.block === b.name ? `${BLOCK_COLORS[b.name]}20` : 'var(--surface-glass)',
                        color: formData.block === b.name ? BLOCK_COLORS[b.name] : 'var(--text-secondary)',
                        border: `1.5px solid ${formData.block === b.name ? BLOCK_COLORS[b.name] : 'var(--border-primary)'}`,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floor */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Floor</label>
                <select
                  className="input-field"
                  value={formData.floor}
                  onChange={e => setFormData(prev => ({ ...prev, floor: Number(e.target.value) }))}
                  id="room-floor-select"
                >
                  {FLOOR_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Grid Configuration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Rows</label>
                  <input
                    className="input-field"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.rows}
                    onChange={e => {
                      const v = Number(e.target.value) || 6;
                      setFormData(prev => ({ ...prev, rows: v, capacity: v * prev.cols }));
                    }}
                    id="room-rows-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Columns</label>
                  <input
                    className="input-field"
                    type="number"
                    min={1}
                    max={8}
                    value={formData.cols}
                    onChange={e => {
                      const v = Number(e.target.value) || 4;
                      setFormData(prev => ({ ...prev, cols: v, capacity: prev.rows * v }));
                    }}
                    id="room-cols-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Capacity</label>
                  <div style={{
                    padding: '10px 14px', borderRadius: '12px',
                    background: 'var(--accent-green-subtle)',
                    color: 'var(--accent-green)',
                    fontWeight: 800, fontSize: '1.125rem',
                    textAlign: 'center',
                  }}>
                    {formData.rows * formData.cols}
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  style={{
                    width: '40px', height: '22px', borderRadius: '11px',
                    background: formData.isActive ? 'var(--accent-green)' : 'var(--text-muted)',
                    position: 'relative', transition: 'background 200ms ease',
                  }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white',
                    position: 'absolute', top: '3px',
                    left: formData.isActive ? '21px' : '3px',
                    transition: 'left 200ms ease',
                  }} />
                </button>
                <span style={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Room is {formData.isActive ? 'active' : 'inactive'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={saving || !formData.roomNumber.trim()}
                id="save-room-btn"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingRoom ? 'Update Room' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
