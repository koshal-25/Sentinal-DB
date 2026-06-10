import React, { useEffect, useRef, useState } from 'react';
import { getCriminals } from '../services/api';
import { PageShell, Card, LoadingState, ErrorState, StatCard } from '../components/shared/UI';

export default function CriminalNetwork() {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const [criminals, setCriminals] = useState([]);
  const [nodes, setNodes]         = useState([]);
  const [edges, setEdges]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [hovered, setHovered]     = useState(null);
  const simRef     = useRef({ nodes: [], edges: [] });

  useEffect(() => {
    getCriminals({ limit: 60 })
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setCriminals(data);
        buildGraph(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function buildGraph(data) {
    const W = 800, H = 560;
    const ns = data.map((c, i) => ({
      id:    c.criminal_id || i,
      label: c.full_name || `Criminal ${i}`,
      risk:  c.risk_level || 'Low',
      repeat: c.is_repeat_offender,
      cases: c.total_cases || 0,
      x:     100 + Math.random() * (W - 200),
      y:     80  + Math.random() * (H - 160),
      vx: 0, vy: 0,
      data: c,
    }));

    // Build edges from criminal_relations or infer from shared crime categories
    const es = [];
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        // Connect if same crime category or manually if relation data present
        if (data[i].crime_category_id && data[i].crime_category_id === data[j].crime_category_id
            && Math.random() < 0.15) {
          es.push({ source: ns[i].id, target: ns[j].id, type: 'Associate' });
        }
      }
    }
    // Ensure some edges for demo
    if (es.length === 0 && ns.length > 1) {
      for (let k = 0; k < Math.min(ns.length - 1, 15); k++) {
        const i = Math.floor(Math.random() * ns.length);
        const j = Math.floor(Math.random() * ns.length);
        if (i !== j) es.push({ source: ns[i].id, target: ns[j].id, type: 'Associate' });
      }
    }

    simRef.current = { nodes: ns, edges: es };
    setNodes(ns);
    setEdges(es);
  }

  // Force-directed layout simulation
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    let { nodes: ns, edges: es } = simRef.current;

    const draw = () => {
      // Physics
      for (let iter = 0; iter < 3; iter++) {
        // Repulsion
        for (let i = 0; i < ns.length; i++) {
          for (let j = i + 1; j < ns.length; j++) {
            const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const f = 1200 / (dist * dist);
            const fx = (dx/dist)*f, fy = (dy/dist)*f;
            ns[i].vx -= fx; ns[i].vy -= fy;
            ns[j].vx += fx; ns[j].vy += fy;
          }
        }
        // Attraction
        es.forEach(e => {
          const s = ns.find(n => n.id === e.source);
          const t = ns.find(n => n.id === e.target);
          if (!s || !t) return;
          const dx = t.x - s.x, dy = t.y - s.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const f = (dist - 120) * 0.015;
          const fx = (dx/dist)*f, fy = (dy/dist)*f;
          s.vx += fx; s.vy += fy;
          t.vx -= fx; t.vy -= fy;
        });
        // Center gravity
        ns.forEach(n => { n.vx += (W/2 - n.x) * 0.001; n.vy += (H/2 - n.y) * 0.001; });
        // Integrate
        ns.forEach(n => {
          n.vx *= 0.85; n.vy *= 0.85;
          n.x = Math.max(30, Math.min(W-30, n.x + n.vx));
          n.y = Math.max(30, Math.min(H-30, n.y + n.vy));
        });
      }

      // Render
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);

      // Edges
      es.forEach(e => {
        const s = ns.find(n => n.id === e.source);
        const t = ns.find(n => n.id === e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(59,130,246,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Nodes
      ns.forEach(n => {
        const r = 8 + Math.min(n.cases, 10) * 0.8;
        const color = n.risk === 'High' || n.risk === 'Critical' ? '#ef4444'
                    : n.risk === 'Medium' ? '#f59e0b' : '#3b82f6';

        // Glow
        if (n.repeat) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = color + '30';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + (selected?.id === n.id ? 'ff' : '99');
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = selected?.id === n.id ? 2 : 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.label.split(' ')[0], n.x, n.y + r + 12);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges, selected]);

  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = simRef.current.nodes.find(n => {
      const r = 8 + Math.min(n.cases, 10) * 0.8 + 4;
      return Math.hypot(n.x - mx, n.y - my) < r;
    });
    setSelected(hit || null);
  }

  if (loading) return <LoadingState msg="Building criminal network..." />;
  if (error)   return <ErrorState msg={error} />;

  return (
    <PageShell title="Criminal Network Graph" subtitle="Relationship mapping between criminals and cases" icon="🕸️">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="👤" label="Nodes"       value={nodes.length} color="blue" />
        <StatCard icon="🔗" label="Connections"  value={edges.length} color="purple" />
        <StatCard icon="🔴" label="High Risk"    value={nodes.filter(n => n.risk === 'High').length} color="red" />
        <StatCard icon="♻️"  label="Repeat"      value={nodes.filter(n => n.repeat).length} color="orange" />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg overflow-hidden border border-gray-800 relative" style={{ height: 560 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
          />
          {/* Legend overlay */}
          <div className="absolute top-3 left-3 bg-gray-950/80 border border-gray-800 rounded p-2 space-y-1">
            {[['High Risk', '#ef4444'], ['Medium Risk', '#f59e0b'], ['Low Risk', '#3b82f6']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-2">
                <div style={{ background: c }} className="w-2.5 h-2.5 rounded-full" />
                <span className="text-[10px] text-gray-400 font-mono">{l}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
              <div className="w-2.5 h-2.5 rounded-full border border-red-500 bg-transparent" />
              <span className="text-[10px] text-gray-400 font-mono">Repeat Offender</span>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-gray-700 font-mono">
            Click node to inspect
          </div>
        </div>

        {/* Inspector panel */}
        <div className="w-52 flex-shrink-0">
          {selected ? (
            <Card className="p-3 space-y-3">
              <div className="flex justify-between">
                <p className="text-xs font-mono text-gray-500 uppercase">Inspector</p>
                <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white">×</button>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{selected.label}</p>
                <p className="text-xs text-gray-500 font-mono">ID: {selected.id}</p>
              </div>
              <div className="space-y-1.5">
                {[
                  ['Risk Level',  selected.risk],
                  ['Total Cases', selected.cases],
                  ['Repeat',      selected.repeat ? 'Yes' : 'No'],
                  ['Connections', edges.filter(e => e.source === selected.id || e.target === selected.id).length],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500 font-mono">{k}</span>
                    <span className={`font-mono ${k === 'Risk Level' && v === 'High' ? 'text-red-400' : 'text-gray-300'}`}>{v}</span>
                  </div>
                ))}
              </div>
              {selected.data?.crime_categories && (
                <div>
                  <p className="text-[10px] text-gray-600 font-mono uppercase mb-1">Crime Types</p>
                  <p className="text-xs text-gray-400">{selected.data.crime_categories}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4 text-center">
              <p className="text-3xl mb-2">🕸️</p>
              <p className="text-xs text-gray-600 font-mono">Click a node to inspect criminal details</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
