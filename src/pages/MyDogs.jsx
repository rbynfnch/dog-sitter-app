import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import DogProfileFields from '../components/DogProfileFields';

const emptyDog = {
  name: '', breed: '', demeanor: '', food_notes: '', medicine_notes: '',
  dog_friendly: true, people_friendly: true, kid_friendly: true, extra_notes: '',
};

// Lets a returning client save a dog's profile once and reuse it on future
// requests, instead of retyping everything each time (see RequestModal.jsx,
// which now offers "use a saved dog" pulling from this same `dogs` table).
export default function MyDogs() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = not editing, 'new' = adding
  const [draft, setDraft] = useState(emptyDog);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (user) loadDogs(); }, [user]);

  async function loadDogs() {
    const { data } = await supabase
      .from('dogs').select('*').eq('client_id', user.id).order('created_at', { ascending: true });
    setDogs(data || []);
  }

  function startAdd() {
    setDraft(emptyDog);
    setEditingId('new');
    setError('');
  }

  function startEdit(dog) {
    setDraft(dog);
    setEditingId(dog.id);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDog);
    setError('');
  }

  async function saveDraft() {
    if (!draft.name.trim()) { setError("Give your dog a name first."); return; }
    setSaving(true);
    setError('');
    if (editingId === 'new') {
      const { error } = await supabase.from('dogs').insert({ ...draft, client_id: user.id });
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { id, client_id, created_at, ...fields } = draft;
      const { error } = await supabase.from('dogs').update(fields).eq('id', editingId);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    cancelEdit();
    loadDogs();
  }

  async function deleteDog(id) {
    if (!confirm('Remove this dog profile? This does not affect past bookings, only future requests.')) return;
    await supabase.from('dogs').delete().eq('id', id);
    loadDogs();
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>My dogs</h2>
        <Link to="/" className="btn btn-ghost">Back to calendar</Link>
      </div>

      {dogs.length === 0 && editingId === null && (
        <p style={{ color: 'var(--ink-soft)' }}>No saved dogs yet. Add one so you don't have to retype it on your next request.</p>
      )}

      {dogs.map(dog => (
        editingId === dog.id ? (
          <div key={dog.id} className="card" style={{ marginBottom: 14 }}>
            <DogProfileFields dog={draft} setDog={setDraft} />
            {error && <p style={{ color: 'var(--rust)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={saveDraft}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <div key={dog.id} className="card" style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{dog.name} {dog.breed && `· ${dog.breed}`}</p>
            {dog.demeanor && <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--ink-soft)' }}>{dog.demeanor}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => startEdit(dog)}>Edit</button>
              <button className="btn btn-danger" onClick={() => deleteDog(dog.id)}>Remove</button>
            </div>
          </div>
        )
      ))}

      {editingId === 'new' ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h4 style={{ marginTop: 0 }}>Add a dog</h4>
          <DogProfileFields dog={draft} setDog={setDraft} />
          {error && <p style={{ color: 'var(--rust)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? 'Saving...' : 'Save dog'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={startAdd}>+ Add a dog</button>
      )}
    </div>
  );
}
