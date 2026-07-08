import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// The contracts bucket is private, so there's no permanent public URL to
// link to. Instead, this checks whether a signed contract exists for the
// booking, and generates a short-lived signed URL on click -- Supabase
// checks the requester's permissions (via the storage RLS policy) at the
// moment the link is generated, so a client can only ever get a link to
// their own contract, never someone else's.
export default function ContractLink({ bookingId }) {
  const [contract, setContract] = useState(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => { loadContract(); }, [bookingId]);

  async function loadContract() {
    const { data } = await supabase
      .from('contracts').select('*').eq('booking_id', bookingId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setContract(data);
  }

  async function openContract() {
    if (!contract?.pdf_path) return;
    setOpening(true);
    const { data, error } = await supabase.storage
      .from('contracts').createSignedUrl(contract.pdf_path, 60); // valid 60 seconds
    setOpening(false);
    if (error) { alert('Could not open contract: ' + error.message); return; }
    window.open(data.signedUrl, '_blank');
  }

  if (!contract?.pdf_path) return null;

  return (
    <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={opening} onClick={openContract}>
      {opening ? 'Preparing link...' : '📄 View signed contract'}
    </button>
  );
}
