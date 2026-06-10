import React, { useEffect, useState, useRef } from 'react';
import { getAuditLogs, getDashboardStats } from '../services/api';
import { PageShell, Card, SectionHeader, Table, StatCard, LoadingState, StatusBadge } from '../components/shared/UI';

function StatusDot({ ok }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-400 shadow-green-400/60 shadow-sm' : 'bg-red-400 shadow-red-400/60 shadow-sm'}`} />
  );
}

export default function SystemMonitor() {
  const [stats, setStats]       = useState(null);
  const [logs, setLogs]         = useState([]);
  const [apiStatus, setApiStatus]= useState({});
  const [loading, setLoading]   = useState(true);
  const [uptime, setUptime]     = useState(0);
  const interval = useRef(null);

  const ENDPOINTS = [
    { name: 'Auth API',       path: '/api/auth/refresh', method: 'POST' },
    { name: 'Cases API',      path: '/api/cases',        method: 'GET' },
    { name: 'Dashboard API',  path: '/api/dashboard/stats', method: 'GET' },
    { name: 'Criminals API',  path: '/api/criminals',    method: 'GET' },
  ];

  useEffect(() => {
    fetchAll();
    interval.current = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(interval.current);
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        getDashboardStats(),
        getAuditLogs({ limit: 20 }),
      ]);
      setStats(statsRes.data);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.data || []));

      // Ping each endpoint
      const results = {};
      await Promise.all(ENDPOINTS.map(async ep => {
        const t0 = Date.now();
        try {
          const token = localStorage.getItem('access_token');
          const r = await fetch(ep.path, {
            method: ep.method,
            headers: { Authorization: `Bearer ${token}` },
          });
          results[ep.name] = { ok: r.ok || r.status < 500, latency: Date.now() - t0, code: r.status };
        } catch {
          results[ep.name] = { ok: false, latency: null, code: 0 };
        }
      }));
      setApiStatus(results);
    } catch {}
    finally { setLoading(false); }
  }

  const formatUptime = (s) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const logCols = [
    { key: 'performed_at', label: 'Time',   render: v => <span className="font-mono text-xs text-gray-500">{v ? new Date(v).toLocaleString('en-IN') : '—'}</span> },
    { key: 'username',     label: 'User',   render: v => <span className="font-mono text-blue-400">{v || '—'}</span> },
    { key: 'role_name',    label: 'Role' },
    { key: 'action',       label: 'Action', render: v => <span className="font-mono text-xs">{v}</span> },
    { key: 'table_name',   label: 'Table',  render: v => <span className="font-mono text-xs text-purple-400">{v}</span> },
    { key: 'ip_address',   label: 'IP',     render: v => <span className="font-mono text-xs text-gray-600">{v || '—'}</span> },
  ];

  const allOk = Object.values(apiStatus).every(v => v.ok);

  return (
    <PageShell title="System Monitor" subtitle="API health, active sessions, and audit trail" icon="⚙️">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="⏱️" label="Session Uptime"   value={formatUptime(uptime)} color="blue"   />
        <StatCard icon="✅" label="API Status"        value={allOk ? 'OK' : 'Degraded'} color={allOk ? 'green' : 'red'} />
        <StatCard icon="📋" label="Audit Events"      value={stats?.total_audit || '—'} color="purple" />
        <StatCard icon="👥" label="Active Users"      value={stats?.active_officers || '—'} color="orange" />
      </div>

      {/* API Health */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="API Endpoint Status" subtitle="Live health check" />
          <button onClick={fetchAll}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1 rounded">
            ↻ Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ENDPOINTS.map(ep => {
            const s = apiStatus[ep.name];
            return (
              <div key={ep.name} className="flex items-center gap-3 p-3 bg-gray-800/40 rounded border border-gray-800">
                <StatusDot ok={s?.ok !== false} />
                <div className="flex-1">
                  <p className="text-xs text-white font-mono">{ep.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{ep.method} {ep.path}</p>
                </div>
                {s && (
                  <div className="text-right">
                    <p className={`text-xs font-mono ${s.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {s.ok ? `${s.latency}ms` : `ERR ${s.code}`}
                    </p>
                  </div>
                )}
                {!s && <div className="w-4 h-4 border border-gray-700 border-t-blue-500 rounded-full animate-spin" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* DB Stats */}
      {stats && (
        <Card className="p-4">
          <SectionHeader title="Database Statistics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['Cases',      stats.total_cases    || 0],
              ['FIRs',       stats.total_firs      || 0],
              ['Criminals',  stats.total_criminals || 0],
              ['Officers',   stats.total_officers  || 0],
              ['Evidence',   stats.total_evidence  || 0],
              ['Complaints', stats.total_complaints|| 0],
              ['Audit Logs', stats.total_audit     || 0],
              ['Users',      stats.total_users     || 0],
            ].map(([k,v]) => (
              <div key={k} className="bg-gray-800/30 rounded p-2 text-center">
                <p className="text-lg font-mono font-bold text-white">{v}</p>
                <p className="text-[10px] text-gray-600 font-mono uppercase">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Audit Logs */}
      <Card className="p-4">
        <SectionHeader title="Recent Audit Log" subtitle="Last 20 system events" />
        {loading ? <LoadingState /> : (
          <Table cols={logCols} rows={logs} emptyMsg="No audit records. Admin access required." />
        )}
      </Card>
    </PageShell>
  );
}
