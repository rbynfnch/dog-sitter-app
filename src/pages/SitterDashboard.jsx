import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Calendar from '../components/Calendar';

// Sitter's view: manage blocked dates, and move each booking through the
// meet-and-greet gate before it can ever become 'approved' (the only status
// that actually blocks days on the calendar -- see Calendar.jsx).
export default function SitterDashboard() {
  const [bookings, setBookings] = useState([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockError, setBlockError] = useState('');
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const [decliningId, setDecliningId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineCustom, setDeclineCustom] = useState('');
  const [editingMeetId, setEditingMeetId] = useState(null);
  const [meetDraft, setMeetDraft] = useState('');
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustom, setCancelCustom] = useState('');

  const [unacknowledged, setUnacknowledged] = useState([]);

  const DECLINE_REASONS = [
    "Sitter unavailable those dates",
    "One or more of your days doesn't work",
    "Please contact sitter",
    "Other",
  ];

  const CANCEL_REASONS = [
    "Sitter unavailable (emergency)",
    "Scheduling conflict",
    "Other",
  ];

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings').select('*, dogs(*), profiles(*)')
      .neq('status', 'declined')
      .neq('status', 'cancelled')
      .order('start_date', { ascending: true });
    if (error) console.error('Failed to load bookings', error);
    setBookings(data || []);

    const { data: cancelled, error: cancelledError } = await supabase
      .from('bookings').select('*, dogs(*), profiles(*)')
      .eq('status', 'cancelled')
      .eq('acknowledged_by_sitter', false)
      .order('created_at', { ascending: false });
    if (cancelledError) console.error('Failed to load cancellations', cancelledError);
    setUnacknowledged(cancelled || []);
  }

  async function acknowledgeCancel(id) {
    await supabase.from('bookings').update({ acknowledged_by_sitter: true }).eq('id', id);
    loadBookings();
  }

  async function setStatus(id, status) {
    await supabase.from('bookings').update({ status }).eq('id', id);
    loadBookings();
  }

  function startDecline(id) {
    setDecliningId(id);
    setDeclineReason('');
    setDeclineCustom('');
  }

  function cancelDecline() {
    setDecliningId(null);
    setDeclineReason('');
    setDeclineCustom('');
  }

  async function confirmDecline(id) {
    const reason = declineReason === 'Other' ? declineCustom.trim() : declineReason;
    if (!reason) return;
    await supabase.from('bookings').update({ status: 'declined', decline_reason: reason }).eq('id', id);
    cancelDecline();
    loadBookings();
  }

  async function saveMeetTime(id) {
    if (!meetDraft) return;
    await supabase.from('bookings').update({ meet_greet_at: meetDraft }).eq('id', id);
    setEditingMeetId(null);
    setMeetDraft('');
    loadBookings();
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
      .update({ status: 'cancelled', cancelled_by: 'sitter', cancel_reason: reason })
      .eq('id', id);
    stopCancel();
    loadBookings();
  }

  async function addBlockedDates(e) {
    e.preventDefault();
    setBlockError('');
    if (!blockStart) return;
    const end = blockEnd || blockStart;
    if (end < blockStart) { setBlockError('End date is before start date.'); return; }

    // Build every date in the range and insert them all at once.
    const rows = [];
    let d = new Date(blockStart + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (d <= endD) {
      rows.push({ date: d.toISOString().slice(0, 10) });
      d = new Date(d.getTime() + 86400000);
    }
    // Blocking a date that's already blocked just no-ops rather than erroring.
    const { error } = await supabase.from('blocked_dates').upsert(rows, { onConflict: 'date', ignoreDuplicates: true });
    if (error) { setBlockError(error.message); return; }
    setBlockStart(''); setBlockEnd('');
    setCalendarRefresh(k => k + 1);
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
      <div>
        <h2>Calendar</h2>
        <Calendar refreshKey={calendarRefresh} />
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ marginTop: 0 }}>Block dates</h4>
          <form onSubmit={addBlockedDates} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={blockStart} onChange={e => setBlockStart(e.target.value)}
              style={{ padding: 9, flex: 1, minWidth: 130 }} placeholder="Start" required />
            <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>to</span>
            <input type="date" value={blockEnd} onChange={e => setBlockEnd(e.target.value)}
              style={{ padding: 9, flex: 1, minWidth: 130 }} placeholder="End (optional)" />
            <button className="btn btn-primary">Block</button>
          </form>
          <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 0 }}>
            Leave "to" blank to block just one day.
          </p>
          {blockError && <p style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: 6 }}>{blockError}</p>}
        </div>
      </div>

      <div>
        {unacknowledged.length > 0 && (
          <>
            <h2>Cancellations</h2>
            {unacknowledged.map(b => (
              <div key={b.id} className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--rust)' }}>
                <div className="status-pill status-cancelled">Cancelled by client</div>
                <p style={{ margin: '8px 0 2px', fontWeight: 600 }}>
                  {b.dogs?.name} · {b.profiles?.full_name}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>{b.start_date} → {b.end_date}</p>
                {b.cancel_reason && (
                  <p style={{ fontSize: 12.5, marginTop: 6, color: 'var(--rust)' }}>{b.cancel_reason}</p>
                )}
                <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => acknowledgeCancel(b.id)}>
                  Got it
                </button>
              </div>
            ))}
          </>
        )}

        <h2>Requests</h2>
        {bookings.map(b => (
          <div key={b.id} className="card" style={{ marginBottom: 12 }}>
            <div className={`status-pill status-${b.status}`}>{b.status.replace('_', ' ')}</div>
            <p style={{ margin: '8px 0 2px', fontWeight: 600 }}>
              {b.dogs?.name} · {b.profiles?.full_name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>{b.start_date} → {b.end_date}</p>

            {editingMeetId === b.id ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                <input type="datetime-local" value={meetDraft} onChange={e => setMeetDraft(e.target.value)}
                  style={{ padding: 7, fontSize: 13 }} />
                <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => saveMeetTime(b.id)}>Save</button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditingMeetId(null)}>Cancel</button>
              </div>
            ) : (
              b.meet_greet_at && (
                <p style={{ fontSize: 12.5, marginTop: 6 }}>
                  Meet-and-greet: {new Date(b.meet_greet_at).toLocaleString()}
                  {b.status !== 'approved' && (
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 8 }}
                      onClick={() => { setEditingMeetId(b.id); setMeetDraft(b.meet_greet_at?.slice(0, 16) || ''); }}>
                      Propose different time
                    </button>
                  )}
                </p>
              )
            )}
            {b.client_notes && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{b.client_notes}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {b.status === 'meet_requested' && (
                <button className="btn btn-teal" onClick={() => setStatus(b.id, 'meet_scheduled')}>
                  Confirm meet-and-greet
                </button>
              )}
              {b.status === 'meet_scheduled' && (
                <button className="btn btn-teal" onClick={() => setStatus(b.id, 'meet_completed')}>
                  Mark meet complete
                </button>
              )}
              {b.status === 'meet_completed' && (
                <button className="btn btn-primary" onClick={() => setStatus(b.id, 'approved')}>
                  Approve stay
                </button>
              )}
              {b.status !== 'approved' && decliningId !== b.id && (
                <button className="btn btn-danger" onClick={() => startDecline(b.id)}>
                  Decline
                </button>
              )}
              {b.status === 'approved' && cancelingId !== b.id && (
                <button className="btn btn-danger" onClick={() => startCancel(b.id)}>
                  Cancel booking
                </button>
              )}
            </div>

            {decliningId === b.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 8px' }}>Why are you declining?</p>
                {DECLINE_REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, marginBottom: 6 }}>
                    <input type="radio" name={`decline-${b.id}`} value={r}
                      checked={declineReason === r} onChange={() => setDeclineReason(r)} />
                    {r}
                  </label>
                ))}
                {declineReason === 'Other' && (
                  <input value={declineCustom} onChange={e => setDeclineCustom(e.target.value)}
                    placeholder="Add a short note"
                    style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 4 }} />
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={cancelDecline}>Never mind</button>
                  <button className="btn btn-danger" onClick={() => confirmDecline(b.id)}
                    disabled={!declineReason || (declineReason === 'Other' && !declineCustom.trim())}>
                    Confirm decline
                  </button>
                </div>
              </div>
            )}

            {cancelingId === b.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 8px' }}>Why are you cancelling this booking?</p>
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
    </div>
  );
}
