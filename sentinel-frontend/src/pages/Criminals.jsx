import React, { useEffect, useState } from 'react';
import { getCriminals, createCriminal, updateCriminal, deleteCriminal } from '../services/api';
import { PageShell, Card, Table, StatusBadge, LoadingState, ErrorState, Modal } from '../components/shared/UI';

export default function Criminals() {
  const [criminals, setCriminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    crn: '', full_name: '', alias_names: '', date_of_birth: '', gender: 'Male', risk_level: 'Low', arrest_status: 'At Large'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCriminals(); }, [riskFilter]);

  async function fetchCriminals() {
    setLoading(true); setError(null);
    try {
      const params = riskFilter !== 'all' ? { risk_level: riskFilter } : {};
      const res = await getCriminals(params);
      setCriminals(res.data.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ crn: `CRN-${Date.now()}`, full_name: '', alias_names: '', date_of_birth: '', gender: 'Male', risk_level: 'Low', arrest_status: 'At Large' });
    setIsModalOpen(true);
  };

  const handleEdit = (criminal) => {
    setEditingId(criminal.criminal_id);
    setFormData({
      crn: criminal.crn,
      full_name: criminal.full_name,
      alias_names: formatAliases(criminal.alias_names),
      date_of_birth: criminal.date_of_birth ? criminal.date_of_birth.split('T')[0] : '',
      gender: criminal.gender,
      risk_level: criminal.risk_level,
      arrest_status: criminal.arrest_status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    try {
      await deleteCriminal(id);
      fetchCriminals();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        alias_names: formData.alias_names.split(',').map(s => s.trim()).filter(Boolean)
      };
      if (editingId) {
        await updateCriminal(editingId, data);
      } else {
        await createCriminal(data);
      }
      setIsModalOpen(false);
      fetchCriminals();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAliases = (aliasJson) => {
    if (!aliasJson) return '';
    try {
      const parsed = typeof aliasJson === 'string' ? JSON.parse(aliasJson) : aliasJson;
      return Array.isArray(parsed) ? parsed.join(', ') : '';
    } catch { return ''; }
  };

  if (loading && criminals.length === 0) return <LoadingState text="Loading Criminal Database..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchCriminals} />;

  return (
    <PageShell 
      title="Criminal Profiles" 
      subtitle="Database of suspects, convicts, and known offenders."
      actions={<button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2"><span>➕</span> Add Profile</button>}
    >
      <div className="mb-6 flex space-x-4">
        {['all', 'Low', 'Medium', 'High', 'Critical'].map(risk => (
          <button
            key={risk}
            onClick={() => setRiskFilter(risk)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              riskFilter === risk 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {risk === 'all' ? 'All Risk Levels' : `${risk} Risk`}
          </button>
        ))}
      </div>

      <Card>
        <Table 
          columns={['Name', 'Aliases', 'Gender', 'DOB', 'Risk Level', 'Status', 'Actions']}
          data={criminals.map(c => [
            <span className="font-semibold text-slate-200">
              {c.full_name} 
              {c.is_repeat_offender ? <span className="ml-2 text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">Repeat</span> : ''}
            </span>,
            <span className="text-sm text-slate-400">{formatAliases(c.alias_names) || 'None'}</span>,
            c.gender,
            c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : 'Unknown',
            <StatusBadge status={c.risk_level} />,
            <StatusBadge status={c.arrest_status} />,
            <div className="flex gap-3">
              <button onClick={() => handleEdit(c)} title="Edit" className="text-blue-400 hover:text-blue-300 text-lg">📝</button>
              <button onClick={() => handleDelete(c.criminal_id)} title="Delete" className="text-red-400 hover:text-red-300 text-lg">🗑️</button>
            </div>
          ])}
        />
      </Card>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Profile' : 'New Criminal Profile'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">CRN</label>
              <input 
                disabled={editingId}
                value={formData.crn} 
                onChange={e => setFormData({...formData, crn: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Full Name</label>
              <input 
                required
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Alias Names (comma separated)</label>
            <input 
              value={formData.alias_names} 
              onChange={e => setFormData({...formData, alias_names: e.target.value})}
              placeholder="e.g. Ravi, Kutta"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Risk Level</label>
              <select 
                value={formData.risk_level} 
                onChange={e => setFormData({...formData, risk_level: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['Low', 'Medium', 'High', 'Critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Arrest Status</label>
              <select 
                value={formData.arrest_status} 
                onChange={e => setFormData({...formData, arrest_status: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['At Large', 'Arrested', 'In Custody', 'Released on Bail', 'Absconding'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : editingId ? 'Update Profile' : 'Create Profile'}
          </button>
        </form>
      </Modal>
    </PageShell>
  );
}
