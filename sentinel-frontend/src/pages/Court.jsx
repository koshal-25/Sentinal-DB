import React, { useEffect, useState } from 'react';
import { getCourts, getProceedings, createProceeding, deleteProceeding, getJudgments, createJudgment, getCases } from '../services/api';
import { PageShell, Card, Table, StatusBadge, LoadingState, ErrorState, Modal } from '../components/shared/UI';

export default function Court() {
  const [activeTab, setActiveTab] = useState('proceedings');
  const [proceedings, setProceedings] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [courts, setCourts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    case_id: '', court_id: '', hearing_date: '', next_date: '', proceeding_type: 'Bail Hearing', 
    judge_name: '', outcome: '', notes: '', judgment_date: '', verdict: 'Convicted', sentence_years: 0, sentence_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    fetchData(); 
    fetchLookups();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'proceedings') {
        const res = await getProceedings();
        setProceedings(res.data);
      } else {
        const res = await getJudgments();
        setJudgments(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLookups() {
    try {
      const [cRes, csRes] = await Promise.all([getCourts(), getCases({ limit: 100 })]);
      setCourts(cRes.data);
      setCases(csRes.data.data || []);
    } catch (err) { console.error('Lookup failed', err); }
  }

  const handleAdd = () => {
    setFormData({
      case_id: cases[0]?.case_id || '',
      court_id: courts[0]?.court_id || '',
      hearing_date: new Date().toISOString().split('T')[0],
      next_date: '',
      proceeding_type: 'Bail Hearing',
      judge_name: '',
      outcome: '',
      notes: '',
      judgment_date: new Date().toISOString().split('T')[0],
      verdict: 'Convicted',
      sentence_years: 0,
      sentence_notes: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteProceeding = async (id) => {
    if (!window.confirm('Delete this proceeding record?')) return;
    try {
      await deleteProceeding(id);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (activeTab === 'proceedings') {
        await createProceeding(formData);
      } else {
        await createJudgment(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && proceedings.length === 0 && judgments.length === 0) return <LoadingState text="Loading Court Records..." />;
  if (error) return <ErrorState msg={error} onRetry={fetchData} />;

  return (
    <PageShell 
      title="Legal & Court Portal" 
      subtitle="Track judicial proceedings, hearings, and final judgments."
      actions={<button onClick={handleAdd} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2">
        <span>➕</span> {activeTab === 'proceedings' ? 'Log Hearing' : 'Record Judgment'}
      </button>}
    >
      <div className="mb-6 flex space-x-1 bg-slate-900 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('proceedings')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'proceedings' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Court Proceedings
        </button>
        <button 
          onClick={() => setActiveTab('judgments')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'judgments' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Final Judgments
        </button>
      </div>

      <Card>
        {activeTab === 'proceedings' ? (
          <Table 
            columns={['Date', 'Case', 'Court', 'Type', 'Judge', 'Outcome', 'Actions']}
            data={proceedings.map(p => [
              <div className="flex flex-col">
                <span className="font-semibold text-slate-200">{new Date(p.hearing_date).toLocaleDateString()}</span>
                {p.next_date && <span className="text-[10px] text-purple-400 font-mono uppercase">Next: {new Date(p.next_date).toLocaleDateString()}</span>}
              </div>,
              <div className="flex flex-col">
                <span className="text-xs font-mono text-slate-400">{p.case_number}</span>
                <span className="text-xs font-medium text-slate-300 truncate max-w-[150px]">{p.crime_name}</span>
              </div>,
              <span className="text-sm">{p.court_name}</span>,
              <StatusBadge status={p.proceeding_type} />,
              p.judge_name || 'N/A',
              <span className="text-xs text-slate-400 italic truncate max-w-[150px]" title={p.outcome}>{p.outcome || 'Pending'}</span>,
              <button onClick={() => handleDeleteProceeding(p.proceeding_id)} title="Delete" className="text-red-400 hover:text-red-300 text-lg">🗑️</button>
            ])}
          />
        ) : (
          <Table 
            columns={['Date', 'Case', 'Court', 'Verdict', 'Sentence', 'Notes']}
            data={judgments.map(j => [
              new Date(j.judgment_date).toLocaleDateString(),
              <span className="font-mono text-xs">{j.case_number}</span>,
              j.court_name,
              <StatusBadge status={j.verdict} />,
              j.sentence_years ? `${j.sentence_years} Years` : 'N/A',
              <span className="text-xs text-slate-400 truncate max-w-[200px]" title={j.sentence_notes}>{j.sentence_notes || '—'}</span>
            ])}
          />
        )}
      </Card>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={activeTab === 'proceedings' ? "Log Court Hearing" : "Record Final Judgment"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Select Case</label>
              <select 
                required
                value={formData.case_id} 
                onChange={e => setFormData({...formData, case_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                <option value="">Select Case...</option>
                {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.case_number} - {c.crime_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Court</label>
              <select 
                required
                value={formData.court_id} 
                onChange={e => setFormData({...formData, court_id: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
              >
                <option value="">Select Court...</option>
                {courts.map(c => <option key={c.court_id} value={c.court_id}>{c.court_name}</option>)}
              </select>
            </div>
          </div>

          {activeTab === 'proceedings' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Hearing Date</label>
                  <input type="date" required value={formData.hearing_date} onChange={e => setFormData({...formData, hearing_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Next Date (Optional)</label>
                  <input type="date" value={formData.next_date} onChange={e => setFormData({...formData, next_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Proceeding Type</label>
                  <select value={formData.proceeding_type} onChange={e => setFormData({...formData, proceeding_type: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                    {['Bail Hearing','Framing of Charges','Evidence Recording','Arguments','Judgment','Sentencing','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Judge Name</label>
                  <input value={formData.judge_name} onChange={e => setFormData({...formData, judge_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="Hon'ble Justice..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1">Outcome / Order</label>
                <input value={formData.outcome} onChange={e => setFormData({...formData, outcome: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="e.g. Bail Granted, Charges Framed" />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1">Notes</label>
                <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Judgment Date</label>
                  <input type="date" required value={formData.judgment_date} onChange={e => setFormData({...formData, judgment_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">Verdict</label>
                  <select value={formData.verdict} onChange={e => setFormData({...formData, verdict: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                    {['Convicted','Acquitted','Dismissed','Compounded','Appeal Filed'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1">Sentence (Years)</label>
                <input type="number" value={formData.sentence_years} onChange={e => setFormData({...formData, sentence_years: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1">Sentence Notes</label>
                <textarea rows="3" value={formData.sentence_notes} onChange={e => setFormData({...formData, sentence_notes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="Details of imprisonment, fine, etc." />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Record'}
          </button>
        </form>
      </Modal>
    </PageShell>
  );
}
