import React, { useEffect, useState } from 'react';
import { getCriminals, getRepeatOffenders, getCases } from '../../services/api';
import { PageShell, Card, SectionHeader, Table, StatusBadge, RiskBadge, LoadingState, ErrorState, StatCard } from '../../components/shared/UI';

export default function IntelligenceHub() {
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [highPriorityCases, setHighPriorityCases] = useState([]);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true); setError(null);
    try {
      const [roRes, caseRes] = await Promise.all([
        getRepeatOffenders(),
        getCases({ priority: 'High', status: 'Under Investigation' }),
      ]);
      const ro = Array.isArray(roRes.data) ? roRes.data : (roRes.data?.data || []);
      const cases = Array.isArray(caseRes.data) ? caseRes.data : (caseRes.data?.data || []);
      setRepeatOffenders(ro);
      setHighPriorityCases(cases);

      // Build suspicious alerts from data
      const alerts = [];
      ro.forEach(c => {
        if (c.risk_level === 'High' || c.total_cases >= 3)
          alerts.push({ type: 'Repeat Offender', name: c.full_name, detail: `${c.total_cases} linked cases`, severity: 'Critical' });
      });
      cases.forEach(c => {
        if (c.age_days > 30)
          alerts.push({ type: 'Stale Case', name: c.case_number, detail: `Open ${c.age_days} days`, severity: 'High' });
      });
      setSuspiciousAlerts(alerts.slice(0, 12));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const offenderCols = [
    { key: 'full_name',   label: 'Name' },
    { key: 'total_cases', label: 'Cases', render: v => <span className="font-mono text-red-400">{v}</span> },
    { key: 'risk_level',  label: 'Risk',  render: v => <RiskBadge level={v} /> },
    { key: 'arrest_status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'crime_categories', label: 'Crime Types', render: v => <span className="text-gray-400 text-xs">{v || '—'}</span> },
  ];

  const caseCols = [
    { key: 'case_number',  label: 'Case #', render: v => <span className="font-mono text-blue-400">{v}</span> },
    { key: 'crime_name',   label: 'Crime' },
    { key: 'crime_location', label: 'Location' },
    { key: 'lead_officer', label: 'Officer' },
    { key: 'age_days',     label: 'Days Open', render: v => <span className={`font-mono ${v > 60 ? 'text-red-400' : v > 30 ? 'text-yellow-400' : 'text-gray-400'}`}>{v}d</span> },
    { key: 'status',       label: 'Status', render: v => <StatusBadge status={v} /> },
  ];

  if (loading) return <LoadingState msg="Loading intelligence data..." />;
  if (error)   return <ErrorState msg={error} onRetry={fetchAll} />;

  return (
    <PageShell
      title="Intelligence Hub"
      subtitle="Threat analysis, repeat offenders, and flagged cases"
      icon="🧠"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="🔴" label="Repeat Offenders" value={repeatOffenders.length} color="red" />
        <StatCard icon="⚠️" label="High Priority" value={highPriorityCases.length} color="orange" />
        <StatCard icon="🚨" label="Active Alerts" value={suspiciousAlerts.length} color="yellow" />
        <StatCard icon="🎯" label="High Risk Subjects" value={repeatOffenders.filter(r => r.risk_level === 'High').length} color="purple" />
      </div>

      {/* Alerts Panel */}
      {suspiciousAlerts.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="⚠ Active Intelligence Alerts" subtitle="Auto-generated from case data" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suspiciousAlerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded border ${
                a.severity === 'Critical'
                  ? 'bg-red-900/20 border-red-700/40'
                  : 'bg-yellow-900/20 border-yellow-700/40'
              }`}>
                <span className="text-xl">{a.severity === 'Critical' ? '🔴' : '🟡'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase">{a.type}</span>
                    <StatusBadge status={a.severity} />
                  </div>
                  <p className="text-sm text-white font-semibold mt-0.5">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Repeat Offenders */}
      <Card className="p-4">
        <SectionHeader
          title="Repeat Offender Registry"
          subtitle={`${repeatOffenders.length} flagged individuals`}
        />
        <Table
          cols={offenderCols}
          rows={repeatOffenders}
          emptyMsg="No repeat offenders found."
        />
      </Card>

      {/* High Priority Cases */}
      <Card className="p-4">
        <SectionHeader
          title="Flagged Cases Panel"
          subtitle="High priority active investigations"
        />
        <Table
          cols={caseCols}
          rows={highPriorityCases}
          emptyMsg="No flagged cases."
        />
      </Card>
    </PageShell>
  );
}
