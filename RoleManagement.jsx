import React, { useState } from 'react';
import { PageShell, Card, SectionHeader, Table, StatusBadge, Modal } from '../../components/shared/UI';

// Static role/permission model matching the backend RBAC
const ROLES = [
  { id: 1, role_name: 'Admin',         description: 'Full system access',                     color: 'red'   },
  { id: 2, role_name: 'Officer',        description: 'FIR registration and own case management', color: 'blue'  },
  { id: 3, role_name: 'Investigator',   description: 'Case investigation and evidence handling',  color: 'purple'},
  { id: 4, role_name: 'CourtOfficial',  description: 'Court proceedings and judgment updates',    color: 'yellow'},
];

const PERMISSIONS = [
  'Create User', 'View Audit Logs', 'Register FIR', 'Assign Officers',
  'Add Evidence', 'Update Case Status', 'Add Case Log', 'View All Cases',
  'Update Judgment', 'Delete Records', 'Export Data', 'View Criminals',
  'Add Criminals', 'Manage Court', 'System Config',
];

const DEFAULT_MATRIX = {
  Admin:        new Set(PERMISSIONS),
  Officer:      new Set(['Register FIR','Assign Officers','Add Evidence','Update Case Status','Add Case Log','View All Cases','Export Data','View Criminals','Add Criminals']),
  Investigator: new Set(['Add Evidence','Update Case Status','Add Case Log','View All Cases','Export Data','View Criminals']),
  CourtOfficial:new Set(['Update Judgment','Manage Court','View All Cases']),
};

export default function RoleManagement() {
  const [matrix, setMatrix] = useState(() => {
    const m = {};
    for (const [role, perms] of Object.entries(DEFAULT_MATRIX))
      m[role] = new Set(perms);
    return m;
  });
  const [selectedRole, setSelectedRole] = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [dirty, setDirty]               = useState(false);

  function togglePerm(role, perm) {
    if (!editMode) return;
    setMatrix(prev => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      next[role].has(perm) ? next[role].delete(perm) : next[role].add(perm);
      return next;
    });
    setDirty(true);
  }

  function saveChanges() {
    // In production: PATCH /api/roles/:id/permissions
    setDirty(false);
    setEditMode(false);
    alert('Permission changes saved (UI only — wire to PATCH /api/roles/:id/permissions)');
  }

  const roleColors = {
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  };

  return (
    <PageShell
      title="Role Management"
      subtitle="View and configure role-based access permissions"
      icon="🔐"
      actions={
        <div className="flex gap-2">
          {dirty && (
            <button onClick={saveChanges}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-mono px-3 py-1.5 rounded">
              💾 Save Changes
            </button>
          )}
          <button
            onClick={() => { setEditMode(e => !e); if (editMode) setDirty(false); }}
            className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
              editMode
                ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
                : 'border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {editMode ? '🔓 Editing...' : '✏️ Edit Permissions'}
          </button>
        </div>
      }
    >
      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(role => (
          <button key={role.id}
            onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedRole?.id === role.id
                ? roleColors[role.color] + ' ring-1 ring-current'
                : 'bg-gray-900 border-gray-800 hover:border-gray-700'
            }`}
          >
            <p className="text-sm font-bold font-mono text-white">{role.role_name}</p>
            <p className="text-xs text-gray-500 mt-1">{role.description}</p>
            <p className={`text-xs font-mono mt-2 ${selectedRole?.id === role.id ? '' : 'text-gray-600'}`}>
              {matrix[role.role_name]?.size || 0} permissions
            </p>
          </button>
        ))}
      </div>

      {editMode && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded p-3 flex items-center gap-2 text-xs font-mono text-yellow-400">
          ⚠ Edit mode active — toggle permissions below. Changes are UI-only until saved.
        </div>
      )}

      {/* Full Permission Matrix */}
      <Card className="p-4">
        <SectionHeader
          title="Permission Matrix"
          subtitle={editMode ? 'Click cells to toggle — changes not persisted to backend automatically' : 'Read-only overview'}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-3 py-2 text-gray-500 font-mono w-48">Permission</th>
                {ROLES.map(r => (
                  <th key={r.id} className={`px-3 py-2 font-mono text-center ${selectedRole?.id === r.id ? 'text-white' : 'text-gray-500'}`}>
                    {r.role_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(perm => (
                <tr key={perm} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="px-3 py-2 text-gray-400 font-mono">{perm}</td>
                  {ROLES.map(role => {
                    const has = matrix[role.role_name]?.has(perm);
                    return (
                      <td key={role.id} className="px-3 py-2 text-center">
                        <button
                          onClick={() => togglePerm(role.role_name, perm)}
                          disabled={!editMode}
                          className={`w-6 h-6 rounded transition-all ${
                            has
                              ? `bg-green-500/20 text-green-400 border border-green-500/40 ${editMode ? 'hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40' : ''}`
                              : `bg-gray-800 text-gray-700 border border-gray-700 ${editMode ? 'hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/40 cursor-pointer' : ''}`
                          }`}
                        >
                          {has ? '✓' : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Detail */}
      {selectedRole && (
        <Card className="p-4">
          <SectionHeader
            title={`${selectedRole.role_name} — Permission Detail`}
            subtitle={selectedRole.description}
          />
          <div className="flex flex-wrap gap-2">
            {PERMISSIONS.map(perm => {
              const has = matrix[selectedRole.role_name]?.has(perm);
              return (
                <span key={perm}
                  className={`text-xs font-mono px-2 py-1 rounded border ${
                    has ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800/50 border-gray-800 text-gray-700 line-through'
                  }`}
                >
                  {perm}
                </span>
              );
            })}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
