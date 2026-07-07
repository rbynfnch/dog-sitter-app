import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MS_DAY = 86400000;
const iso = d => d.toISOString().slice(0, 10);
const todayISO = iso(new Date(new Date().setHours(0, 0, 0, 0)));

function dateRange(startISO, endISO) {
  const out = [];
  let d = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  while (d <= end) { out.push(iso(d)); d = new Date(d.getTime() + MS_DAY); }
  return out;
}

// Renders a month grid. Pass `selectable` to let the viewer click a
// start/end day among open dates (used by the client request flow).
// `onRangeSelect(start, end)` fires once both ends are picked.
// Pass `refreshKey` (any changing value) to force it to reload availability
// -- e.g. bump a counter after blocking new dates from the sitter dashboard.
export default function Calendar({ selectable = false, onRangeSelect, refreshKey }) {
  const [view, setView] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [blocked, setBlocked] = useState([]);
  const [bookedDays, setBookedDays] = useState([]); // days covered by an approved booking
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);

  useEffect(() => { loadAvailability(); }, [refreshKey]);

  async function loadAvailability() {
    const { data: blockedRows } = await supabase.from('blocked_dates').select('date');
    setBlocked((blockedRows || []).map(r => r.date));

    const { data: approvedBookings } = await supabase
      .from('bookings')
      .select('start_date, end_date')
      .eq('status', 'approved');
    const days = (approvedBookings || []).flatMap(b => dateRange(b.start_date, b.end_date));
    setBookedDays(days);
  }

  function dayStatus(dISO) {
    if (dISO < todayISO) return 'past';
    if (blocked.includes(dISO)) return 'blocked';
    if (bookedDays.includes(dISO)) return 'booked';
    return 'open';
  }

  function handleClick(dISO, status) {
    if (!selectable || status !== 'open') return;
    if (!selStart || (selStart && selEnd)) {
      setSelStart(dISO); setSelEnd(null);
      return;
    }
    let start = selStart, end = dISO;
    if (dISO < selStart) { start = dISO; end = selStart; }
    const range = dateRange(start, end);
    const crossesClosed = range.some(d => dayStatus(d) !== 'open' && d !== selStart);
    if (crossesClosed) { setSelStart(dISO); setSelEnd(null); return; }
    setSelStart(start); setSelEnd(end);
    onRangeSelect?.(start, end);
  }

  const y = view.getFullYear(), m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const numDays = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  const statusColor = {
    past: '#F1ECDD', open: '#E4EDDF', blocked: '#F3E9E5', booked: '#E6ECFB',
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => setView(new Date(y, m - 1, 1))}>‹</button>
        <h3 style={{ margin: 0 }}>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <button className="btn btn-ghost" onClick={() => setView(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="mono" style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-soft)' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dISO = iso(new Date(y, m, day));
          const status = dayStatus(dISO);
          const isSel = dISO === selStart || dISO === selEnd;
          const inRange = selStart && selEnd && dISO > selStart && dISO < selEnd;
          return (
            <div key={i}
              onClick={() => handleClick(dISO, status)}
              style={{
                aspectRatio: '1', borderRadius: 9, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13,
                background: isSel ? 'var(--royal)' : inRange ? '#C9D6F5' : statusColor[status],
                color: isSel ? '#fff' : 'var(--ink)',
                cursor: selectable && status === 'open' ? 'pointer' : 'default',
                border: '1.5px solid transparent',
              }}>
              {day}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, fontSize: 11.5, color: 'var(--ink-soft)' }}>
        <LegendDot color={statusColor.open} border="var(--teal)" label="Open" />
        <LegendDot color={statusColor.blocked} border="var(--rust)" label="Unavailable" />
        <LegendDot color={statusColor.booked} border="var(--royal)" label="Booked" />
        <LegendDot color={statusColor.past} border="var(--line)" label="Past" />
      </div>
    </div>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, border: `1px solid ${border}`, display: 'inline-block' }} />
      {label}
    </span>
  );
}
