import React, { useEffect, useState } from 'react';
import { getDashboardStats, getCrimeTrends, getOfficerWorkload } from '../services/api';
import { PageShell, Card, StatCard, Table, LoadingState, ErrorState } from '../components/shared/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);

  async function fetchDashboard() {
    setLoading(true); setError(null);
    try {
      const [sRes, tRes, wRes] = await Promise.all([
        getDashboardStats(),
        getCrimeTrends(),
        getOfficerWorkload()
      ]);
      setStats(sRes.data);
      
      // Transform trends for chart: group by month
      const chartData = tRes.data.reduce((acc, curr) => {
        let monthObj = acc.find(m => m.month === curr.month);
        if (!monthObj) { monthObj = { month: curr.month }; acc.push(monthObj); }
        monthObj[curr.crime_name] = curr.count;
        return acc;
      }, []);
      
      setTrends(chartData);
      setWorkload(wRes.data.slice(0, 5)); // Top 5
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState text="Loading Dashboard..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchDashboard} />;

  return (
    <PageShell title="Command Dashboard" subtitle="High-level overview of active operations and records.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Active Cases" value={stats?.open_cases || 0} trend={5} icon="📁" />
        <StatCard label="FIRs Registered" value={stats?.total_firs || 0} trend={12} icon="📄" />
        <StatCard label="Active Officers" value={stats?.active_officers || 0} trend={0} icon="👮" />
        <StatCard label="Tracked Criminals" value={stats?.total_criminals || 0} trend={2} icon="🦹" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Crime Trends (Past 12 Months)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="Theft" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                <Bar dataKey="Cyber Fraud" stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Officer Workload">
          <Table 
            columns={['Officer Name', 'Rank', 'Station', 'Active Cases', 'High Priority']}
            data={workload.map(w => [
              w.full_name, w.rank_name, w.station_name, 
              <span className="font-semibold text-blue-400">{w.active_cases}</span>,
              <span className="font-semibold text-red-400">{w.high_priority_cases}</span>
            ])}
          />
        </Card>
      </div>
    </PageShell>
  );
}
