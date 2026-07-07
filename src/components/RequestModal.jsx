import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import DogProfileFields from './DogProfileFields';

const emptyDog = {
  name: '', breed: '', demeanor: '', food_notes: '', medicine_notes: '',
  dog_friendly: true, people_friendly: true, kid_friendly: true, extra_notes: '',
};

// Every request requires: a dog profile + a proposed meet-and-greet time.
// Returning clients can pick a dog they've already saved (see MyDogs.jsx)
// instead of retyping everything -- first-timers just fill in the form,
// which also saves that dog for next time automatically.
// Nothing here marks a day "booked" -- that only happens once the sitter
// approves after the meet-and-greet (see SitterDashboard).
export default function RequestModal({ userId, start, end, onClose, onSubmitted }) {
  const [savedDogs, setSavedDogs] = useState([]);
  const [selectedDogId, setSelectedDogId] = useState('new');
  const [dog, setDog] = useState(emptyDog);
  const [meetGreetAt, setMeetGreetAt] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadClientInfo(); }, []);

  async function loadClientInfo() {
    const { data: dogs } = await supabase.from('dogs').select('*').eq('client_id', userId);
    setSavedDogs(dogs || []);
    if (dogs && dogs.length > 0) setSelectedDogId(dogs[0].id);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      setEmergencyName(profile.emergency_contact_name || '');
      setEmergencyPhone(profile.emergency_contact_phone || '');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!meetGreetAt) { setError('Please propose a meet-and-greet time.'); return; }
    setSubmitting(true);

    // 1. Save/update emergency contact on the profile.
    await supabase.from('profiles').update({
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
    }).eq('id', userId);

    // 2. Use the selected saved dog, or create a new one (which also
    // saves it for next time -- no separate "save" step needed).
    let dogId = selectedDogId;
    if (selectedDogId === 'new') {
      const { data: dogRow, error: dogError } = await supabase
        .from('dogs').insert({ ...dog, client_id: userId }).select().single();
      if (dogError) { setError(dogError.message); setSubmitting(false); return; }
      dogId = dogRow.id;
    }

    // 3. Create the booking request. Server-side trigger (see schema.sql)
    // rejects this automatically if the client already has 3+ open requests --
    // that's the real spam protection, not anything checked here in the UI.
    const { error: bookingError } = await supabase.from('bookings').insert({
      client_id: userId,
      dog_id: dogId,
      start_date: start,
      end_date: end,
      status: 'meet_requested',
      meet_greet_at: meetGreetAt,
      client_notes: notes,
    });
    setSubmitting(false);
    if (bookingError) { setError(bookingError.message); return; }

    onSubmitted?.();
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,58,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 440, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <h3>Request {start} → {end}</h3>

        <h4 style={{ marginBottom: 6 }}>Dog</h4>
        {savedDogs.length > 0 && (
          <select value={selectedDogId} onChange={e => setSelectedDogId(e.target.value)}
            style={{ width: '100%', padding: 9, marginBottom: 10 }}>
            {savedDogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            <option value="new">+ Add a new dog</option>
          </select>
        )}
        {selectedDogId === 'new' && <DogProfileFields dog={dog} setDog={setDog} />}

        <h4 style={{ margin: '16px 0 6px' }}>Emergency contact</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="Name" required value={emergencyName}
            onChange={e => setEmergencyName(e.target.value)} style={{ flex: 1, padding: 9 }} />
          <input placeholder="Phone" required value={emergencyPhone}
            onChange={e => setEmergencyPhone(e.target.value)} style={{ flex: 1, padding: 9 }} />
        </div>

        <h4 style={{ margin: '16px 0 6px' }}>Meet-and-greet</h4>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 6px' }}>
          Required before any stay can be approved, so the sitter can meet your dog first.
        </p>
        <input type="datetime-local" required value={meetGreetAt}
          onChange={e => setMeetGreetAt(e.target.value)} style={{ width: '100%', padding: 9 }} />

        <div style={{ marginTop: 12 }}>
          <label>Notes for the sitter (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4, minHeight: 50 }} />
        </div>

        {error && <p style={{ color: 'var(--rust)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </form>
    </div>
  );
}
