import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ClientDashboard from './pages/ClientDashboard';
import SitterDashboard from './pages/SitterDashboard';
import MyDogs from './pages/MyDogs';
import SitterClients from './pages/SitterClients';

function Home() {
  const { user, profile, signOut } = useAuth();
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Fetch &amp; Stay</h1>
        {user ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {profile?.role === 'client' && <Link to="/dogs" className="btn btn-ghost">My dogs</Link>}
            {profile?.role === 'sitter' && <Link to="/clients" className="btn btn-ghost">Clients</Link>}
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{profile?.full_name}</span>
            <button className="btn btn-ghost" onClick={signOut}>Log out</button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">Log in</Link>
        )}
      </div>
      {profile?.role === 'sitter' ? <SitterDashboard /> : <ClientDashboard />}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dogs" element={
        <ProtectedRoute role="client"><MyDogs /></ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute role="sitter"><SitterClients /></ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute><Home /></ProtectedRoute>
      } />
    </Routes>
  );
}
