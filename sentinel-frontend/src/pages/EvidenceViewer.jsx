import React, { useEffect, useState } from 'react';
import { getEvidence } from '../services/api';
import { Table, StatusBadge, LoadingState, ErrorState } from '../components/shared/UI';

export default function EvidenceViewer({ caseId }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (caseId) fetchEvidence();
  }, [caseId]);

  async function fetchEvidence() {
    setLoading(true); setError(null);
    try {
      const res = await getEvidence({ case_id: caseId });
      setEvidence(res.data.data || res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState text="Loading Evidence..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchEvidence} />;
  if (evidence.length === 0) return <p className="text-slate-400 text-sm">No evidence attached to this case.</p>;

  return (
    <Table 
      columns={['Ref', 'Type', 'Status', 'Date']}
      data={evidence.map(e => [
        <span className="font-mono text-slate-300">{e.evidence_ref}</span>,
        e.type_name || 'Unknown',
        <StatusBadge status={e.custody_status} />,
        new Date(e.seized_date).toLocaleDateString()
      ])}
    />
  );
}
