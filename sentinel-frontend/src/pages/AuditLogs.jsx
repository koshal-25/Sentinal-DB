import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/api';
import { PageShell, Card, Table, LoadingState, ErrorState } from '../components/shared/UI';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true); setError(null);
    try {
      const res = await getAuditLogs();
      setLogs(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: You must be an Administrator to view audit logs.');
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading && logs.length === 0) return <LoadingState text="Loading Audit Trail..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchLogs} />;

  return (
    <PageShell 
      title="System Audit Logs" 
      subtitle="Strict, immutable ledger of all system actions for compliance and security."
      action={<button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg shadow transition-colors">Export CSV</button>}
    >
      <Card>
        <Table 
          columns={['Timestamp', 'User', 'Action', 'Target Table', 'Record ID', 'IP Address']}
          data={logs.map(log => [
            <span className="text-sm text-slate-400">{new Date(log.performed_at).toLocaleString()}</span>,
            <span className="font-semibold text-blue-400">{log.username || `User #${log.user_id}`}</span>,
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              log.action === 'DELETE' ? 'bg-red-900/50 text-red-400' :
              log.action === 'UPDATE' ? 'bg-orange-900/50 text-orange-400' :
              'bg-emerald-900/50 text-emerald-400'
            }`}>
              {log.action}
            </span>,
            log.table_name || 'N/A',
            log.record_id || 'N/A',
            <span className="font-mono text-xs text-slate-500">{log.ip_address || 'Internal'}</span>
          ])}
        />
        {logs.length === 0 && (
          <p className="text-center text-slate-400 mt-4">No audit logs found.</p>
        )}
      </Card>
    </PageShell>
  );
}
