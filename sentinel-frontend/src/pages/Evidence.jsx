import React, { useEffect, useState } from 'react';
import { getEvidence, createEvidence, updateEvidence, deleteEvidence, getEvidenceTypes, getCases, getOfficers } from '../services/api';
import { PageShell, Card, Table, StatusBadge, LoadingState, ErrorState, Modal } from '../components/shared/UI';

export default function Evidence() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [types, setTypes] = useState([]);
  const [cases, setCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    evidence_ref: '', evidence_type_id: '', description: '', seized_date: '', 
    seized_by: '', location_seized: '', custody_status: 'Collected', case_id: '', storage_location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    fetchEvidence(); 
    fetchLookups();
  }, [statusFilter]);

  async function fetchEvidence() {
    setLoading(true); setError(null);
    try {
      const params = statusFilter !== 'all' ? { custody_status: statusFilter } : {};
      const res = await getEvidence(params);
      setEvidenceList(res.data.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLookups() {
    try {
      const [tRes, cRes, oRes] = await Promise.all([
        getEvidenceTypes(),
        getCases({ limit: 100 }),
        getOfficers()
      ]);
      setTypes(tRes.data);
      setCases(cRes.data.data || []);
      setOfficers(oRes.data);
    } catch (err) { console.error('Lookup fetch failed:', err); }
  }

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ 
      evidence_ref: `EVD-${Date.now()}`, 
      evidence_type_id: types[0]?.evidence_type_id || '', 
      description: '', 
      seized_date: new Date().toISOString().split('T')[0], 
      seized_by: officers[0]?.officer_id || '', 
      location_seized: '', 
      custody_status: 'Collected', 
      case_id: cases[0]?.case_id || '',
      storage_location: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (evd) => {
    setEditingId(evd.evidence_id);
    setFormData({
      evidence_ref: evd.evidence_ref,
      evidence_type_id: evd.evidence_type_id,
      description: evd.description,
      seized_date: evd.seized_date ? evd.seized_date.split('T')[0] : '',
      seized_by: evd.seized_by,
      location_seized: evd.location_seized,
      custody_status: evd.custody_status,
      case_id: evd.case_id,
      storage_location: evd.storage_location || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this evidence record?')) return;
    try {
      await deleteEvidence(id);
      fetchEvidence();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateEvidence(editingId, formData);
      } else {
        await createEvidence(formData);
      }
      setIsModalOpen(false);
      fetchEvidence();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && evidenceList.length === 0) return <LoadingState text="Loading Evidence Vault..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchEvidence} />;

  return (
    <PageShell 
      title="Evidence Vault" 
      subtitle="Chain of custody tracking for all physical and digital evidence."
      actions={<button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2"><span>➕</span> Log Evidence</button>}
    >
      <div className="mb-6 flex space-x-4 overflow-x-auto pb-2">
        {['all', 'Collected', 'In Lab', 'In Storage', 'Presented in Court', 'Destroyed', 'Returned'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === st 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {st === 'all' ? 'All Evidence' : st}
          </button>
        ))}
      </div>

      <Card>
        <Table 
          columns={['Ref', 'Type', 'Case', 'Seized Date', 'Status', 'Actions']}
          data={evidenceList.map(e => [
            <span className="font-mono text-slate-300">{e.evidence_ref}</span>,
            e.type_name,
            <span className="text-xs text-blue-400">{e.case_number || `ID: ${e.case_id}`}</span>,
            new Date(e.seized_date).toLocaleDateString(),
            <StatusBadge status={e.custody_status} />,
            <div className="flex gap-3">
              <button onClick={() => handleEdit(e)} title="Edit" className="text-blue-400 hover:text-blue-300 text-lg">📝</button>
              <button onClick={() => handleDelete(e.evidence_id)} title="Delete" className="text-red-400 hover:text-red-300 text-lg">🗑️</button>
            </div>
          ])}
        />
      </Card>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Update Evidence Status' : 'Log New Evidence'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Ref Number</label>
              <input 
                disabled={editingId}
                value={formData.evidence_ref} 
                onChange={e => setFormData({...formData, evidence_ref: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Type</label>
              <select 
                disabled={editingId}
                value={formData.evidence_type_id} 
                onChange={e => setFormData({...formData, evidence_type_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white disabled:opacity-50"
              >
                {types.map(t => <option key={t.evidence_type_id} value={t.evidence_type_id}>{t.type_name}</option>)}
              </select>
            </div>
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Associate with Case</label>
              <select 
                value={formData.case_id} 
                onChange={e => setFormData({...formData, case_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.case_number} - {c.crime_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Description</label>
            <textarea 
              required
              rows="3"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Custody Status</label>
              <select 
                value={formData.custody_status} 
                onChange={e => setFormData({...formData, custody_status: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['Collected', 'In Lab', 'In Storage', 'Presented in Court', 'Destroyed', 'Returned'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Storage Location</label>
              <input 
                value={formData.storage_location} 
                onChange={e => setFormData({...formData, storage_location: e.target.value})}
                placeholder="e.g. Locker A-12"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : editingId ? 'Update Evidence' : 'Log Evidence'}
          </button>
        </form>
      </Modal>
    </PageShell>
  );
}
