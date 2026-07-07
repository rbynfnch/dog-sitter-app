import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate('/');
  }

  return (
    <div style={{ maxWidth: 380, margin: '80px auto' }} className="card">
      <h2>Log in</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4 }} />
        </div>
        {error && <p style={{ color: 'var(--rust)', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 14 }}>
        No account yet? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
