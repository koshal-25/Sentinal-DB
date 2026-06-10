import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCases, createCase, updateCase, deleteCase, getFIRs, getOfficers } from '../services/api';
import { PageShell, Card, Table, StatusBadge, LoadingState, ErrorState, Modal } from '../components/shared/UI';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [firs, setFirs] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    case_number: '', priority: 'Normal', status: 'Open', fir_id: '', lead_officer_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    fetchCases(); 
    fetchLookups();
  }, [filter]);

  async function fetchCases() {
    setLoading(true); setError(null);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await getCases(params);
      setCases(res.data.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLookups() {
    try {
      const [fRes, oRes] = await Promise.all([
        getFIRs({ limit: 100 }),
        getOfficers()
      ]);
      setFirs(fRes.data.data || []);
      setOfficers(oRes.data);
    } catch (err) { console.error('Lookup fetch failed:', err); }
  }

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      case_number: `CASE-${Date.now()}`,
      priority: 'Normal',
      status: 'Open',
      fir_id: firs[0]?.fir_id || '',
      lead_officer_id: officers[0]?.officer_id || ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (c, e) => {
    e.stopPropagation(); // Prevent row click navigation
    setEditingId(c.case_id);
    setFormData({
      case_number: c.case_number,
      priority: c.priority,
      status: c.status,
      fir_id: c.fir_id,
      lead_officer_id: c.lead_officer_id
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this case? This will not delete the linked FIR.')) return;
    try {
      await deleteCase(id);
      fetchCases();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateCase(editingId, formData);
      } else {
        await createCase(formData);
      }
      setIsModalOpen(false);
      fetchCases();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowClick = (c) => navigate(`/cases/${c.case_id}`);

  if (loading && cases.length === 0) return <LoadingState text="Loading Cases..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchCases} />;

  return (
    <PageShell 
      title="Crime Cases" 
      subtitle="Manage and track all ongoing and closed criminal investigations."
      actions={<button onClick={handleAdd} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-3">
        <span className="text-xl">➕</span> 
        <span>Register New Case</span>
      </button>}
    >
      <div className="mb-6 flex space-x-4 overflow-x-auto pb-2">
        {['all', 'Open', 'Under Investigation', 'Chargesheeted', 'Closed'].map(st => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              filter === st 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {st === 'all' ? 'All Cases' : st}
          </button>
        ))}
      </div>

      <Card>
        <Table 
          columns={['Case No.', 'Status', 'Priority', 'Filed Date', 'Lead Officer', 'Actions']}
          data={cases.map(c => [
            <span className="font-mono text-slate-300">{c.case_number}</span>,
            <StatusBadge status={c.status} />,
            <StatusBadge status={c.priority} />,
            new Date(c.filed_at).toLocaleDateString(),
            c.lead_officer || 'Unassigned',
            <div className="flex gap-3">
              <button onClick={(e) => handleEdit(c, e)} title="Edit" className="text-blue-400 hover:text-blue-300 text-lg">📝</button>
              <button onClick={(e) => handleDelete(c.case_id, e)} title="Delete" className="text-red-400 hover:text-red-300 text-lg">🗑️</button>
            </div>
          ])}
          onRowClick={(index) => handleRowClick(cases[index])}
        />
      </Card>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Case" : "Register New Case"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Case Number</label>
            <input 
              required
              value={formData.case_number} 
              onChange={e => setFormData({...formData, case_number: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Priority</label>
              <select 
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['Normal', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['Open', 'Under Investigation', 'Chargesheeted', 'Trial in Progress', 'Convicted', 'Acquitted', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Link to FIR</label>
              <select 
                required
                value={formData.fir_id} 
                onChange={e => setFormData({...formData, fir_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                <option value="">Select FIR...</option>
                {firs.map(f => <option key={f.fir_id} value={f.fir_id}>{f.fir_number} - {f.crime_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Lead Investigating Officer</label>
            <select 
              required
              value={formData.lead_officer_id} 
              onChange={e => setFormData({...formData, lead_officer_id: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="">Select Officer...</option>
              {officers.map(o => <option key={o.officer_id} value={o.officer_id}>{o.full_name} ({o.rank_name})</option>)}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : (editingId ? 'Update Case' : 'Register Case')}
          </button>
        </form>
      </Modal>
    </PageShell>
  );
}

