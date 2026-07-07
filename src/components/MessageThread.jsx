import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// One continuous conversation thread per client (not per booking) --
// negotiating a meet-and-greet time, drop-off details, or a general
// question all live in the same place. Optionally tag a message with
// `bookingId` for context, but the thread itself is keyed by clientId.
// Updates live via Supabase Realtime -- no manual refresh needed.
export default function MessageThread({ clientId, userId, bookingId, collapsedByDefault = true }) {
  const [open, setOpen] = useState(!collapsedByDefault);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadMessages();

    const channel = supabase
      .channel(`messages-client-${clientId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        payload => setMessages(prev => [...prev, payload.new])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      client_id: clientId, booking_id: bookingId || null, sender_id: userId, body: draft.trim(),
    });
    setSending(false);
    if (!error) setDraft('');
  }

  if (!open) {
    return (
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
        💬 Messages{messages.length > 0 ? ` (${messages.length})` : ''}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, margin: 0 }}>Messages</p>
        {collapsedByDefault && (
          <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
            No messages yet -- use this for meet-and-greet timing, drop-off details, or any question.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            marginBottom: 8, textAlign: m.sender_id === userId ? 'right' : 'left',
          }}>
            <span style={{
              display: 'inline-block', maxWidth: '80%', padding: '7px 11px', borderRadius: 10,
              fontSize: 13, background: m.sender_id === userId ? 'var(--royal)' : 'var(--paper)',
              color: m.sender_id === userId ? '#fff' : 'var(--ink)',
              border: m.sender_id === userId ? 'none' : '1px solid var(--line)',
            }}>
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Type a message..." style={{ flex: 1, padding: 8, fontSize: 13 }} />
        <button className="btn btn-primary" disabled={sending || !draft.trim()} style={{ padding: '8px 14px' }}>
          Send
        </button>
      </form>
    </div>
  );
}
