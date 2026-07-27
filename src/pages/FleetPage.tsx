import { useEffect, useState } from 'react';
import {
  Truck, Plus, X, Fuel, Gauge, MapPin, Search,
  MoreVertical, AlertTriangle, CheckCircle2, Wrench, WifiOff, Edit2, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle, VehicleType, VehicleStatus } from '../types';
import { vehicleStatusConfig, formatTimeAgo } from '../lib/utils';

const TYPE_ICONS: Record<string, string> = { truck: '🚛', van: '🚐', bike: '🏍', car: '🚗' };
const STATUS_ICON: Record<VehicleStatus, typeof CheckCircle2> = {
  en_route: CheckCircle2,
  idle: CheckCircle2,
  maintenance: Wrench,
  offline: WifiOff,
};

export function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    supabase.from('vehicles').select('*').order('name').then(({ data, error: err }) => {
      setVehicles(data || []);
      if (err) console.error('Fleet load error:', err.message);
      setLoading(false);
    });
    const ch = supabase.channel('fleet-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (p) => {
        if (p.eventType === 'INSERT') setVehicles((prev) => [...prev, p.new as Vehicle]);
        else if (p.eventType === 'UPDATE') setVehicles((prev) => prev.map((v) => v.id === p.new.id ? p.new as Vehicle : v));
        else if (p.eventType === 'DELETE') setVehicles((prev) => prev.filter((v) => v.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (filterStatus === 'all' || v.status === filterStatus) &&
      (v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q));
  });

  const statusCounts = Object.keys(vehicleStatusConfig).reduce((acc, key) => {
    acc[key] = vehicles.filter((v) => v.status === key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All', count: vehicles.length }, ...Object.entries(vehicleStatusConfig).map(([key, cfg]) => ({ key, label: cfg.label, count: statusCounts[key] || 0 }))].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${filterStatus === s.key ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            {s.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filterStatus === s.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles by name or plate…" className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            {(['grid', 'table'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3.5 py-2 text-xs font-semibold transition-colors ${view === v ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card h-52 shimmer" />)}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => {
            const cfg = vehicleStatusConfig[v.status];
            const StatusIcon = STATUS_ICON[v.status];
            return (
              <div key={v.id} className="card card-hover p-5 group relative">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === v.id ? null : v.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                  {menuOpen === v.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-8 w-36 card shadow-card-lg z-30 animate-scale-in overflow-hidden">
                        <button
                          onClick={() => { setEditVehicle(v); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Vehicle
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete ${v.name}?`)) {
                              await supabase.from('vehicles').delete().eq('id', v.id);
                            }
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${v.status === 'en_route' ? 'bg-accent-50' : v.status === 'maintenance' ? 'bg-warning-50' : v.status === 'offline' ? 'bg-slate-100' : 'bg-primary-50'}`}>
                    {TYPE_ICONS[v.type] || '🚛'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{v.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{v.plate}</p>
                  </div>
                </div>

                <span className={`badge ${cfg.color} mb-3`}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>

                <div className="space-y-2.5 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs"><Gauge className="w-3.5 h-3.5" />Speed</span>
                    <span className="font-semibold text-slate-900">{v.speed} km/h</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs"><Fuel className="w-3.5 h-3.5" />Fuel Level</span>
                      <span className={`text-xs font-bold ${v.fuel_level < 30 ? 'text-danger-600' : v.fuel_level < 50 ? 'text-warning-600' : 'text-accent-600'}`}>{v.fuel_level}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${v.fuel_level}%`,
                        backgroundColor: v.fuel_level > 50 ? '#10b981' : v.fuel_level > 25 ? '#f59e0b' : '#ef4444'
                      }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.current_lat ? `${v.current_lat.toFixed(2)}, ${v.current_lng?.toFixed(2)}` : 'No GPS'}</span>
                    <span>{formatTimeAgo(v.last_seen)}</span>
                  </div>
                </div>
                {v.fuel_level < 25 && (
                  <div className="mt-3 flex items-center gap-1.5 p-2 rounded-lg bg-danger-50 border border-danger-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-danger-700">Critical fuel level</span>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No vehicles found</p>
              <p className="text-sm text-slate-400">Try a different search or filter</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Vehicle</th><th>Plate</th><th>Type</th><th>Status</th>
                  <th>Speed</th><th>Fuel</th><th>Mileage</th><th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const cfg = vehicleStatusConfig[v.status];
                  return (
                    <tr key={v.id} className="cursor-pointer">
                      <td><span className="font-semibold text-slate-900">{v.name}</span></td>
                      <td><span className="font-mono text-sm text-slate-600">{v.plate}</span></td>
                      <td><span className="capitalize text-sm text-slate-600">{v.type}</span></td>
                      <td><span className={`badge ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span></td>
                      <td><span className="text-sm text-slate-700">{v.speed} km/h</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${v.fuel_level}%`, backgroundColor: v.fuel_level > 50 ? '#10b981' : v.fuel_level > 25 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className={`text-xs font-semibold ${v.fuel_level < 30 ? 'text-danger-600' : 'text-slate-700'}`}>{v.fuel_level}%</span>
                        </div>
                      </td>
                      <td><span className="text-sm text-slate-700">{v.mileage.toLocaleString()}</span></td>
                      <td><span className="text-xs text-slate-400">{formatTimeAgo(v.last_seen)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddVehicleModal onClose={() => setShowAdd(false)} />}
      {editVehicle && (
        <EditVehicleModal
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
        />
      )}
    </div>
  );
}

function AddVehicleModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', plate: '', type: 'truck' as VehicleType, status: 'idle' as VehicleStatus, fuel_level: '100' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim() || !form.plate.trim()) { setError('Name and plate are required'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('vehicles').insert({
      name: form.name, plate: form.plate, type: form.type, status: form.status,
      fuel_level: parseInt(form.fuel_level),
      current_lat: 28.6139 + (Math.random() - 0.5) * 8,
      current_lng: 77.209 + (Math.random() - 0.5) * 8,
    });
    setSaving(false);
    if (err) setError(err.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-scale-in shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Add New Vehicle</h3>
            <p className="text-sm text-slate-500">Register a vehicle to the fleet</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Vehicle Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fleet Truck 09" className="input" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">License Plate *</label>
            <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="e.g. DL-09-XY-1234" className="input font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className="input">
                {['truck', 'van', 'bike', 'car'].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Initial Fuel %</label>
              <input type="number" min="0" max="100" value={form.fuel_level} onChange={(e) => setForm({ ...form, fuel_level: e.target.value })} className="input" />
            </div>
          </div>
          {error && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Adding…' : 'Add Vehicle'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [form, setForm] = useState({
    name: vehicle.name,
    status: vehicle.status as VehicleStatus,
    fuel_level: String(vehicle.fuel_level),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('vehicles').update({
      name: form.name,
      status: form.status as VehicleStatus,
      fuel_level: parseInt(form.fuel_level) || vehicle.fuel_level,
    }).eq('id', vehicle.id);
    setSaving(false);
    if (err) setError(err.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-scale-in shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Edit Vehicle</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{vehicle.plate}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Vehicle Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })} className="input">
                {Object.entries(vehicleStatusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Fuel Level %</label>
              <input type="number" min="0" max="100" value={form.fuel_level} onChange={(e) => setForm({ ...form, fuel_level: e.target.value })} className="input" />
            </div>
          </div>
          {error && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

