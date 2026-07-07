import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import MessageThread from '../components/MessageThread';

// A small CRM: every client who's ever signed up, their dogs' full
// profiles, and a direct line to message them -- independent of any
// specific booking. Sitter-only.
export default function SitterClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [dogsByClient, setDogsByClient] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const { data: clientRows } = await supabase
      .from('profiles').select('*').eq('role', 'client').order('full_name', { ascending: true });
    setClients(clientRows || []);

    const { data: dogRows } = await supabase.from('dogs').select('*');
    const map = {};
    (dogRows || []).forEach(d => {
      if (!map[d.client_id]) map[d.client_id] = [];
      map[d.client_id].push(d);
    });
    setDogsByClient(map);
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Clients</h2>
        <Link to="/" className="btn btn-ghost">Back to calendar</Link>
      </div>

      {clients.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No clients have signed up yet.</p>}

      {clients.map(c => {
        const dogs = dogsByClient[c.id] || [];
        const isOpen = expandedId === c.id;
        return (
          <div key={c.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedId(isOpen ? null : c.id)}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{c.full_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  {dogs.length} dog{dogs.length !== 1 ? 's' : ''} on file
                  {c.emergency_contact_name && ` · Emergency: ${c.emergency_contact_name} (${c.emergency_contact_phone})`}
                </p>
              </div>
              <span style={{ color: 'var(--ink-soft)', fontSize: 18 }}>{isOpen ? '−' : '+'}</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                {dogs.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No dog profiles saved yet.</p>}
                {dogs.map(dog => (
                  <div key={dog.id} style={{ marginBottom: 12, padding: 10, background: 'var(--paper)', borderRadius: 8 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13.5 }}>
                      {dog.name} {dog.breed && `· ${dog.breed}`}
                    </p>
                    {dog.demeanor && <p style={{ margin: '0 0 3px', fontSize: 12.5 }}><strong>Demeanor:</strong> {dog.demeanor}</p>}
                    {dog.food_notes && <p style={{ margin: '0 0 3px', fontSize: 12.5 }}><strong>Food:</strong> {dog.food_notes}</p>}
                    {dog.medicine_notes && <p style={{ margin: '0 0 3px', fontSize: 12.5 }}><strong>Medicine:</strong> {dog.medicine_notes}</p>}
                    <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      {dog.dog_friendly ? '✓' : '✕'} Dog-friendly &nbsp;
                      {dog.people_friendly ? '✓' : '✕'} People-friendly &nbsp;
                      {dog.kid_friendly ? '✓' : '✕'} Kid-friendly
                    </p>
                    {dog.extra_notes && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>{dog.extra_notes}</p>}
                  </div>
                ))}

                {user && <MessageThread clientId={c.id} userId={user.id} collapsedByDefault={false} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
