import React, { useState, useEffect } from 'react';
import { getOfficers, getCases } from '../services/api';
import { PageShell, Card, SectionHeader, Table, StatusBadge, StatCard, Modal } from '../components/shared/UI';

const TASK_KEY = 'sentinel_tasks';

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASK_KEY)) || []; } catch { return []; }
}
function saveTasks(tasks) {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES   = ['Pending', 'In Progress', 'Completed', 'Overdue'];

export default function TaskScheduler() {
  const [tasks, setTasks]       = useState(loadTasks);
  const [officers, setOfficers] = useState([]);
  const [cases, setCases]       = useState([]);
  const [showModal, setShowModal]= useState(false);
  const [editing, setEditing]   = useState(null);
  const [filter, setFilter]     = useState('all');
  const [form, setForm]         = useState({
    title: '', description: '', assigned_to: '', case_id: '',
    priority: 'Medium', status: 'Pending', deadline: '',
  });

  useEffect(() => {
    getOfficers().then(r => setOfficers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    getCases({ limit: 50 }).then(r => {
      const d = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setCases(d);
    }).catch(() => {});

    // Auto-mark overdue
    const now = new Date();
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.deadline && t.status === 'Pending' && new Date(t.deadline) < now)
          return { ...t, status: 'Overdue' };
        return t;
      });
      saveTasks(updated);
      return updated;
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', assigned_to: '', case_id: '', priority: 'Medium', status: 'Pending', deadline: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditing(task.id);
    setForm({ ...task });
    setShowModal(true);
  };

  const saveTask = () => {
    if (!form.title.trim()) return;
    const updated = editing
      ? tasks.map(t => t.id === editing ? { ...form, id: editing } : t)
      : [...tasks, { ...form, id: Date.now(), created_at: new Date().toISOString() }];
    saveTasks(updated);
    setTasks(updated);
    setShowModal(false);
  };

  const deleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    setTasks(updated);
  };

  const cycleStatus = (id) => {
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const idx = STATUSES.indexOf(t.status);
      return { ...t, status: STATUSES[(idx + 1) % STATUSES.length] };
    });
    saveTasks(updated);
    setTasks(updated);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const cols = [
    { key: 'title',       label: 'Task',     render: (v, row) => (
      <div>
        <p className="text-white text-xs font-medium">{v}</p>
        {row.description && <p className="text-gray-600 text-xs mt-0.5 truncate max-w-xs">{row.description}</p>}
      </div>
    )},
    { key: 'assigned_to', label: 'Assigned',  render: v => <span className="font-mono text-xs text-blue-400">{v || '—'}</span> },
    { key: 'priority',    label: 'Priority',  render: v => <StatusBadge status={v} /> },
    { key: 'status',      label: 'Status',    render: (v, row) => (
      <button onClick={() => cycleStatus(row.id)} title="Click to advance status">
        <StatusBadge status={v} />
      </button>
    )},
    { key: 'deadline',    label: 'Deadline', render: v => {
      if (!v) return '—';
      const d = new Date(v);
      const overdue = d < new Date() && true;
      return <span className={`font-mono text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>{d.toLocaleDateString('en-IN')}</span>;
    }},
    { key: 'id', label: '', render: (v, row) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(row)} className="text-gray-600 hover:text-blue-400 text-xs">✏️</button>
        <button onClick={() => deleteTask(v)} className="text-gray-600 hover:text-red-400 text-xs">🗑️</button>
      </div>
    )},
  ];

  const summary = STATUSES.reduce((acc, s) => { acc[s] = tasks.filter(t => t.status === s).length; return acc; }, {});

  return (
    <PageShell
      title="Task Scheduler"
      subtitle="Assign, track, and manage operational tasks"
      icon="📅"
      actions={
        <button onClick={openNew}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono px-4 py-2 rounded transition-colors">
          + New Task
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="📋" label="Pending"    value={summary.Pending    || 0} color="yellow" />
        <StatCard icon="🔄" label="In Progress" value={summary['In Progress'] || 0} color="blue" />
        <StatCard icon="✅" label="Completed"  value={summary.Completed  || 0} color="green" />
        <StatCard icon="⏰" label="Overdue"    value={summary.Overdue    || 0} color="red" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="All Tasks" subtitle={`${filtered.length} tasks`} />
          <div className="flex gap-1">
            {['all', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-xs font-mono px-2 py-1 rounded ${filter === s ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'text-gray-600 hover:text-gray-300'}`}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
        <Table cols={cols} rows={filtered} emptyMsg="No tasks. Click '+ New Task' to create one." />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <div className="space-y-3">
          {[
            { key: 'title',       label: 'Title *',     type: 'text', placeholder: 'e.g. Review Case #CR-2024-101' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'deadline',    label: 'Deadline',    type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-mono text-gray-500 block mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none resize-none"
                  value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              ) : (
                <input type={f.type} placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Priority</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Status</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {officers.length > 0 && (
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Assign to Officer</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {officers.map(o => <option key={o.officer_id} value={o.full_name}>{o.full_name} · {o.rank_name}</option>)}
              </select>
            </div>
          )}
          {cases.length > 0 && (
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Linked Case</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                value={form.case_id} onChange={e => setForm(p => ({ ...p, case_id: e.target.value }))}>
                <option value="">— None —</option>
                {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.case_number} · {c.crime_name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={saveTask}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-mono py-2 rounded transition-colors">
              {editing ? 'Update Task' : 'Create Task'}
            </button>
            <button onClick={() => setShowModal(false)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-mono py-2 rounded transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
