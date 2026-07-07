import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// NOTE: signup only ever creates 'client' accounts on purpose. There is
// exactly one sitter (you) -- to make yourself the sitter, sign up normally
// once, then in the Supabase Table Editor open `profiles` and change your
// own row's `role` to 'sitter'. Never let role be chosen from this form --
// if it were, anyone could sign up and mark themselves the sitter.
//
// The profile row itself is NOT created here -- it's created automatically
// on first login (see AuthContext.jsx). That's deliberate: right after
// signUp(), there's only a session if email confirmation is turned off. If
// it's on, there's no session yet, and Row Level Security would (correctly)
// block an insert from someone who isn't authenticated yet.
export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }

    if (!data.session) {
      // Email confirmation is required -- no session yet, so there's
      // nothing more to do until they click the link and log in.
      setCheckEmail(true);
      return;
    }
    navigate('/');
  }

  if (checkEmail) {
    return (
      <div style={{ maxWidth: 380, margin: '80px auto' }} className="card">
        <h2>Check your email</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and log in.
        </p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: '80px auto' }} className="card">
      <h2>Create your account</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Your name</label>
          <input required value={fullName} onChange={e => setFullName(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" required minLength={6} value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 9, marginTop: 4 }} />
        </div>
        {error && <p style={{ color: 'var(--rust)', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 14 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
