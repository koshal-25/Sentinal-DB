import React, { useEffect, useState } from 'react';
import { getCases } from '../services/api';
import { PageShell, Card, SectionHeader, Table, StatusBadge, RiskBadge, LoadingState, ErrorState, StatCard } from '../components/shared/UI';

export default function AlertsIncidents() {
  const [pendingCases, setPendingCases]       = useState([]);
  const [highPriority, setHighPriority]       = useState([]);
  const [staleCases, setStaleCases]           = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const STALE_DAYS = 30;

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    setLoading(true); setError(null);
    try {
      const [pendingRes, highRes, openRes] = await Promise.all([
        getCases({ status: 'Open', limit: 100 }),
        getCases({ priority: 'High', limit: 50 }),
        getCases({ status: 'Under Investigation', limit: 100 }),
      ]);
      const norm = (r) => Array.isArray(r.data) ? r.data : (r.data?.data || []);
      const pending = norm(pendingRes);
      const high    = norm(highRes);
      const open    = norm(openRes);

      setPendingCases(pending.slice(0, 20));
      setHighPriority(high.slice(0, 20));
      setStaleCases(open.filter(c => c.age_days > STALE_DAYS).slice(0, 20));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const ALERT_SECTIONS = [
    {
      id: 'stale',
      title: `⏰ Stale Cases (>${STALE_DAYS} days)`,
      subtitle: 'Investigations without recent updates',
      color: 'red',
      data: staleCases,
      cols: [
        { key: 'case_number',    label: 'Case #', render: v => <span className="font-mono text-red-400">{v}</span> },
        { key: 'crime_name',     label: 'Crime' },
        { key: 'crime_location', label: 'Location' },
        { key: 'lead_officer',   label: 'Officer' },
        { key: 'age_days',       label: 'Days Open', render: v => <span className="font-mono text-red-400 font-bold">{v}d</span> },
        { key: 'status',         label: 'Status', render: v => <StatusBadge status={v} /> },
      ],
    },
    {
      id: 'pending',
      title: '📂 Pending Cases',
      subtitle: 'Cases awaiting action — not yet under investigation',
      color: 'yellow',
      data: pendingCases,
      cols: [
        { key: 'case_number',    label: 'Case #', render: v => <span className="font-mono text-yellow-400">{v}</span> },
        { key: 'fir_number',     label: 'FIR #' },
        { key: 'crime_name',     label: 'Crime' },
        { key: 'crime_location', label: 'Location' },
        { key: 'lead_officer',   label: 'Officer' },
        { key: 'filed_at',       label: 'Filed', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
        { key: 'status',         label: 'Status', render: v => <StatusBadge status={v} /> },
      ],
    },
    {
      id: 'high',
      title: '🚨 High Priority Cases',
      subtitle: 'Cases marked High or Critical priority',
      color: 'orange',
      data: highPriority,
      cols: [
        { key: 'case_number',    label: 'Case #', render: v => <span className="font-mono text-orange-400">{v}</span> },
        { key: 'crime_name',     label: 'Crime' },
        { key: 'crime_location', label: 'Location' },
        { key: 'lead_officer',   label: 'Officer' },
        { key: 'age_days',       label: 'Days', render: v => <span className="font-mono">{v}d</span> },
        { key: 'status',         label: 'Status', render: v => <StatusBadge status={v} /> },
      ],
    },
  ];

  if (loading) return <LoadingState msg="Loading alerts..." />;
  if (error)   return <ErrorState msg={error} onRetry={fetchAlerts} />;

  return (
    <PageShell title="Alerts & Incidents" subtitle="Automated alerts based on case age, priority, and status" icon="🚨">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="⏰" label={`Stale (>${STALE_DAYS}d)`} value={staleCases.length}   color="red"    />
        <StatCard icon="📂" label="Pending Open"               value={pendingCases.length} color="yellow" />
        <StatCard icon="🚨" label="High Priority"              value={highPriority.length} color="orange" />
      </div>

      {/* Alert Banner */}
      {(staleCases.length > 0 || highPriority.length > 0) && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-red-300 font-mono font-bold text-sm">ATTENTION REQUIRED</p>
            <p className="text-red-400/80 text-xs">
              {staleCases.length} stale case{staleCases.length !== 1 ? 's' : ''} and {highPriority.length} high-priority case{highPriority.length !== 1 ? 's' : ''} need immediate review.
            </p>
          </div>
        </div>
      )}

      {ALERT_SECTIONS.map(section => (
        <Card key={section.id} className="p-4">
          <SectionHeader title={section.title} subtitle={`${section.data.length} items — ${section.subtitle}`} />
          <Table
            cols={section.cols}
            rows={section.data}
            emptyMsg={`No ${section.id} alerts.`}
          />
        </Card>
      ))}
    </PageShell>
  );
}
