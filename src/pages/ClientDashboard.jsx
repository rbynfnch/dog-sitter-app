import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Calendar from '../components/Calendar';
import RequestModal from '../components/RequestModal';
import SignatureForm from '../components/SignatureForm';
import ContractLink from '../components/ContractLink';
import MessageThread from '../components/MessageThread';

const STATUS_LABEL = {
  meet_requested: 'Meet-and-greet requested',
  meet_scheduled: 'Meet-and-greet scheduled',
  meet_completed: 'Meet complete — awaiting decision',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const CANCEL_REASONS = [
  "Change of plans",
  "Found another care option",
  "Dates no longer needed",
  "Other",
];

// TODO (Phase 2): once a booking flips to 'approved', trigger an email here
// (e.g. via a Supabase Edge Function calling Resend) that includes your
// Venmo handle/QR so the client knows how and when to pay.
export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const [pendingRange, setPendingRange] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [dogsById, setDogsById] = useState({});
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustom, setCancelCustom] = useState('');

  useEffect(() => { if (user) loadBookings(); }, [user]);

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings').select('*, dogs(*)')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('Failed to load bookings', error);
    setBookings(data || []);
    const map = {};
    (data || []).forEach(b => { map[b.id] = b.dogs; });
    setDogsById(map);
  }

  function startCancel(id) {
    setCancelingId(id);
    setCancelReason('');
    setCancelCustom('');
  }

  function stopCancel() {
    setCancelingId(null);
    setCancelReason('');
    setCancelCustom('');
  }

  async function confirmCancel(id) {
    const reason = cancelReason === 'Other' ? cancelCustom.trim() : cancelReason;
    if (!reason) return;
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_by: 'client', cancel_reason: reason, acknowledged_by_sitter: false })
      .eq('id', id);
    stopCancel();
    loadBookings();
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
      <div>
        <h2>Book a stay</h2>
        <Calendar selectable onRangeSelect={(start, end) => setPendingRange({ start, end })} />
      </div>

      <div>
        <h2>Your requests</h2>
        {bookings.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No requests yet.</p>}
        {bookings.map(b => (
          <div key={b.id} className="card" style={{ marginBottom: 12 }}>
            <div className={`status-pill status-${b.status}`}>{STATUS_LABEL[b.status]}</div>
            <p style={{ margin: '8px 0 2px', fontWeight: 600 }}>{b.dogs?.name}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>{b.start_date} → {b.end_date}</p>
            {b.meet_greet_at && b.status !== 'declined' && (
              <p style={{ fontSize: 12.5, marginTop: 6 }}>
                Meet-and-greet: {new Date(b.meet_greet_at).toLocaleString()}
              </p>
            )}
            {b.status === 'approved' && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12.5, background: 'var(--teal-light)', color: 'var(--teal)', padding: 8, borderRadius: 8 }}>
                  Approved! Payment instructions and Venmo details will be sent by email — see TODO in code for wiring this up.
                </p>
                <SignatureForm booking={b} dog={b.dogs} client={profile} />
                <ContractLink bookingId={b.id} />
              </div>
            )}
            {b.status === 'declined' && b.decline_reason && (
              <p style={{ fontSize: 12.5, background: '#F3E9E5', color: 'var(--rust)', padding: 8, borderRadius: 8, marginTop: 10 }}>
                {b.decline_reason}
              </p>
            )}
            {b.status === 'cancelled' && (
              <p style={{ fontSize: 12.5, background: '#E9E9EC', color: 'var(--ink-soft)', padding: 8, borderRadius: 8, marginTop: 10 }}>
                Cancelled by {b.cancelled_by === 'sitter' ? 'the sitter' : 'you'}{b.cancel_reason ? `: ${b.cancel_reason}` : ''}
              </p>
            )}

            {!['declined', 'cancelled'].includes(b.status) && cancelingId !== b.id && (
              <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={() => startCancel(b.id)}>
                Cancel this {b.status === 'approved' ? 'booking' : 'request'}
              </button>
            )}

            {cancelingId === b.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 8px' }}>Why are you cancelling?</p>
                {CANCEL_REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, marginBottom: 6 }}>
                    <input type="radio" name={`cancel-${b.id}`} value={r}
                      checked={cancelReason === r} onChange={() => setCancelReason(r)} />
                    {r}
                  </label>
                ))}
                {cancelReason === 'Other' && (
                  <input value={cancelCustom} onChange={e => setCancelCustom(e.target.value)}
                    placeholder="Add a short note"
                    style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 4 }} />
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={stopCancel}>Never mind</button>
                  <button className="btn btn-danger" onClick={() => confirmCancel(b.id)}
                    disabled={!cancelReason || (cancelReason === 'Other' && !cancelCustom.trim())}>
                    Confirm cancellation
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <h2>Message your sitter</h2>
        {user && <div className="card"><MessageThread clientId={user.id} userId={user.id} collapsedByDefault={false} /></div>}
      </div>

      {pendingRange && (
        <RequestModal
          userId={user.id}
          start={pendingRange.start}
          end={pendingRange.end}
          onClose={() => setPendingRange(null)}
          onSubmitted={loadBookings}
        />
      )}
    </div>
  );
}
