import { useEffect, useState } from 'react';
import {
  Route, MapPin, Plus, X, Search, Truck, Clock,
  CheckCircle2, Play, Navigation,
  MoreVertical, Edit2, Trash2, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Route as RouteType, Vehicle, Shipment } from '../types';
import { formatDateTime } from '../lib/utils';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  active: { label: 'Active', color: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  completed: { label: 'Completed', color: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  cancelled: { label: 'Cancelled', color: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
};

function WaypointStep({ label, address, active, index }: { label: string; address?: string; active?: boolean; index: number }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? 'bg-primary-600 text-white shadow-glow-primary' : 'bg-slate-100 text-slate-500'}`}>
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-slate-200 my-1" />
      </div>
      <div className="pb-5 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {address && <p className="text-xs text-slate-500 mt-0.5">{address}</p>}
      </div>
    </div>
  );
}

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<RouteType | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('routes').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('shipments').select('*'),
    ]).then(([r, v, s]) => {
      setRoutes((r.data || []) as RouteType[]);
      setVehicles((v.data || []) as Vehicle[]);
      setShipments((s.data || []) as Shipment[]);
      setLoading(false);
    });
  }, []);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const shipmentMap = new Map(shipments.map((s) => [s.id, s]));

  const filtered = routes.filter((r) => {
    const v = vehicleMap.get(r.vehicle_id);
    const q = search.toLowerCase();
    return (filterStatus === 'all' || r.status === filterStatus) &&
      (v?.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
  });

  const activeCount = routes.filter((r) => r.status === 'active').length;
  const plannedCount = routes.filter((r) => r.status === 'planned').length;
  const completedCount = routes.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Routes', value: activeCount, sub: 'In progress', color: 'bg-accent-100 text-accent-700', icon: Play },
          { label: 'Planned', value: plannedCount, sub: 'Scheduled', color: 'bg-primary-100 text-primary-700', icon: Route },
          { label: 'Completed', value: completedCount, sub: 'Finished', color: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
          { label: 'Total Distance', value: `${Math.round(routes.reduce((s, r) => s + (r.total_distance_km || 0), 0))} km`, sub: 'All routes', color: 'bg-warning-100 text-warning-700', icon: Navigation },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="stat-card">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes..." className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'planned', label: 'Planned' }, { key: 'completed', label: 'Completed' }].map((f) => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-2 text-xs font-semibold transition-colors ${filterStatus === f.key ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Plan Route
          </button>
        </div>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-56 shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const v = vehicleMap.get(r.vehicle_id);
            const s = r.shipment_id ? shipmentMap.get(r.shipment_id) : null;
            const cfg = statusConfig[r.status];
            const waypoints = (r.waypoints as { lat?: number; lng?: number; address?: string }[] | undefined) || [];
            return (
              <div key={r.id} className="card card-hover p-5 relative group">
                <div className="absolute top-3 right-3 z-10">
                  <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); }} className="p-1.5 rounded-lg hover:bg-slate-100 transition-opacity opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                  {menuOpen === r.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-8 w-36 card shadow-card-lg z-30 animate-scale-in overflow-hidden">
                        <button onClick={() => setSelected(r)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Edit2 className="w-3.5 h-3.5" /> View Detail</button>
                        {r.status !== 'active' && r.status !== 'completed' && (
                          <button onClick={async () => { await supabase.from('routes').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', r.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-accent-600 hover:bg-accent-50"><Play className="w-3.5 h-3.5" /> Start Route</button>
                        )}
                        {r.status === 'active' && (
                          <button onClick={async () => { await supabase.from('routes').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', r.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary-600 hover:bg-primary-50"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</button>
                        )}
                        <button onClick={async () => { if (confirm('Delete this route?')) await supabase.from('routes').delete().eq('id', r.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <Route className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{v?.name || 'Unassigned'}</p>
                    <p className="text-xs text-slate-400 font-mono">{v?.plate}</p>
                  </div>
                  <span className={`badge ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
                </div>

                {s && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 p-2 bg-slate-50 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{s.destination_address}</span>
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" />Distance</span>
                    <span className="font-semibold text-slate-800">{r.total_distance_km ? `${r.total_distance_km} km` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Est. Duration</span>
                    <span className="font-semibold text-slate-800">{r.estimated_duration_min ? `${r.estimated_duration_min} min` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Waypoints</span>
                    <span className="font-semibold text-slate-800">{waypoints.length}</span>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                    style={{
                      width: `${r.status === 'completed' ? 100 : r.status === 'active' ? 65 : r.status === 'planned' ? 20 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">Route progress</span>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {r.status === 'completed' ? '100%' : r.status === 'active' ? '65%' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Route className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No routes found</p>
              <p className="text-sm text-slate-400">Create a new route to get started</p>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddRouteModal vehicles={vehicles} shipments={shipments} onClose={() => setShowAdd(false)} />}
      {selected && <RouteDetailDrawer route={selected} vehicle={vehicleMap.get(selected.vehicle_id)} shipment={selected.shipment_id ? shipmentMap.get(selected.shipment_id) : undefined} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RouteDetailDrawer({ route, vehicle, shipment, onClose }: { route: RouteType; vehicle?: Vehicle; shipment?: Shipment; onClose: () => void }) {
  const cfg = statusConfig[route.status];
  const waypoints = (route.waypoints as { lat?: number; lng?: number; address?: string }[] | undefined) || [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[420px] bg-white h-full overflow-y-auto animate-slide-in-right shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Route Detail</h3>
            <p className="text-xs text-slate-500">{vehicle?.name} · {vehicle?.plate}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <span className={`badge ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>

          {vehicle && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center"><Truck className="w-5 h-5 text-primary-600" /></div>
                <div>
                  <p className="font-semibold text-slate-900">{vehicle.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{vehicle.plate}</p>
                </div>
              </div>
            </div>
          )}

          {shipment && (
            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Linked Shipment</p>
              <p className="text-sm font-semibold text-slate-900">{shipment.tracking_no}</p>
              <p className="text-xs text-slate-500">{shipment.customer_name}</p>
              <p className="text-xs text-slate-500 mt-1">{shipment.destination_address}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Distance</p><p className="text-sm font-bold text-slate-900">{route.total_distance_km ? `${route.total_distance_km} km` : '—'}</p></div>
            <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Duration</p><p className="text-sm font-bold text-slate-900">{route.estimated_duration_min ? `${route.estimated_duration_min} min` : '—'}</p></div>
          </div>

          {route.started_at && (
            <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Started</p><p className="text-sm font-bold text-slate-900">{formatDateTime(route.started_at)}</p></div>
          )}
          {route.completed_at && (
            <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Completed</p><p className="text-sm font-bold text-slate-900">{formatDateTime(route.completed_at)}</p></div>
          )}

          {/* Waypoints */}
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Route Waypoints</p>
            <div className="space-y-0">
              {waypoints.map((wp, i) => (
                <WaypointStep key={i} label={wp.address || `Waypoint ${i + 1}`} address={wp.lat && wp.lng ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}` : undefined} active={route.status === 'active'} index={i} />
              ))}
              {waypoints.length === 0 && <p className="text-sm text-slate-400">No waypoints defined.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddRouteModal({ vehicles, shipments, onClose }: { vehicles: Vehicle[]; shipments: Shipment[]; onClose: () => void }) {
  const [form, setForm] = useState({ vehicle_id: '', shipment_id: '', estimated_distance: '', estimated_duration: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.vehicle_id) { setError('Vehicle is required'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('routes').insert({
      vehicle_id: form.vehicle_id,
      shipment_id: form.shipment_id || null,
      total_distance_km: form.estimated_distance ? parseFloat(form.estimated_distance) : null,
      estimated_duration_min: form.estimated_duration ? parseInt(form.estimated_duration) : null,
      status: 'planned',
      waypoints: [
        { address: 'Origin warehouse', lat: 28.6139 + (Math.random() - 0.5) * 5, lng: 77.209 + (Math.random() - 0.5) * 5 },
        { address: 'Checkpoint 1', lat: 22.57 + (Math.random() - 0.5) * 5, lng: 88.36 + (Math.random() - 0.5) * 5 },
        { address: 'Final destination', lat: 19.08 + (Math.random() - 0.5) * 5, lng: 72.88 + (Math.random() - 0.5) * 5 },
      ],
    });
    setSaving(false);
    if (err) setError(err.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-scale-in shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-bold text-slate-900 text-lg">Plan New Route</h3><p className="text-sm text-slate-500">Create an optimized delivery route</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Vehicle *</label>
            <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="input">
              <option value="">Select vehicle</option>
              {vehicles.filter((v) => v.status !== 'offline').map((v) => <option key={v.id} value={v.id}>{v.name} — {v.plate}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Linked Shipment</label>
            <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })} className="input">
              <option value="">None</option>
              {shipments.filter((s) => s.status !== 'delivered' && s.status !== 'failed').map((s) => <option key={s.id} value={s.id}>{s.tracking_no} — {s.customer_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Est. Distance (km)</label><input type="number" value={form.estimated_distance} onChange={(e) => setForm({ ...form, estimated_distance: e.target.value })} className="input" placeholder="120" /></div>
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Est. Duration (min)</label><input type="number" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} className="input" placeholder="90" /></div>
          </div>
          {error && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Planning...' : 'Plan Route'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
