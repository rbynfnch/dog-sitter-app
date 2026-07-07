// Controlled fields for a dog's profile. Lifted state, no local logic --
// keeps this reusable between "first-time request" and a future
// "edit my dog's profile" screen.
export default function DogProfileFields({ dog, setDog }) {
  const update = (key, value) => setDog({ ...dog, [key]: value });

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label>Dog's name</label>
        <input required value={dog.name} onChange={e => update('name', e.target.value)}
          style={{ width: '100%', padding: 9, marginTop: 4 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Breed</label>
        <input value={dog.breed} onChange={e => update('breed', e.target.value)}
          style={{ width: '100%', padding: 9, marginTop: 4 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Demeanor</label>
        <textarea value={dog.demeanor} onChange={e => update('demeanor', e.target.value)}
          placeholder="e.g. calm, a little shy with new people, high energy in the morning"
          style={{ width: '100%', padding: 9, marginTop: 4, minHeight: 50 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Food notes</label>
        <input value={dog.food_notes} onChange={e => update('food_notes', e.target.value)}
          placeholder="Brand, amount, times per day, allergies"
          style={{ width: '100%', padding: 9, marginTop: 4 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Medicine notes</label>
        <input value={dog.medicine_notes} onChange={e => update('medicine_notes', e.target.value)}
          placeholder="Leave blank if none"
          style={{ width: '100%', padding: 9, marginTop: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 13 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={dog.dog_friendly}
            onChange={e => update('dog_friendly', e.target.checked)} /> Dog-friendly
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={dog.people_friendly}
            onChange={e => update('people_friendly', e.target.checked)} /> People-friendly
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={dog.kid_friendly}
            onChange={e => update('kid_friendly', e.target.checked)} /> Kid-friendly
        </label>
      </div>
      <div>
        <label>Anything else</label>
        <textarea value={dog.extra_notes} onChange={e => update('extra_notes', e.target.value)}
          style={{ width: '100%', padding: 9, marginTop: 4, minHeight: 50 }} />
      </div>
    </div>
  );
}
