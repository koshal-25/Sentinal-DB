import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';

// Lazy imports for all pages
import IntelligenceHub  from './pages/IntelligenceHub';
import AnalyticsCenter  from './pages/AnalyticsCenter';
import AlertsIncidents  from './pages/AlertsIncidents';
import GeoCrimeMap      from './pages/GeoCrimeMap';
import CriminalNetwork  from './pages/CriminalNetwork';
import SystemMonitor    from './pages/SystemMonitor';
import TaskScheduler    from './pages/TaskScheduler';
import RoleManagement   from './pages/RoleManagement';

// Existing pages — import from your current pages directory
// import Dashboard    from './pages/Dashboard';
// import Cases        from './pages/Cases';
// import CaseDetail   from './pages/CaseDetail';
// import FIR          from './pages/FIR';
// import Criminals    from './pages/Criminals';
// import Evidence     from './pages/Evidence';
// import Officers     from './pages/Officers';
// import AuditLogs    from './pages/AuditLogs';
// import Login        from './pages/Login';

// Placeholder for pages not yet created
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-64 text-gray-600 font-mono text-sm">
    {title} — Connect your existing page here
  </div>
);

function AppLayout({ user, children }) {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-screen-2xl mx-auto">
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
          <Placeholder title="Login Page" />
          // Replace with: <Login onLogin={setUser} />
        } />

        {/* Protected */}
        <Route path="/*" element={
          <RequireAuth user={user}>
            <AppLayout user={user}>
              <Routes>
                {/* Existing pages — uncomment and wire up */}
                <Route path="/"          element={<Placeholder title="Dashboard" />} />
                <Route path="/cases"     element={<Placeholder title="Cases" />} />
                <Route path="/cases/:id" element={<Placeholder title="Case Detail" />} />
                <Route path="/fir"       element={<Placeholder title="FIR Registry" />} />
                <Route path="/criminals" element={<Placeholder title="Criminals" />} />
                <Route path="/evidence"  element={<Placeholder title="Evidence" />} />
                <Route path="/officers"  element={<Placeholder title="Officers" />} />
                <Route path="/audit"     element={<Placeholder title="Audit Logs" />} />

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
