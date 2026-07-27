import { useEffect, useState } from 'react';
import { Phone, Mail, Star, Truck, Plus, X, Shield, TrendingUp, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Driver, Vehicle } from '../types';
import { driverStatusConfig } from '../lib/utils';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-warning-400 fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
          <path d="M10 1l2.928 5.934 6.55.952-4.739 4.62L15.855 19 10 15.917 4.145 19l1.116-6.494L.522 7.886l6.55-.952L10 1z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-slate-700 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<Driver | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('vehicles').select('*'),
    ]).then(([d, v]) => {
      setDrivers(d.data || []);
      setVehicles(v.data || []);
      setLoading(false);
    });
    const ch = supabase.channel('drivers-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (p) => {
        if (p.eventType === 'INSERT') setDrivers((prev) => [...prev, p.new as Driver]);
        else if (p.eventType === 'UPDATE') setDrivers((prev) => prev.map((d) => d.id === p.new.id ? p.new as Driver : d));
        else if (p.eventType === 'DELETE') setDrivers((prev) => prev.filter((d) => d.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (filterStatus === 'all' || d.status === filterStatus) &&
      (d.name.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q));
  });

  const topRated = [...drivers].sort((a, b) => b.rating - a.rating)[0];
  const mostTrips = [...drivers].sort((a, b) => b.trips_completed - a.trips_completed)[0];
  const onDuty = drivers.filter((d) => d.status === 'on_duty').length;
  const avgRating = drivers.length ? (drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(1) : '0';

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers', value: drivers.length, sub: 'Registered', icon: Shield, color: 'from-primary-600 to-primary-800' },
          { label: 'On Duty', value: onDuty, sub: `${drivers.filter((d) => d.status === 'available').length} available`, icon: Truck, color: 'from-accent-500 to-accent-700' },
          { label: 'Avg Rating', value: avgRating, sub: 'Fleet average', icon: Star, color: 'from-warning-500 to-warning-600' },
          { label: 'Total Trips', value: drivers.reduce((s, d) => s + d.trips_completed, 0), sub: 'All time', icon: TrendingUp, color: 'from-primary-600 to-primary-800' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm font-medium text-slate-700">{s.label}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers…" className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            {[{ key: 'all', label: 'All' }, { key: 'on_duty', label: 'On Duty' }, { key: 'available', label: 'Available' }, { key: 'off_duty', label: 'Off Duty' }].map((f) => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${filterStatus === f.key ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card h-64 shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d) => {
            const cfg = driverStatusConfig[d.status];
            const vehicle = d.vehicle_id ? vehicleMap.get(d.vehicle_id) : null;
            const isTop = d.id === topRated?.id;
            const isBest = d.id === mostTrips?.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="card card-hover p-5 text-left group relative"
              >
                {isTop && <span className="absolute top-3 right-3 text-[10px] font-bold bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full">Top Rated</span>}
                {!isTop && isBest && <span className="absolute top-3 right-3 text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Most Trips</span>}

                <div className="flex items-center gap-3 mb-4">
                  {d.avatar_url ? (
                    <div className="relative">
                      <img src={d.avatar_url} alt={d.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100" />
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                        {d.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{d.name}</p>
                    <StarRating rating={d.rating} />
                  </div>
                </div>

                <span className={`badge ${cfg.color} mb-3`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${d.status === 'on_duty' ? 'animate-pulse' : ''}`} />
                  {cfg.label}
                </span>

                <div className="space-y-2 mt-2">
                  {d.phone && <div className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400" />{d.phone}</div>}
                  {d.email && <div className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{d.email}</span></div>}
                  {vehicle && <div className="flex items-center gap-2 text-xs text-slate-600"><Truck className="w-3.5 h-3.5 text-slate-400" />{vehicle.name}</div>}
                  {d.license_no && <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3.5 h-3.5 text-slate-300" /><span className="font-mono">{d.license_no}</span></div>}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{d.trips_completed}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Trips</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{d.rating.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Rating</p>
                  </div>
                </div>

                {/* Performance bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Performance</span>
                    <span>{Math.min(100, Math.round((d.trips_completed / 450) * 100))}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((d.trips_completed / 450) * 100))}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No drivers found</p>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddDriverModal vehicles={vehicles} onClose={() => setShowAdd(false)} />}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto animate-slide-in-right shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Driver Profile</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="text-center pt-2">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt={selected.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 mx-auto mb-3" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                    {selected.name[0]}
                  </div>
                )}
                <h4 className="font-bold text-slate-900 text-lg">{selected.name}</h4>
                <span className={`badge ${driverStatusConfig[selected.status].color} mt-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${driverStatusConfig[selected.status].dot}`} />
                  {driverStatusConfig[selected.status].label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xl font-bold text-slate-900">{selected.trips_completed}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Trips</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xl font-bold text-warning-600">{selected.rating.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Rating</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xl font-bold text-primary-600">{Math.min(100, Math.round((selected.trips_completed / 450) * 100))}%</p>
                  <p className="text-[10px] text-slate-400 uppercase">Perf</p>
                </div>
              </div>

              <div className="space-y-3">
                {selected.phone && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Phone className="w-4 h-4 text-slate-400" /><div><p className="text-[10px] text-slate-400">Phone</p><p className="text-sm font-medium text-slate-800">{selected.phone}</p></div></div>}
                {selected.email && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Mail className="w-4 h-4 text-slate-400" /><div><p className="text-[10px] text-slate-400">Email</p><p className="text-sm font-medium text-slate-800">{selected.email}</p></div></div>}
                {selected.license_no && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Shield className="w-4 h-4 text-slate-400" /><div><p className="text-[10px] text-slate-400">License</p><p className="text-sm font-medium font-mono text-slate-800">{selected.license_no}</p></div></div>}
                {selected.vehicle_id && vehicleMap.get(selected.vehicle_id) && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400">Assigned Vehicle</p>
                      <p className="text-sm font-medium text-slate-800">{vehicleMap.get(selected.vehicle_id)?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{vehicleMap.get(selected.vehicle_id)?.plate}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                <p className="text-xs font-bold text-primary-700 mb-2">Performance Score</p>
                <div className="h-3 bg-primary-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((selected.trips_completed / 450) * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-primary-600 mt-1">{Math.min(100, Math.round((selected.trips_completed / 450) * 100))}% of benchmark (450 trips)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDriverModal({ vehicles, onClose }: { vehicles: Vehicle[]; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', license_no: '', vehicle_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('drivers').insert({
      name: form.name, phone: form.phone || null, email: form.email || null,
      license_no: form.license_no || null, vehicle_id: form.vehicle_id || null, status: 'available',
    });
    setSaving(false);
    if (err) setError(err.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-scale-in shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-bold text-slate-900 text-lg">Add New Driver</h3><p className="text-sm text-slate-500">Register a driver to the fleet</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Full Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Driver's full name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+91 XXXXX XXXXX" /></div>
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="email@domain.com" /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">License Number</label><input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} className="input font-mono" placeholder="DL-0420190001234" /></div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Assign Vehicle</label>
            <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="input">
              <option value="">Unassigned</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.plate}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Adding…' : 'Add Driver'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
