import { useEffect, useState } from 'react';
import {
  Package, Plus, X, Search, MapPin, Clock, Weight,
  ChevronRight, ArrowRight,
  CheckCircle2, Truck, Timer, AlertTriangle, XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Shipment, DeliveryEvent, Vehicle, Driver } from '../types';
import { shipmentStatusConfig, priorityConfig, formatDateTime, formatTimeAgo } from '../lib/utils';

const STATUS_ORDER = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];

function ProgressBar({ status }: { status: string }) {
  const steps = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1 mt-2">
        <XCircle className="w-3.5 h-3.5 text-danger-500" />
        <span className="text-xs text-danger-600 font-medium">Delivery Failed</span>
      </div>
    );
  }
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? 'bg-accent-500' : 'bg-slate-200'}`} />
          {i === steps.length - 1 && (
            <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${idx === steps.length - 1 ? 'text-accent-500' : 'text-slate-300'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [view, setView] = useState<'table' | 'kanban'>('table');

  useEffect(() => {
    Promise.all([
      supabase.from('shipments').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
    ]).then(([s, v, d]) => {
      if (s.error) { setPageError(s.error.message); setLoading(false); return; }
      setShipments(s.data || []);
      setVehicles(v.data || []);
      setDrivers(d.data || []);
      setLoading(false);
    });
    const ch = supabase.channel('shipments-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, (p) => {
        if (p.eventType === 'INSERT') setShipments((prev) => [p.new as Shipment, ...prev]);
        else if (p.eventType === 'UPDATE') setShipments((prev) => prev.map((s) => s.id === p.new.id ? p.new as Shipment : s));
        else if (p.eventType === 'DELETE') setShipments((prev) => prev.filter((s) => s.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openDetail = async (s: Shipment) => {
    setSelected(s);
    const { data } = await supabase.from('delivery_events').select('*').eq('shipment_id', s.id).order('occurred_at', { ascending: false });
    setEvents(data || []);
  };

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return (filterStatus === 'all' || s.status === filterStatus) &&
      (filterPriority === 'all' || s.priority === filterPriority) &&
      (s.tracking_no.toLowerCase().includes(q) || s.customer_name.toLowerCase().includes(q) || s.origin_address.toLowerCase().includes(q) || s.destination_address.toLowerCase().includes(q));
  });

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_ORDER.map((key) => {
          const cfg = shipmentStatusConfig[key as keyof typeof shipmentStatusConfig];
          const count = shipments.filter((s) => s.status === key).length;
          const icons: Record<string, typeof Timer> = {
            pending: Timer, picked_up: Package, in_transit: Truck,
            out_for_delivery: MapPin, delivered: CheckCircle2, failed: XCircle,
          };
          const Icon = icons[key] || Package;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              className={`card card-hover p-4 text-left transition-all ${filterStatus === key ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${cfg.color.replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tracking no, customer, address…" className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input max-w-[130px]">
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="express">Express</option>
            <option value="standard">Standard</option>
          </select>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            {(['table', 'kanban'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3.5 py-2 text-xs font-semibold transition-colors ${view === v ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Shipment
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="card p-8 text-center">
          <p className="text-danger-600 font-semibold">Failed to load shipments</p>
          <p className="text-sm text-slate-500 mt-1">{pageError}</p>
        </div>
      ) : loading ? (
        <div className="card h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Tracking No</th><th>Customer</th><th className="hidden md:table-cell">Route</th>
                  <th>Status</th><th>Priority</th><th className="hidden lg:table-cell">Driver / Vehicle</th>
                  <th className="hidden lg:table-cell">ETA</th><th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const cfg = shipmentStatusConfig[s.status];
                  const driver = s.driver_id ? driverMap.get(s.driver_id) : null;
                  const vehicle = s.vehicle_id ? vehicleMap.get(s.vehicle_id) : null;
                  return (
                    <tr key={s.id} onClick={() => openDetail(s)} className="cursor-pointer">
                      <td>
                        <span className="font-mono text-sm font-bold text-primary-600">{s.tracking_no}</span>
                        <ProgressBar status={s.status} />
                      </td>
                      <td>
                        <p className="text-sm font-semibold text-slate-900">{s.customer_name}</p>
                        <p className="text-xs text-slate-400">{s.customer_phone}</p>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[200px]">
                          <span className="truncate">{s.origin_address.split(',')[0]}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate">{s.destination_address.split(',')[0]}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${priorityConfig[s.priority].color}`}>
                          {s.priority === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                          {priorityConfig[s.priority].label}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="text-xs space-y-0.5">
                          {driver && <p className="font-medium text-slate-700">{driver.name}</p>}
                          {vehicle && <p className="text-slate-400">{vehicle.name}</p>}
                          {!driver && !vehicle && <span className="text-slate-400">Unassigned</span>}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-xs text-slate-500">{formatDateTime(s.estimated_delivery)}</span>
                      </td>
                      <td><ChevronRight className="w-4 h-4 text-slate-400" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No shipments found</p>
              <p className="text-sm text-slate-400">Adjust your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        // Kanban view
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed'].map((status) => {
              const cfg = shipmentStatusConfig[status as keyof typeof shipmentStatusConfig];
              const cols = filtered.filter((s) => s.status === status);
              return (
                <div key={status} className="w-72 flex-shrink-0">
                  <div className={`flex items-center justify-between mb-3 px-1`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-sm font-bold text-slate-700">{cfg.label}</span>
                    </div>
                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">{cols.length}</span>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {cols.map((s) => (
                      <button key={s.id} onClick={() => openDetail(s)} className="w-full text-left card card-hover p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-primary-600">{s.tracking_no}</span>
                          <span className={`badge ${priorityConfig[s.priority].color} text-[10px]`}>{priorityConfig[s.priority].label}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 mb-1">{s.customer_name}</p>
                        <div className="flex items-start gap-1 text-xs text-slate-400">
                          <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{s.destination_address}</span>
                        </div>
                        {s.estimated_delivery && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            ETA: {formatDateTime(s.estimated_delivery)}
                          </div>
                        )}
                      </button>
                    ))}
                    {cols.length === 0 && (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Package className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <p className="text-xs">No shipments</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <AddShipmentModal vehicles={vehicles} drivers={drivers} onClose={() => setShowAdd(false)} />}
      {selected && <ShipmentDetailDrawer shipment={selected} events={events} driverMap={driverMap} vehicleMap={vehicleMap} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ShipmentDetailDrawer({ shipment, events, driverMap, vehicleMap, onClose }: {
  shipment: Shipment; events: DeliveryEvent[];
  driverMap: Map<string, Driver>; vehicleMap: Map<string, Vehicle>;
  onClose: () => void;
}) {
  const cfg = shipmentStatusConfig[shipment.status];
  const driver = shipment.driver_id ? driverMap.get(shipment.driver_id) : null;
  const vehicle = shipment.vehicle_id ? vehicleMap.get(shipment.vehicle_id) : null;

  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    const { error: updateErr } = await supabase
      .from('shipments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', shipment.id);
    if (!updateErr) {
      const eventMessages: Record<string, { event_type: string; description: string }> = {
        in_transit:        { event_type: 'picked_up',       description: 'Package picked up — now in transit' },
        out_for_delivery:  { event_type: 'out_for_delivery', description: 'Package out for final delivery' },
        delivered:         { event_type: 'delivered',        description: 'Package delivered successfully' },
        failed:            { event_type: 'failed',           description: 'Delivery failed — follow-up required' },
      };
      const evt = eventMessages[status];
      if (evt) {
        await supabase.from('delivery_events').insert({
          shipment_id: shipment.id,
          event_type: evt.event_type,
          description: evt.description,
          location: status === 'delivered' ? shipment.destination_address : undefined,
        });
      }
    }
    setUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[420px] bg-white h-full overflow-y-auto animate-slide-in-right shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-slate-900">Shipment Details</h3>
            <p className="text-xs font-mono text-primary-600">{shipment.tracking_no}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Status + Priority */}
          <div className="flex items-center gap-2">
            <span className={`badge ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
            <span className={`badge ${priorityConfig[shipment.priority].color}`}>
              {shipment.priority === 'urgent' && <AlertTriangle className="w-3 h-3" />}
              {priorityConfig[shipment.priority].label}
            </span>
          </div>
          {/* Progress */}
          <div className="card p-4">
            <ProgressBar status={shipment.status} />
          </div>
          {/* Customer */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Customer</p>
            <p className="text-sm font-bold text-slate-900">{shipment.customer_name}</p>
            {shipment.customer_phone && <p className="text-xs text-slate-500 mt-0.5">{shipment.customer_phone}</p>}
          </div>
          {/* Route */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-primary-50/50 rounded-xl border border-primary-100">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="w-3.5 h-3.5 text-primary-600" /></div>
              <div><p className="text-[10px] text-slate-400 font-bold uppercase">Origin</p><p className="text-sm font-medium text-slate-900">{shipment.origin_address}</p></div>
            </div>
            <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-slate-400" /></div>
            <div className="flex items-start gap-3 p-3 bg-accent-50/50 rounded-xl border border-accent-100">
              <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="w-3.5 h-3.5 text-accent-600" /></div>
              <div><p className="text-[10px] text-slate-400 font-bold uppercase">Destination</p><p className="text-sm font-medium text-slate-900">{shipment.destination_address}</p></div>
            </div>
          </div>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Weight', value: shipment.weight_kg ? `${shipment.weight_kg} kg` : '—', icon: Weight },
              { label: 'ETA', value: formatDateTime(shipment.estimated_delivery), icon: Clock },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Icon className="w-3.5 h-3.5" />{d.label}</div>
                  <p className="text-sm font-bold text-slate-900">{d.value}</p>
                </div>
              );
            })}
          </div>
          {/* Assigned team */}
          {(driver || vehicle) && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Assigned Team</p>
              {driver && (
                <div className="flex items-center gap-2 mb-2">
                  {driver.avatar_url ? <img src={driver.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={driver.name} /> : <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">{driver.name[0]}</div>}
                  <div><p className="text-sm font-semibold text-slate-800">{driver.name}</p><p className="text-xs text-slate-400">Driver</p></div>
                </div>
              )}
              {vehicle && <p className="text-xs text-slate-600">Vehicle: <span className="font-semibold">{vehicle.name}</span> · {vehicle.plate}</p>}
            </div>
          )}
          {shipment.notes && (
            <div className="p-3 bg-warning-50 border border-warning-100 rounded-xl">
              <p className="text-xs font-bold text-warning-700 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{shipment.notes}</p>
            </div>
          )}
          {/* Update status */}
          {!['delivered', 'failed'].includes(shipment.status) && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {[{ s: 'in_transit', label: 'Mark In Transit' }, { s: 'out_for_delivery', label: 'Out for Delivery' }, { s: 'delivered', label: 'Mark Delivered' }, { s: 'failed', label: 'Mark Failed' }]
                  .filter((b) => b.s !== shipment.status)
                  .map((b) => (
                    <button key={b.s} onClick={() => updateStatus(b.s)} disabled={updating} className={`btn btn-sm ${b.s === 'delivered' ? 'btn-primary' : b.s === 'failed' ? 'btn-danger' : 'btn-secondary'}`}>
                      {b.label}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {/* Timeline */}
          <div>
            <p className="text-sm font-bold text-slate-900 mb-3">Tracking Timeline</p>
            <div className="space-y-3">
              {events.map((e, i) => (
                <div key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i === 0 ? 'bg-primary-500' : 'bg-slate-300'} mt-0.5`} />
                    {i < events.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm font-medium text-slate-900">{e.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{formatTimeAgo(e.occurred_at)}</span>
                      {e.location && <span className="text-[11px] text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-slate-400">No events recorded yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddShipmentModal({ vehicles, drivers, onClose }: { vehicles: Vehicle[]; drivers: Driver[]; onClose: () => void }) {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', origin_address: '', destination_address: '',
    priority: 'standard', vehicle_id: '', driver_id: '', weight_kg: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.customer_name.trim() || !form.origin_address.trim() || !form.destination_address.trim()) {
      setError('Customer name, origin and destination are required');
      return;
    }
    setSaving(true); setError('');
    const { data, error: err } = await supabase.from('shipments').insert({
      customer_name: form.customer_name, customer_phone: form.customer_phone || null,
      origin_address: form.origin_address,
      origin_lat: 28.6139 + (Math.random() - 0.5) * 8, origin_lng: 77.209 + (Math.random() - 0.5) * 8,
      destination_address: form.destination_address,
      destination_lat: 19.076 + (Math.random() - 0.5) * 8, destination_lng: 72.8777 + (Math.random() - 0.5) * 8,
      priority: form.priority, vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      notes: form.notes || null,
      estimated_delivery: new Date(Date.now() + 6 * 3600_000).toISOString(),
    }).select().single();
    if (!err && data) {
      await supabase.from('delivery_events').insert({ shipment_id: data.id, event_type: 'created', description: `Shipment created for ${form.customer_name}`, location: form.origin_address });
    }
    setSaving(false);
    if (err) setError(err.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-bold text-slate-900 text-lg">New Shipment</h3><p className="text-sm text-slate-500">Create a new delivery order</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Customer Name *</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input" placeholder="Customer name" /></div>
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Phone</label><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input" placeholder="+91 XXXXX XXXXX" /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Origin Address *</label><input value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} className="input" placeholder="Pickup location" /></div>
          <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Destination Address *</label><input value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} className="input" placeholder="Delivery location" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                <option value="standard">Standard</option><option value="express">Express</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Weight (kg)</label><input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="input" placeholder="0.0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Assign Vehicle</label>
              <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="input">
                <option value="">Unassigned</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Assign Driver</label>
              <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="input">
                <option value="">Unassigned</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Special Instructions</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[70px] resize-none" placeholder="Any special handling or delivery instructions…" /></div>
          {error && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating…' : 'Create Shipment'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
