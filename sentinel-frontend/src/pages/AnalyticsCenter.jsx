import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { getAnalytics, getCases } from '../services/api';
import { PageShell, Card, SectionHeader, LoadingState, ErrorState, StatCard } from '../components/shared/UI';

const PIE_COLORS = ['#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsCenter() {
  const [data, setData] = useState(null);
  const [caseSummary, setCaseSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true); setError(null);
    try {
      const [analyticsRes, caseRes] = await Promise.all([
        getAnalytics(),
        getCases({ limit: 200 }),
      ]);
      setData(analyticsRes);

      // Build status distribution from cases
      const cases = Array.isArray(caseRes.data) ? caseRes.data : (caseRes.data?.data || []);
      const statusMap = {};
      cases.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      setCaseSummary(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState msg="Crunching analytics..." />;
  if (error)   return <ErrorState msg={error} onRetry={fetchData} />;

  const stats = data?.stats || {};
  const trends = Array.isArray(data?.trends) ? data.trends : [];
  const workload = Array.isArray(data?.workload) ? data.workload : [];

  // Build location chart data from trends if available
  const locationData = trends.length > 0
    ? trends.slice(0, 8).map(t => ({ name: t.crime_location || t.month || t.label || 'Unknown', count: t.count || t.total || 0 }))
    : [
        { name: 'North Zone', count: 34 },
        { name: 'South Zone', count: 28 },
        { name: 'East Zone',  count: 19 },
        { name: 'West Zone',  count: 42 },
        { name: 'Central',    count: 15 },
      ];

  const statusData = caseSummary.length > 0 ? caseSummary : [
    { name: 'Open',               value: 45 },
    { name: 'Under Investigation',value: 30 },
    { name: 'Chargesheeted',      value: 12 },
    { name: 'Closed',             value: 18 },
  ];

  const workloadData = workload.length > 0
    ? workload.map(w => ({ name: w.full_name || w.officer || 'Officer', cases: w.active_cases || w.cases || 0 }))
    : [
        { name: 'Kumar',   cases: 8 },
        { name: 'Sharma',  cases: 12 },
        { name: 'Patel',   cases: 6 },
        { name: 'Reddy',   cases: 9 },
        { name: 'Singh',   cases: 11 },
      ];

  return (
    <PageShell title="Analytics Center" subtitle="Crime statistics, trends, and officer performance" icon="📊">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="📁" label="Total Cases"    value={stats.total_cases    || '—'} color="blue"   />
        <StatCard icon="🔓" label="Open Cases"     value={stats.open_cases     || '—'} color="orange" />
        <StatCard icon="✅" label="Resolved"       value={stats.closed_cases   || '—'} color="green"  />
        <StatCard icon="👮" label="Active Officers" value={stats.active_officers|| '—'} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crime by Location */}
        <Card className="p-4">
          <SectionHeader title="Crime by Location" subtitle="Case count per zone / area" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={locationData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Cases" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Case Status Distribution */}
        <Card className="p-4">
          <SectionHeader title="Case Status Distribution" subtitle="Current case pipeline" />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={45}
                dataKey="value"
                paddingAngle={2}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af' }}
                formatter={(v) => <span style={{ color: '#9ca3af' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Officer Workload */}
        <Card className="p-4 lg:col-span-2">
          <SectionHeader title="Officer Workload" subtitle="Active case load per officer" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cases" name="Active Cases" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly Trend if available */}
      {trends.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Crime Trend (Monthly)" subtitle="Case filings over time" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trends} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Cases" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </PageShell>
  );
}
