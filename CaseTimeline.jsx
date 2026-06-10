import React, { useEffect, useState } from 'react';
import { getCaseTimeline } from '../../services/api';
import { LoadingState, ErrorState } from '../shared/UI';

const ACTION_META = {
  'Status Change':    { icon: '🔄', color: 'blue' },
  'Evidence Added':   { icon: '🔬', color: 'purple' },
  'Officer Assigned': { icon: '👮', color: 'green' },
  'Criminal Added':   { icon: '👤', color: 'red' },
  'Court Update':     { icon: '⚖️', color: 'yellow' },
  'Note Added':       { icon: '📝', color: 'gray' },
  'Registration':     { icon: '📋', color: 'blue' },
};

const colorMap = {
  blue:   'border-blue-500 bg-blue-500/20 text-blue-300',
  purple: 'border-purple-500 bg-purple-500/20 text-purple-300',
  green:  'border-green-500 bg-green-500/20 text-green-300',
  red:    'border-red-500 bg-red-500/20 text-red-300',
  yellow: 'border-yellow-500 bg-yellow-500/20 text-yellow-300',
  gray:   'border-gray-600 bg-gray-700/30 text-gray-400',
};

export default function CaseTimeline({ caseId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    getCaseTimeline(caseId)
      .then(r => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <LoadingState msg="Loading timeline..." />;
  if (error)   return <ErrorState msg={error} />;
  if (!events.length) return (
    <div className="text-center py-8 text-gray-600 text-xs font-mono">No timeline events found.</div>
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-4 bottom-4 w-px bg-gray-800" />

      <div className="space-y-1">
        {events.map((ev, i) => {
          const meta = ACTION_META[ev.action_type] || ACTION_META['Note Added'];
          const cls  = colorMap[meta.color];
          const isLast = i === events.length - 1;

          return (
            <div key={i} className="relative flex gap-4 pl-0">
              {/* Icon bubble */}
              <div className={`relative z-10 w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center border text-base ${cls}`}>
                {meta.icon}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-xs font-mono font-bold ${cls.split(' ').pop()}`}>
                      {ev.action_type}
                    </span>
                    {ev.action_taken && (
                      <span className="text-gray-300 text-xs ml-2">{ev.action_taken}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 font-mono flex-shrink-0">
                    {ev.logged_at ? new Date(ev.logged_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }) : '—'}
                  </span>
                </div>

                {/* Status change arrow */}
                {ev.old_status && ev.new_status && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs bg-gray-800 text-gray-400 font-mono px-1.5 py-0.5 rounded">{ev.old_status}</span>
                    <span className="text-gray-600 text-xs">→</span>
                    <span className="text-xs bg-blue-900/40 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-700/40">{ev.new_status}</span>
                  </div>
                )}

                {ev.remarks && (
                  <p className="text-xs text-gray-500 mt-1 italic">{ev.remarks}</p>
                )}

                {ev.performed_by && (
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">
                    👮 {ev.performed_by}{ev.rank_name ? ` · ${ev.rank_name}` : ''}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
