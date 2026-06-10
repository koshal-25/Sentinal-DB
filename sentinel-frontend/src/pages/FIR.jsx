import React, { useEffect, useState } from 'react';
import { getFIRs, createFIR, updateFIR, deleteFIR, getCrimeTypes, getStations } from '../services/api';
import { PageShell, Card, Table, StatusBadge, LoadingState, ErrorState, Modal } from '../components/shared/UI';

export default function FIR() {
  const [firs, setFirs] = useState([]);
  const [types, setTypes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fir_number: '', crime_date: '', crime_time: '', crime_location: '', description: '', crime_type_id: '', station_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    fetchFIRs(); 
    fetchLookups();
  }, [filter]);

  async function fetchFIRs() {
    setLoading(true); setError(null);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await getFIRs(params);
      setFirs(res.data.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLookups() {
    try {
      const [tRes, sRes] = await Promise.all([getCrimeTypes(), getStations()]);
      setTypes(tRes.data);
      setStations(sRes.data);
    } catch (err) { console.error('Lookup fetch failed:', err); }
  }

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      fir_number: `FIR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      crime_date: new Date().toISOString().split('T')[0],
      crime_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      crime_location: '',
      description: '',
      crime_type_id: types[0]?.crime_type_id || '',
      station_id: stations[0]?.station_id || ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (fir) => {
    setEditingId(fir.fir_id);
    setFormData({
      fir_number: fir.fir_number,
      crime_date: fir.crime_date ? fir.crime_date.split('T')[0] : '',
      crime_time: fir.crime_time || '',
      crime_location: fir.crime_location,
      description: fir.description,
      crime_type_id: fir.crime_type_id,
      station_id: fir.station_id
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FIR? This is a sensitive action.')) return;
    try {
      await deleteFIR(id);
      fetchFIRs();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateFIR(editingId, formData);
      } else {
        await createFIR(formData);
      }
      setIsModalOpen(false);
      fetchFIRs();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && firs.length === 0) return <LoadingState text="Loading FIR Registry..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchFIRs} />;

  return (
    <PageShell 
      title="FIR Registry" 
      subtitle="First Information Reports recorded across all police stations."
      actions={<button onClick={handleAdd} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 flex items-center gap-3">
        <span className="text-xl">➕</span> 
        <span>Add New Record</span>
      </button>}
    >
      <div className="mb-6 flex space-x-4 overflow-x-auto pb-2">
        {['all', 'Open', 'Under Investigation', 'Chargesheeted', 'Closed', 'Abated'].map(st => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === st 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {st === 'all' ? 'All FIRs' : st}
          </button>
        ))}
      </div>

      <Card>
        <Table 
          columns={['FIR No.', 'Crime Type', 'Date', 'Location', 'Status', 'Station', 'Actions']}
          data={firs.map(f => [
            <span className="font-mono text-slate-300">{f.fir_number}</span>,
            <span className="text-slate-200">{f.crime_name}</span>,
            new Date(f.crime_date).toLocaleDateString(),
            <span className="truncate max-w-xs block" title={f.crime_location}>{f.crime_location}</span>,
            <StatusBadge status={f.status} />,
            f.station_name,
            <div className="flex gap-3">
              <button onClick={() => handleEdit(f)} title="Edit" className="text-blue-400 hover:text-blue-300 text-lg">📝</button>
              <button onClick={() => handleDelete(f.fir_id)} title="Delete" className="text-red-400 hover:text-red-300 text-lg">🗑️</button>
            </div>
          ])}
        />
      </Card>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="File New FIR"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">FIR Number</label>
              <input 
                required
                value={formData.fir_number} 
                onChange={e => setFormData({...formData, fir_number: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Crime Type</label>
              <select 
                value={formData.crime_type_id} 
                onChange={e => setFormData({...formData, crime_type_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {types.map(t => <option key={t.crime_type_id} value={t.crime_type_id}>{t.crime_name}</option>)}
              </select>
            </div>
          </div>

          {editingId && (
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Current Status</label>
              <select 
                value={formData.status || 'Open'} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                {['Open', 'Under Investigation', 'Chargesheeted', 'Closed', 'Abated'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Date of Occurrence</label>
              <input 
                type="date"
                required
                value={formData.crime_date} 
                onChange={e => setFormData({...formData, crime_date: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Time</label>
              <input 
                type="time"
                value={formData.crime_time} 
                onChange={e => setFormData({...formData, crime_time: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Police Station</label>
            <select 
              value={formData.station_id} 
              onChange={e => setFormData({...formData, station_id: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            >
              {stations.map(s => <option key={s.station_id} value={s.station_id}>{s.station_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Incident Location</label>
            <input 
              required
              value={formData.crime_location} 
              onChange={e => setFormData({...formData, crime_location: e.target.value})}
              placeholder="e.g. 12th Cross, MG Road"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">Description / Narrative</label>
            <textarea 
              required
              rows="4"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Filing FIR...' : 'Submit FIR Registry'}
          </button>
        </form>
      </Modal>
    </PageShell>
  );
}
