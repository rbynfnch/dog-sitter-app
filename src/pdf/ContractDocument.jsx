import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// A printable contract combining the booking, dog profile, and emergency
// contact -- exactly what you asked for. Rendered client-side, no backend
// needed for the PDF itself (storing the result still goes through Supabase
// Storage, see SignatureForm.jsx).
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#141B2E' },
  h1: { fontSize: 18, marginBottom: 4, color: '#0B1F3A' },
  h2: { fontSize: 13, marginTop: 18, marginBottom: 6, color: '#2A4FCF' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 140, fontWeight: 700 },
  value: { flex: 1 },
  signBlock: { marginTop: 30, borderTop: '1pt solid #DDE3EF', paddingTop: 14 },
});

export default function ContractDocument({ booking, dog, client, signedName }) {
  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Fetch &amp; Stay — Dog Sitting Agreement</Text>
        <Text>Booking dates: {booking.start_date} to {booking.end_date}</Text>

        <Text style={styles.h2}>Client</Text>
        <Row label="Name" value={client.full_name} />
        <Row label="Phone" value={client.phone} />
        <Row label="Emergency contact" value={`${client.emergency_contact_name || ''} (${client.emergency_contact_phone || ''})`} />

        <Text style={styles.h2}>Dog</Text>
        <Row label="Name" value={dog.name} />
        <Row label="Breed" value={dog.breed} />
        <Row label="Demeanor" value={dog.demeanor} />
        <Row label="Food notes" value={dog.food_notes} />
        <Row label="Medicine notes" value={dog.medicine_notes} />
        <Row label="Dog-friendly" value={dog.dog_friendly ? 'Yes' : 'No'} />
        <Row label="People-friendly" value={dog.people_friendly ? 'Yes' : 'No'} />
        <Row label="Kid-friendly" value={dog.kid_friendly ? 'Yes' : 'No'} />
        <Row label="Additional notes" value={dog.extra_notes} />

        <Text style={styles.h2}>Terms</Text>
        <Text>
          The sitter agrees to provide care for the dog described above for the dates listed.
          The client confirms the information above is accurate to the best of their knowledge,
          including any medical or behavioral notes relevant to the dog's care.
        </Text>

        <View style={styles.signBlock}>
          {signedName ? (
            <>
              <Text>Digitally signed by: {signedName}</Text>
              <Text style={{ color: '#5B6478', fontSize: 9, marginTop: 4 }}>
                Signed electronically via Fetch &amp; Stay
              </Text>
            </>
          ) : (
            <>
              <Text>Client signature: _______________________________</Text>
              <Text style={{ marginTop: 16 }}>Date: _______________</Text>
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}
