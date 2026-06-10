import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../services/api';

const NAV = [
  { section: 'CORE' },
  { to: '/',            icon: '⬛', label: 'Dashboard' },
  { to: '/cases',       icon: '📁', label: 'Cases' },
  { to: '/fir',         icon: '📋', label: 'FIR Registry' },
  { to: '/criminals',   icon: '👤', label: 'Criminals' },
  { to: '/evidence',    icon: '🔬', label: 'Evidence' },
  { to: '/court',       icon: '⚖️', label: 'Court Portal' },

  { section: 'INTELLIGENCE' },
  { to: '/intelligence',icon: '🧠', label: 'Intelligence Hub' },
  { to: '/analytics',   icon: '📊', label: 'Analytics Center' },
  { to: '/alerts',      icon: '🚨', label: 'Alerts & Incidents' },
  { to: '/map',         icon: '🗺️', label: 'Geo Crime Map' },
  { to: '/network',     icon: '🕸️', label: 'Criminal Network' },

  { section: 'OPERATIONS' },
  { to: '/tasks',       icon: '📅', label: 'Task Scheduler' },
  { to: '/officers',    icon: '👮', label: 'Officers' },

  { section: 'SYSTEM' },
  { to: '/system',      icon: '⚙️', label: 'System Monitor' },
  { to: '/roles',       icon: '🔐', label: 'Role Management' },
  { to: '/audit',       icon: '📝', label: 'Audit Logs' },
];

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-950 border-r border-gray-800 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-800">
        {!collapsed && (
          <div>
            <div className="text-blue-400 font-black font-mono text-sm tracking-widest">SENTINEL</div>
            <div className="text-gray-600 text-[10px] font-mono tracking-widest">CRMS v2.0</div>
          </div>
        )}
        <button onClick={() => setCollapsed(p => !p)}
          className="text-gray-600 hover:text-gray-300 p-1 rounded">
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV.map((item, i) => {
          if (item.section) {
            if (collapsed) return null;
            return (
              <div key={i} className="px-3 pt-4 pb-1">
                <span className="text-[9px] font-mono text-gray-700 tracking-widest uppercase">{item.section}</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="text-sm flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-gray-800 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-mono font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 font-mono truncate">{user?.username || 'User'}</div>
              <div className="text-[10px] text-gray-600 font-mono truncate">{user?.role || 'Officer'}</div>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="text-gray-600 hover:text-red-400 text-sm flex-shrink-0">⏻</button>
          </div>
        ) : (
          <button onClick={handleLogout} title="Logout"
            className="w-full flex justify-center text-gray-600 hover:text-red-400">⏻</button>
        )}
      </div>
    </div>
  );
}
