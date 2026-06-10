import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';

// New Intelligence & Analytics pages
import IntelligenceHub  from './pages/IntelligenceHub';
import AnalyticsCenter  from './pages/AnalyticsCenter';
import AlertsIncidents  from './pages/AlertsIncidents';
import GeoCrimeMap      from './pages/GeoCrimeMap';
import CriminalNetwork  from './pages/CriminalNetwork';
import SystemMonitor    from './pages/SystemMonitor';
import TaskScheduler    from './pages/TaskScheduler';
import RoleManagement   from './pages/RoleManagement';

// Core pages
import Dashboard    from './pages/Dashboard';
import Cases        from './pages/Cases';
import CaseDetail   from './pages/CaseDetail';
import FIR          from './pages/FIR';
import Criminals    from './pages/Criminals';
import Evidence     from './pages/Evidence';
import Officers     from './pages/Officers';
import AuditLogs    from './pages/AuditLogs';
import Court        from './pages/Court';

// Simple Login page
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#030712'
    }}>
      <div style={{
        background: '#111827', border: '1px solid #1f2937', borderRadius: '0.5rem',
        padding: '2rem', width: '100%', maxWidth: '22rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.2em' }}>SENTINEL</div>
          <div style={{ color: '#4b5563', fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.15em' }}>CRMS v2.0 — LOGIN</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.25rem' }}>USERNAME</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#1f2937', border: '1px solid #374151',
                borderRadius: '0.25rem', color: '#f3f4f6', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.25rem' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#1f2937', border: '1px solid #374151',
                borderRadius: '0.25rem', color: '#f3f4f6', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none' }} />
          </div>
          {err && <div style={{ color: '#f87171', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.75rem' }}>⚠ {err}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.6rem', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
        <div style={{ marginTop: '1rem', color: '#374151', fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center' }}>
          Sentinel Command — Authorised Access Only
        </div>
      </div>
    </div>
  );
}

function AppLayout({ user, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#030712', color: '#f3f4f6', overflow: 'hidden' }}>
      <Sidebar user={user} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem', maxWidth: '1536px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function RequireAuth({ children, user }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />
        } />

        {/* Protected */}
        <Route path="/*" element={
          <RequireAuth user={user}>
            <AppLayout user={user}>
              <Routes>
                <Route path="/"          element={<Dashboard />} />
                <Route path="/cases"     element={<Cases />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/fir"       element={<FIR />} />
                <Route path="/criminals" element={<Criminals />} />
                <Route path="/evidence"  element={<Evidence />} />
                <Route path="/court"     element={<Court />} />
                <Route path="/officers"  element={<Officers />} />
                <Route path="/audit"     element={<AuditLogs />} />

                {/* New Intelligence & Analytics pages */}
                <Route path="/intelligence" element={<IntelligenceHub />} />
                <Route path="/analytics"    element={<AnalyticsCenter />} />
                <Route path="/alerts"       element={<AlertsIncidents />} />
                <Route path="/map"          element={<GeoCrimeMap />} />
                <Route path="/network"      element={<CriminalNetwork />} />
                <Route path="/system"       element={<SystemMonitor />} />
                <Route path="/tasks"        element={<TaskScheduler />} />
                <Route path="/roles"        element={<RoleManagement />} />
              </Routes>
            </AppLayout>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}
