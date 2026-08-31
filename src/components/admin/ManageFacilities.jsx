/**
 * ManageFacilities.jsx — Venue & Auditorium Management Console for Super Admin & Department Admins.
 * Provides full CRUD (Create, Read, Update, Delete) management for campus auditoriums & departmental seminar halls.
 */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { addFacility, updateFacility, deleteFacility, seedDefaultFacilities } from '../../lib/facilityBookingEngine';
import { Building2, Plus, Edit2, Trash2, ShieldCheck, CheckCircle2, XCircle, Search, Sparkles } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const AMENITY_OPTIONS = [
  'AC',
  'Sound System',
  'Stage Lights',
  'HD Projector',
  'Podium',
  'Green Rooms',
  'VIP Lounge',
  'Wi-Fi',
  'LAN Connectivity',
  'Executive Seating',
];

const LOCATION_BLOCKS = [
  'Nalandha Block',
  'Aakash Block',
  'Avishkar Block',
  'IT Block',
  'Pratham Block',
  'Srujan Block',
  'Mechanical Block',
  'Civil Block',
  'Main Administrative Block',
];

export default function ManageFacilities() {
  const { profile } = useAuthStore();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null); // null for Add, facility obj for Edit
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [locationBlock, setLocationBlock] = useState(LOCATION_BLOCKS[0]);
  const [capacity, setCapacity] = useState('300');
  const [department, setDepartment] = useState('Campus-Wide');
  const [selectedAmenities, setSelectedAmenities] = useState(['AC', 'Sound System', 'HD Projector', 'Podium']);
  const [isOperational, setIsOperational] = useState(true);

  // Real-time synchronization with /facilities
  useEffect(() => {
    seedDefaultFacilities().then(() => {
      const unsub = onSnapshot(collection(db, 'facilities'), (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setFacilities(list);
        setLoading(false);
      });
      return () => unsub();
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingFacility(null);
    setName('');
    setLocationBlock(LOCATION_BLOCKS[0]);
    setCapacity('300');
    setDepartment('Campus-Wide');
    setSelectedAmenities(['AC', 'Sound System', 'HD Projector', 'Podium']);
    setIsOperational(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (fac) => {
    setEditingFacility(fac);
    setName(fac.name || '');
    setLocationBlock(fac.locationBlock || LOCATION_BLOCKS[0]);
    setCapacity(String(fac.capacity || '200'));
    setDepartment(fac.department || 'Campus-Wide');
    setSelectedAmenities(fac.amenities || []);
    setIsOperational(fac.isOperational !== false);
    setShowModal(true);
  };

  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter venue name.');

    setSubmitting(true);
    try {
      if (editingFacility) {
        await updateFacility(editingFacility.id, {
          name: name.trim(),
          locationBlock,
          capacity: Number(capacity),
          department,
          amenities: selectedAmenities,
          isOperational,
        });
        alert(`Venue "${name}" updated successfully!`);
      } else {
        await addFacility({
          name: name.trim(),
          locationBlock,
          capacity: Number(capacity),
          department,
          amenities: selectedAmenities,
          isOperational,
        });
        alert(`New venue "${name}" created successfully!`);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error saving venue: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (fac) => {
    if (!confirm(`Are you sure you want to delete "${fac.name}" from the campus venue registry?`)) return;
    try {
      await deleteFacility(fac.id);
      alert(`Venue "${fac.name}" deleted successfully.`);
    } catch (err) {
      console.error(err);
      alert('Error deleting venue: ' + err.message);
    }
  };

  const filteredFacilities = facilities.filter(f =>
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.locationBlock?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} style={{ color: 'var(--accent-primary)' }} />
            Campus Auditoriums & Seminar Halls Registry
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Super Admin & Department Admin CRUD Console: Manage campus auditoriums, departmental halls, capacities, and amenities.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Add New Auditorium / Hall
        </button>
      </div>

      {/* Search & Filter */}
      <div className="solid-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by venue name (e.g. Nalandha), Block, or Department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Total Campus Venues: {facilities.length}
          </div>
        </div>
      </div>

      {/* Facilities Grid / Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading campus venue registry...</p>
      ) : filteredFacilities.length === 0 ? (
        <div className="solid-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No venues found. Click "Add New Auditorium / Hall" to register a venue.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {filteredFacilities.map(fac => (
            <div key={fac.id} className="solid-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span className={`badge badge-${fac.isOperational !== false ? 'green' : 'amber'}`}>
                    {fac.isOperational !== false ? 'Operational' : 'Maintenance / Offline'}
                  </span>
                  <span className="badge badge-purple">{fac.department || 'Campus-Wide'}</span>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {fac.name}
                </h3>
                <div style={{ fontSize: '0.813rem', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '10px' }}>
                  📍 {fac.locationBlock} • 👥 Capacity: {fac.capacity} Seats
                </div>

                {/* Amenities Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {fac.amenities?.map(am => (
                    <span key={am} style={{ fontSize: '0.688rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                      ✓ {am}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
                <button
                  onClick={() => handleOpenEditModal(fac)}
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(fac)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Venue Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="solid-card animate-fade-in-up" style={{ maxWidth: '560px', width: '100%', padding: '24px', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
              {editingFacility ? 'Edit Venue / Auditorium' : 'Add New Campus Venue / Auditorium'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Venue / Auditorium Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Subhash Chandra Bose Seminar Hall"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Location Block *
                  </label>
                  <select className="input-field" value={locationBlock} onChange={e => setLocationBlock(e.target.value)}>
                    {LOCATION_BLOCKS.map(blk => (
                      <option key={blk} value={blk}>{blk}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 300"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Department / Allocation
                </label>
                <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                  {['Campus-Wide', 'CSE-DS', 'CSE', 'CSE-AIML', 'CSE-CS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Amenities Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Select Venue Facilities & Amenities
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {AMENITY_OPTIONS.map(am => (
                    <label key={am} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(am)}
                        onChange={() => handleAmenityToggle(am)}
                      />
                      {am}
                    </label>
                  ))}
                </div>
              </div>

              {/* Operational Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="op-status"
                  checked={isOperational}
                  onChange={e => setIsOperational(e.target.checked)}
                />
                <label htmlFor="op-status" style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Operational / Available for Booking
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : editingFacility ? 'Update Venue' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
