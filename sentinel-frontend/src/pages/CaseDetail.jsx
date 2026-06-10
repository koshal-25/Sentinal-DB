import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCaseById } from '../services/api';
import { PageShell, Card, StatusBadge, LoadingState, ErrorState } from '../components/shared/UI';
import CaseTimeline from './CaseTimeline'; // assuming it exists
import EvidenceViewer from './EvidenceViewer'; // assuming it exists

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchCase(); }, [id]);

  async function fetchCase() {
    setLoading(true); setError(null);
    try {
      const res = await getCaseById(id);
      setCaseData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState text="Loading Case Details..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchCase} />;
  if (!caseData) return <ErrorState msg="Case not found" />;

  return (
    <PageShell 
      title={`Case ${caseData.case_number}`} 
      subtitle={`Priority: ${caseData.priority}`}
      action={
        <div className="flex space-x-3">
          <Link to="/cases" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg shadow transition-colors">
            Back to Cases
          </Link>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors">
            Update Status
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Case Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="Case Information">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Current Status</p>
                <StatusBadge status={caseData.status} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Filed On</p>
                <p className="font-medium text-slate-200">{new Date(caseData.filed_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Linked FIR</p>
                <p className="font-mono text-blue-400">{caseData.fir_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Lead Officer</p>
                <p className="font-medium text-slate-200">{caseData.lead_officer || 'Unassigned'}</p>
              </div>
            </div>
          </Card>

          <Card title="Legal Sections">
            {caseData.sections && caseData.sections.length > 0 ? (
              <ul className="space-y-2">
                {caseData.sections.map((sec, i) => (
                  <li key={i} className="p-3 bg-slate-800 rounded border border-slate-700">
                    <span className="font-mono text-blue-400 mr-2">{sec.act_code} {sec.section_code}</span>
                    <span className="text-sm text-slate-300">{sec.section_title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">No legal sections added yet.</p>
            )}
          </Card>
        </div>

        {/* Right Column: Timeline & Evidence Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Note: I am importing CaseTimeline and EvidenceViewer. If they manage their own fetching using caseId, I pass it down. */}
          <Card title="Case Timeline">
            <CaseTimeline caseId={id} />
          </Card>
          
          <Card title="Evidence Attached">
            <EvidenceViewer caseId={id} />
          </Card>
        </div>
        
      </div>
    </PageShell>
  );
}
