import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Layers, Plus, Trash2, Calendar } from 'lucide-react';
import { WEEKDAYS } from '../../data/curriculumSeed';

export default function TrainingOverridesPage() {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [day, setDay] = useState('Friday');
  const [description, setDescription] = useState('Placement Training Day');

  // Real-time syncing with Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_overrides'), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setOverrides(list);
      setLoading(false);
    }, (err) => {
      console.error('Error in onSnapshot overrides:', err);
      setLoading(false);
      alert('Firestore Permission Error: ' + err.message);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    try {
      await addDoc(collection(db, 'training_overrides'), {
        day,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      });
      setDescription('');
    } catch (err) {
      console.error(err);
      alert('Error adding training override: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this override?')) return;
    try {
      await deleteDoc(doc(db, 'training_overrides', id));
    } catch (err) {
      console.error(err);
      alert('Error deleting override: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={24} style={{ color: 'var(--accent-primary)' }} />
          Training Overrides
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Manage whole-day overrides for placement training, guest lecture events, or exams.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Overrides List */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Configured Whole-Day Overrides</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading overrides...</p>
          ) : overrides.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No whole-day overrides active.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overrides.map(ovr => (
                <div key={ovr.id} style={{
                  display: 'flex', justifyItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface-glass)', border: '1px solid var(--border-primary)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-amber)' }}>
                      {ovr.day}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {ovr.description}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(ovr.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Form */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            Add Override
          </h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Day</label>
              <select className="input-field" value={day} onChange={e => setDay(e.target.value)}>
                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Override Description</label>
              <input className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Placement Drive Week" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Apply Override
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
