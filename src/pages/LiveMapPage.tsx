import { useEffect, useState, useRef, useCallback } from 'react';
import { Truck, Navigation, Fuel, Gauge, X, MapPin, Clock, Package, Zap, Maximize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../types';
import { vehicleStatusConfig, formatTimeAgo } from '../lib/utils';

const INDIA_BOUNDS = { latMin: 8, latMax: 37, lngMin: 68, lngMax: 97 };

function latLngToCanvas(lat: number, lng: number, w: number, h: number): [number, number] {
  const x = ((lng - INDIA_BOUNDS.lngMin) / (INDIA_BOUNDS.lngMax - INDIA_BOUNDS.lngMin)) * w;
  const y = ((INDIA_BOUNDS.latMax - lat) / (INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin)) * h;
  return [x, y];
}

const CITY_NODES = [
  { label: 'New Delhi', lat: 28.61, lng: 77.21 },
  { label: 'Mumbai', lat: 19.08, lng: 72.88 },
  { label: 'Bengaluru', lat: 12.97, lng: 77.59 },
  { label: 'Chennai', lat: 13.08, lng: 80.27 },
  { label: 'Hyderabad', lat: 17.39, lng: 78.49 },
  { label: 'Ahmedabad', lat: 23.03, lng: 72.58 },
  { label: 'Kolkata', lat: 22.57, lng: 88.36 },
  { label: 'Jaipur', lat: 26.91, lng: 75.79 },
  { label: 'Pune', lat: 18.52, lng: 73.85 },
  { label: 'Surat', lat: 21.17, lng: 72.83 },
  { label: 'Lucknow', lat: 26.85, lng: 80.95 },
  { label: 'Nagpur', lat: 21.15, lng: 79.09 },
];

const ROUTE_PAIRS: [number, number][] = [
  [0, 1], [0, 5], [0, 7], [0, 6], [1, 2], [1, 5], [1, 8],
  [2, 3], [2, 4], [3, 4], [4, 6], [5, 8], [7, 10], [10, 6],
];

const STATUS_COLORS: Record<string, string> = {
  en_route: '#10b981',
  idle: '#94a3b8',
  maintenance: '#f59e0b',
  offline: '#64748b',
};

export function LiveMapPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('vehicles').select('*').then(({ data, error: err }) => {
      if (err) { setError(err.message); setLoading(false); return; }
      setVehicles(data || []);
      setLoading(false);
    });
    const channel = supabase.channel('map-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (p) => {
        if (p.eventType === 'UPDATE') setVehicles((prev) => prev.map((v) => v.id === p.new.id ? p.new as Vehicle : v));
        if (p.eventType === 'INSERT') setVehicles((prev) => [...prev, p.new as Vehicle]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Simulate vehicle movement via edge function every 10s
  useEffect(() => {
    const tick = () => {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-fleet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      }).catch(() => {});
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Dark background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a0f1e');
    bg.addColorStop(1, '#0d1529');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Route lines
    ROUTE_PAIRS.forEach(([a, b]) => {
      const cityA = CITY_NODES[a];
      const cityB = CITY_NODES[b];
      if (!cityA || !cityB) return;
      const [ax, ay] = latLngToCanvas(cityA.lat, cityA.lng, w, h);
      const [bx, by] = latLngToCanvas(cityB.lat, cityB.lng, w, h);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = 'rgba(52,121,251,0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // City nodes
    CITY_NODES.forEach((city) => {
      const [cx, cy] = latLngToCanvas(city.lat, city.lng, w, h);
      // Glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
      grd.addColorStop(0, 'rgba(52,121,251,0.3)');
      grd.addColorStop(1, 'rgba(52,121,251,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      // Dot
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(city.label, cx + 6, cy - 4);
    });
  }, []);

  useEffect(() => {
    drawMap();
    const obs = new ResizeObserver(drawMap);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [drawMap]);

  const filtered = filterStatus === 'all'
    ? vehicles
    : vehicles.filter((v) => v.status === filterStatus);

  // Map markers also respect the filter
  const visibleOnMap = (v: Vehicle) =>
    v.current_lat != null &&
    v.current_lng != null &&
    v.status !== 'offline' &&
    (filterStatus === 'all' || v.status === filterStatus);

  const getPos = (lat: number, lng: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const [x, y] = latLngToCanvas(lat, lng, container.clientWidth, container.clientHeight);
    return { x, y };
  };

  if (error) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <p className="text-danger-600 font-semibold mb-1">Failed to load fleet data</p>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3">
          <div
            className={`card overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
            style={{ height: isFullscreen ? '100vh' : 580 }}
          >
            {/* Map Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3" style={{ background: 'linear-gradient(to bottom, rgba(10,15,30,0.8), transparent)' }}>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs text-white font-medium border border-white/10">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-500" />
                  </span>
                  Live GPS Tracking
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs text-slate-300 border border-white/10">
                  {vehicles.filter((v) => v.status === 'en_route').length} vehicles moving
                </span>
              </div>
              <button
                onClick={() => setIsFullscreen((f) => !f)}
                className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-white border border-white/10 transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div ref={containerRef} className="relative w-full h-full bg-slate-950">
              <canvas ref={canvasRef} className="absolute inset-0" />

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Vehicle Markers — respects filter */}
              {vehicles
                .filter(visibleOnMap)
                .map((v) => {
                  const pos = getPos(v.current_lat!, v.current_lng!);
                  const color = STATUS_COLORS[v.status];
                  const isSelected = selected?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                      style={{ left: pos.x, top: pos.y }}
                    >
                      {v.status === 'en_route' && (
                        <>
                          <span className="absolute inset-[-4px] rounded-full animate-ping" style={{ backgroundColor: color + '30' }} />
                          <span className="absolute inset-[-2px] rounded-full" style={{ backgroundColor: color + '20' }} />
                        </>
                      )}
                      <div
                        className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${isSelected ? 'scale-125 shadow-lg' : 'group-hover:scale-110'}`}
                        style={{ backgroundColor: color + 'dd', borderColor: isSelected ? '#fff' : color + '80', boxShadow: isSelected ? `0 0 16px ${color}` : 'none' }}
                      >
                        <Truck className="w-3.5 h-3.5 text-white" />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-white/10 backdrop-blur-sm text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl">
                        <p className="font-semibold">{v.name}</p>
                        <p className="text-slate-400">{v.speed} km/h · {v.fuel_level}% fuel</p>
                      </div>
                    </button>
                  );
                })}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Legend</p>
                <div className="space-y-1.5">
                  {Object.entries(vehicleStatusConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                      <span className="text-[11px] text-slate-300">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats overlay */}
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'En Route', value: vehicles.filter((v) => v.status === 'en_route').length, color: '#10b981' },
                    { label: 'Idle', value: vehicles.filter((v) => v.status === 'idle').length, color: '#94a3b8' },
                    { label: 'Maintenance', value: vehicles.filter((v) => v.status === 'maintenance').length, color: '#f59e0b' },
                    { label: 'Offline', value: vehicles.filter((v) => v.status === 'offline').length, color: '#64748b' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Panel */}
        <div className="flex flex-col gap-3">
          {/* Filter */}
          <div className="card p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">Filter by Status</p>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'en_route', 'idle', 'maintenance'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === s
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'en_route' ? 'En Route' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle list */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[480px]">
            {filtered.map((v) => {
              const cfg = vehicleStatusConfig[v.status];
              const isSelected = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(isSelected ? null : v)}
                  className={`w-full text-left card p-3.5 transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-primary-500 shadow-md' : 'hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot} ${v.status === 'en_route' ? 'animate-pulse' : ''}`} />
                      <span className="text-sm font-semibold text-slate-900">{v.name}</span>
                    </div>
                    <span className={`badge ${cfg.color} text-[10px]`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 font-mono">{v.plate}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{v.speed} km/h</span>
                    <span className={`flex items-center gap-1 ${v.fuel_level < 30 ? 'text-danger-600 font-semibold' : ''}`}>
                      <Fuel className="w-3 h-3" />{v.fuel_level}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${v.fuel_level}%`,
                        backgroundColor: v.fuel_level > 50 ? '#10b981' : v.fuel_level > 25 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vehicle Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white h-full overflow-y-auto animate-slide-in-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selected.plate}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${selected.status === 'en_route' ? 'from-accent-50 to-accent-100/50 border border-accent-200' : 'from-slate-50 to-slate-100/50 border border-slate-200'}`}>
                <span className={`badge ${vehicleStatusConfig[selected.status].color} mb-3`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vehicleStatusConfig[selected.status].dot} ${selected.status === 'en_route' ? 'animate-pulse' : ''}`} />
                  {vehicleStatusConfig[selected.status].label}
                </span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { label: 'Speed', value: `${selected.speed} km/h`, icon: Gauge },
                    { label: 'Heading', value: `${selected.heading}°`, icon: Navigation },
                    { label: 'Fuel Level', value: `${selected.fuel_level}%`, icon: Fuel },
                    { label: 'Mileage', value: `${selected.mileage.toLocaleString()} km`, icon: Truck },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-white/70 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <Icon className="w-3.5 h-3.5" />{s.label}
                        </div>
                        <p className="text-sm font-bold text-slate-900">{s.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <p className="text-sm font-semibold text-slate-700">GPS Position</p>
                </div>
                <p className="text-sm font-mono text-slate-900">
                  {selected.current_lat?.toFixed(6)}, {selected.current_lng?.toFixed(6)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Last Ping</p>
                </div>
                <p className="text-sm text-slate-600">{formatTimeAgo(selected.last_seen)}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Fuel Level</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-2xl font-bold ${selected.fuel_level < 30 ? 'text-danger-600' : 'text-slate-900'}`}>{selected.fuel_level}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${selected.fuel_level}%`,
                      backgroundColor: selected.fuel_level > 50 ? '#10b981' : selected.fuel_level > 25 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                {selected.fuel_level < 30 && (
                  <p className="text-xs text-danger-600 font-semibold mt-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Low fuel — Schedule refuel
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Vehicle Info</p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium text-slate-900 capitalize">{selected.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Mileage</span>
                    <span className="font-medium text-slate-900">{selected.mileage.toLocaleString()} km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
