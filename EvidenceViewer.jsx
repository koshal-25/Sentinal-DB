import React, { useEffect, useState } from 'react';
import { getCaseEvidence } from '../../services/api';
import { LoadingState, ErrorState, StatusBadge, Card } from '../shared/UI';

function EvidenceTypeIcon({ type }) {
  const map = {
    'Physical':   '🧱',
    'Digital':    '💾',
    'Biological': '🧬',
    'Document':   '📄',
    'Image':      '🖼️',
    'Video':      '📹',
    'Audio':      '🎙️',
  };
  return <span>{map[type] || '📦'}</span>;
}

function MediaPreview({ url, type }) {
  const ext = url?.split('.').pop()?.toLowerCase();
  const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);
  const isPDF   = ext === 'pdf';

  if (!url) return (
    <div className="w-full h-32 bg-gray-800/50 rounded flex items-center justify-center text-gray-600 text-xs font-mono">
      No file attached
    </div>
  );

  if (isImage) return (
    <img src={url} alt="Evidence"
      className="w-full h-32 object-cover rounded border border-gray-700 cursor-pointer hover:opacity-90"
      onClick={() => window.open(url, '_blank')}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );

  if (isPDF) return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded text-red-400 hover:bg-red-900/30 transition-colors">
      <span>📄</span>
      <span className="text-xs font-mono">View PDF Document</span>
    </a>
  );

  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-blue-400 hover:bg-blue-900/30 transition-colors">
      <span>📎</span>
      <span className="text-xs font-mono">View Attachment</span>
    </a>
  );
}

export default function EvidenceViewer({ caseId }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [expanded, setExpanded]         = useState(null);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    getCaseEvidence(caseId)
      .then(r => setEvidenceList(Array.isArray(r.data) ? r.data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <LoadingState msg="Loading evidence..." />;
  if (error)   return <ErrorState msg={error} />;
  if (!evidenceList.length) return (
    <div className="text-center py-8 text-gray-600 text-xs font-mono">No evidence on record.</div>
  );

  return (
    <div className="space-y-3">
      {evidenceList.map((ev, i) => (
        <div key={ev.evidence_id || i}
          className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50">
          {/* Header */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <EvidenceTypeIcon type={ev.evidence_type_name || ev.type} />
            <div className="flex-1 text-left">
              <p className="text-sm text-white font-mono">{ev.evidence_number || `EVD-${String(i+1).padStart(3,'0')}`}</p>
              <p className="text-xs text-gray-500">{ev.description?.slice(0, 60) || 'No description'}</p>
            </div>
            <StatusBadge status={ev.status || 'Active'} />
            <span className="text-gray-600 text-xs">{expanded === i ? '▲' : '▼'}</span>
          </button>

          {/* Expanded */}
          {expanded === i && (
            <div className="border-t border-gray-800 p-4 space-y-4">
              {/* File preview */}
              {ev.file_url && <MediaPreview url={ev.file_url} type={ev.evidence_type_name} />}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Type',        ev.evidence_type_name || '—'],
                  ['Location',    ev.storage_location || '—'],
                  ['Collected By',ev.collected_by || '—'],
                  ['Collected At',ev.collected_at ? new Date(ev.collected_at).toLocaleDateString('en-IN') : '—'],
                  ['Condition',   ev.condition || '—'],
                  ['Hash / Ref',  ev.hash_value || ev.fingerprint_ref || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-800/50 rounded p-2">
                    <p className="text-[10px] text-gray-600 font-mono uppercase">{k}</p>
                    <p className="text-xs text-gray-300 font-mono mt-0.5 truncate">{v}</p>
                  </div>
                ))}
              </div>

              {/* Chain of Custody */}
              {ev.custody_logs?.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Chain of Custody</p>
                  <div className="space-y-1">
                    {ev.custody_logs.map((log, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        <span className="text-gray-400 font-mono">{new Date(log.transferred_at).toLocaleDateString('en-IN')}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-gray-300">{log.transferred_to}</span>
                        {log.reason && <span className="text-gray-600">({log.reason})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ev.notes && (
                <div className="bg-gray-800/30 rounded p-3">
                  <p className="text-[10px] text-gray-600 font-mono uppercase mb-1">Notes</p>
                  <p className="text-xs text-gray-400">{ev.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
