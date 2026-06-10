import React, { useEffect, useState } from 'react';
import { getOfficers } from '../services/api';
import { PageShell, Card, Table, LoadingState, ErrorState } from '../components/shared/UI';

export default function Officers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchOfficers(); }, []);

  async function fetchOfficers() {
    setLoading(true); setError(null);
    try {
      const res = await getOfficers();
      setOfficers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && officers.length === 0) return <LoadingState text="Loading Officer Directory..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchOfficers} />;

  const filteredOfficers = officers.filter(o => 
    o.full_name.toLowerCase().includes(search.toLowerCase()) || 
    o.badge_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell 
      title="Officer Directory" 
      subtitle="View active personnel and their current workload."
      action={<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors">+ Add Officer</button>}
    >
      <div className="mb-6 flex justify-between items-center">
        <input 
          type="text" 
          placeholder="Search by name or badge..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full max-w-md"
        />
      </div>

      <Card>
        <Table 
          columns={['Badge No.', 'Officer Name', 'Rank', 'Station', 'Contact', 'Active Cases', 'High Priority Cases']}
          data={filteredOfficers.map(o => [
            <span className="font-mono text-slate-300">{o.badge_number}</span>,
            <span className="font-semibold text-slate-200">{o.full_name}</span>,
            o.rank_name,
            o.station_name,
            o.contact_no,
            <span className="text-blue-400 font-semibold">{o.active_cases}</span>,
            <span className="text-red-400 font-semibold">{o.high_priority_cases}</span>
          ])}
        />
      </Card>
    </PageShell>
  );
}
