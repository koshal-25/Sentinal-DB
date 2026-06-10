import React, { useEffect, useRef, useState } from 'react';
import { getFIRs } from '../services/api';
import { PageShell, Card, StatCard, LoadingState, ErrorState, StatusBadge } from '../components/shared/UI';

// Leaflet loaded via CDN script tag
let L;

export default function GeoCrimeMap() {
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);
  const markersRef = useRef([]);
  const [firs, setFirs]           = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [filter, setFilter]       = useState('all');

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) { L = window.L; setLeafletReady(true); return; }
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => { L = window.L; setLeafletReady(true); };
    document.head.appendChild(script);
  }, []);

  useEffect(() => { fetchFIRs(); }, []);

  async function fetchFIRs() {
    setLoading(true); setError(null);
    try {
      const res = await getFIRs({ limit: 200 });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Only keep records with valid coordinates
      const withCoords = data.filter(f => f.latitude && f.longitude);
      // If no coords in DB, generate demo positions around India
      const mapped = withCoords.length > 0 ? withCoords : generateDemoPoints(data);
      setFirs(mapped);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function generateDemoPoints(data) {
    // Scatter around major Indian cities for demo
    const cities = [
      [28.6139, 77.2090], [19.0760, 72.8777], [12.9716, 77.5946],
      [22.5726, 88.3639], [13.0827, 80.2707], [17.3850, 78.4867],
      [23.0225, 72.5714], [18.5204, 73.8567], [26.8467, 80.9462],
      [11.0168, 76.9558],
    ];
    return data.slice(0, 50).map((f, i) => {
      const base = cities[i % cities.length];
      return {
        ...f,
        latitude:  base[0] + (Math.random() - 0.5) * 2,
        longitude: base[1] + (Math.random() - 0.5) * 2,
      };
    });
  }

  useEffect(() => {
    if (!leafletReady || !mapRef.current || loading || firs.length === 0) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

    mapInst.current = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(mapInst.current);

    renderMarkers();

    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [leafletReady, firs, loading]);

  function renderMarkers() {
    if (!mapInst.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = filter === 'all' ? firs : firs.filter(f => f.status?.toLowerCase() === filter);

    filtered.forEach(fir => {
      const color = {
        'Open': '#ef4444',
        'Under Investigation': '#f59e0b',
        'Closed': '#6b7280',
        'Referred': '#8b5cf6',
      }[fir.status] || '#3b82f6';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;
          background:${color};
          border:2px solid ${color}40;
          border-radius:50%;
          box-shadow:0 0 8px ${color}80;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([+fir.latitude, +fir.longitude], { icon })
        .addTo(mapInst.current)
        .on('click', () => setSelected(fir));

      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;background:#111;color:#fff;border:1px solid #333;padding:4px 8px;border-radius:4px">
          <b>${fir.fir_number || 'FIR'}</b><br/>${fir.crime_location || 'Unknown location'}<br/>${fir.crime_name || ''}
        </div>`,
        { permanent: false, direction: 'top', offset: [0, -8] }
      );

      markersRef.current.push(marker);
    });
  }

  useEffect(() => { if (mapInst.current) renderMarkers(); }, [filter]);

  const statusCounts = firs.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1; return acc;
  }, {});

  if (loading) return <LoadingState msg="Loading crime map..." />;
  if (error)   return <ErrorState msg={error} onRetry={fetchFIRs} />;

  return (
    <PageShell title="Geo Crime Map" subtitle="Spatial distribution of FIR-registered crimes" icon="🗺️">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="📍" label="Mapped FIRs"  value={firs.length} color="blue" />
        <StatCard icon="🔴" label="Open"         value={statusCounts['Open'] || 0} color="red" />
        <StatCard icon="🟡" label="Under Invest." value={statusCounts['Under Investigation'] || 0} color="yellow" />
        <StatCard icon="⚫" label="Closed"       value={statusCounts['Closed'] || 0} color="purple" />
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 space-y-3">
          {/* Filter */}
          <Card className="p-3">
            <p className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Filter</p>
            {['all', 'Open', 'Under Investigation', 'Closed'].map(s => (
              <button key={s}
                onClick={() => setFilter(s)}
                className={`w-full text-left text-xs font-mono px-2 py-1.5 rounded mb-1 ${
                  filter === s ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {s === 'all' ? 'All Cases' : s}
                <span className="float-right text-gray-600">
                  {s === 'all' ? firs.length : (statusCounts[s] || 0)}
                </span>
              </button>
            ))}
          </Card>

          {/* Legend */}
          <Card className="p-3">
            <p className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Legend</p>
            {[
              ['Open', '#ef4444'],
              ['Under Investigation', '#f59e0b'],
              ['Referred', '#8b5cf6'],
              ['Closed', '#6b7280'],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 mb-1.5">
                <div style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  className="w-3 h-3 rounded-full flex-shrink-0" />
                <span className="text-xs font-mono text-gray-400">{label}</span>
              </div>
            ))}
          </Card>

          {/* Selected */}
          {selected && (
            <Card className="p-3">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Selected</p>
                <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white text-sm">×</button>
              </div>
              <p className="text-xs font-mono text-blue-400 font-bold">{selected.fir_number}</p>
              <p className="text-xs text-white mt-1">{selected.crime_name || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selected.crime_location || '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selected.crime_date ? new Date(selected.crime_date).toLocaleDateString('en-IN') : ''}</p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
              {selected.description && (
                <p className="text-xs text-gray-500 mt-2 border-t border-gray-800 pt-2 line-clamp-4">{selected.description}</p>
              )}
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden border border-gray-800" style={{ height: '520px' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!leafletReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-xs text-gray-500 font-mono">Loading map engine...</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
