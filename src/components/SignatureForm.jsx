import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabaseClient';
import ContractDocument from '../pdf/ContractDocument';

// Shown once a booking is approved. Two paths:
//  A) type your name -> we generate + store the signed PDF right away
//  B) download a blank copy, sign it on paper, then upload the scan
// Either way the result is the same: a row in `contracts` with a pdf_url,
// generated/stored once and never regenerated (so it can't silently drift
// if the dog's info changes later).
export default function SignatureForm({ booking, dog, client }) {
  const [mode, setMode] = useState('digital');
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function uploadAndSave(blob, method, signedName) {
    const path = `${booking.id}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('contracts').upload(path, blob, {
      contentType: 'application/pdf',
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path);

    const { error: insertError } = await supabase.from('contracts').insert({
      booking_id: booking.id,
      method,
      signed_name: signedName || null,
      signed_at: new Date().toISOString(),
      pdf_url: urlData.publicUrl,
    });
    if (insertError) throw insertError;
  }

  async function handleDigitalSign() {
    setError('');
    if (!typedName.trim() || !agreed) { setError('Type your full name and check the agreement box.'); return; }
    setSaving(true);
    try {
      const blob = await pdf(
        <ContractDocument booking={booking} dog={dog} client={client} signedName={typedName} />
      ).toBlob();
      await uploadAndSave(blob, 'digital', typedName.trim());
      setDone(true);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleDownloadBlank() {
    const blob = await pdf(
      <ContractDocument booking={booking} dog={dog} client={client} signedName={null} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `contract-${booking.id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUploadSigned() {
    setError('');
    if (!uploadFile) { setError('Choose the scanned/photographed file first.'); return; }
    setSaving(true);
    try {
      await uploadAndSave(uploadFile, 'manual_upload', null);
      setDone(true);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  if (done) return <p style={{ color: 'var(--teal)', fontWeight: 600 }}>Contract on file. Thank you!</p>;

  return (
    <div className="card">
      <h4 style={{ marginTop: 0 }}>Sign the contract</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" className={mode === 'digital' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setMode('digital')}>Sign digitally</button>
        <button type="button" className={mode === 'manual' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setMode('manual')}>Sign on paper</button>
      </div>

      {mode === 'digital' ? (
        <div>
          <input placeholder="Type your full name" value={typedName}
            onChange={e => setTypedName(e.target.value)} style={{ width: '100%', padding: 9, marginBottom: 10 }} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            I agree this counts as my signature on the sitting contract.
          </label>
          <button className="btn btn-primary" disabled={saving} onClick={handleDigitalSign}>
            {saving ? 'Saving...' : 'Sign and submit'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            Download the contract, sign it by hand, then scan or photograph it and upload the file here.
          </p>
          <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={handleDownloadBlank}>
            Download blank contract
          </button>
          <input type="file" accept="application/pdf,image/*"
            onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ display: 'block', marginBottom: 12 }} />
          <button className="btn btn-primary" disabled={saving} onClick={handleUploadSigned}>
            {saving ? 'Uploading...' : 'Upload signed copy'}
          </button>
        </div>
      )}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
