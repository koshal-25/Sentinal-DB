import React, { useEffect, useState } from 'react';
import { getCaseTimeline } from '../services/api';
import { LoadingState, ErrorState } from '../components/shared/UI';

export default function CaseTimeline({ caseId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (caseId) fetchTimeline();
  }, [caseId]);

  async function fetchTimeline() {
    setLoading(true); setError(null);
    try {
      const res = await getCaseTimeline(caseId);
      setTimeline(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState text="Loading Timeline..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchTimeline} />;
  if (timeline.length === 0) return <p className="text-slate-400 text-sm">No timeline entries found.</p>;

  return (
    <div className="relative border-l border-slate-700 ml-3 space-y-6 pb-4">
      {timeline.map((entry, idx) => (
        <div key={idx} className="relative pl-6">
          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-1.5 top-1.5 ring-4 ring-slate-900" />
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-semibold text-slate-200">{entry.action}</h4>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(entry.logged_at).toLocaleString()}
            </span>
          </div>
          {entry.remarks && <p className="text-sm text-slate-300 mt-1">{entry.remarks}</p>}
          <p className="text-xs text-slate-500 mt-2">Logged by: <span className="text-slate-400">{entry.logged_by_name || 'System'}</span></p>
        </div>
      ))}
    </div>
  );
}
