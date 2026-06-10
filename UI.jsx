import React from 'react';

// ── Status Badge ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    'Open':                'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Under Investigation': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'Chargesheeted':       'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Trial in Progress':   'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Convicted':           'bg-red-500/20 text-red-300 border-red-500/40',
    'Acquitted':           'bg-green-500/20 text-green-300 border-green-500/40',
    'Closed':              'bg-gray-500/20 text-gray-400 border-gray-500/40',
    'Active':              'bg-green-500/20 text-green-300 border-green-500/40',
    'Inactive':            'bg-gray-500/20 text-gray-400 border-gray-500/40',
    'High':                'bg-red-500/20 text-red-300 border-red-500/40',
    'Medium':              'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'Low':                 'bg-green-500/20 text-green-300 border-green-500/40',
    'Critical':            'bg-red-600/30 text-red-200 border-red-500/60',
    'Repeat Offender':     'bg-red-600/30 text-red-200 border-red-500/60',
    'Pending':             'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'Completed':           'bg-green-500/20 text-green-300 border-green-500/40',
  };
  const cls = map[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${cls}`}>
      {status}
    </span>
  );
}

// ── Risk Badge ────────────────────────────────────────────────
export function RiskBadge({ level }) {
  const map = {
    High:     'bg-red-500/20 text-red-300 border-red-500/40',
    Medium:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    Low:      'bg-green-500/20 text-green-300 border-green-500/40',
    Critical: 'bg-red-700/30 text-red-200 border-red-600/60',
  };
  const cls = map[level] || 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {level} Risk
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   'from-blue-600/20 to-blue-600/5 border-blue-600/30 text-blue-400',
    red:    'from-red-600/20 to-red-600/5 border-red-600/30 text-red-400',
    green:  'from-green-600/20 to-green-600/5 border-green-600/30 text-green-400',
    yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-600/30 text-yellow-400',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-600/30 text-purple-400',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-600/30 text-orange-400',
  };
  return (
    <div className={`relative overflow-hidden rounded-lg border bg-gradient-to-br p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`text-2xl opacity-60`}>{icon}</div>
      </div>
      {trend !== undefined && (
        <div className={`text-xs mt-2 ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-white font-mono">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ cols, rows, onRow, emptyMsg = 'No records found.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {cols.map(c => (
              <th key={c.key || c.label}
                  className="text-left px-3 py-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-gray-600 text-xs">{emptyMsg}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}
                onClick={() => onRow?.(row)}
                className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${onRow ? 'cursor-pointer' : ''}`}>
              {cols.map(c => (
                <td key={c.key || c.label} className="px-3 py-2.5 text-gray-300">
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={`${s} border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin`} />
  );
}

export function LoadingState({ msg = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner />
      <p className="text-xs text-gray-600 font-mono">{msg}</p>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────
export function ErrorState({ msg, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="text-red-500 text-3xl">⚠</div>
      <p className="text-sm text-gray-400">{msg || 'Failed to load data'}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs text-blue-400 hover:text-blue-300 font-mono border border-blue-500/30 px-3 py-1 rounded">
          Retry
        </button>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-gray-900 border border-gray-700 rounded-xl shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-mono font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Page Shell ────────────────────────────────────────────────
export function PageShell({ title, subtitle, icon, actions, children }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <div>
            <h1 className="text-xl font-bold text-white font-mono">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
