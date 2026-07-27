import { useEffect, useState } from 'react';
import {
  AlertTriangle, Bell, CheckCircle2, Fuel, Gauge,
  Wrench, MapPin, Search, Clock, X,
  AlertOctagon, Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle, Driver } from '../types';
import { formatTimeAgo } from '../lib/utils';

interface AlertRecord {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  vehicle_id: string | null;
  driver_id: string | null;
  shipment_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const severityConfig: Record<string, { color: string; dot: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'bg-danger-50 text-danger-700 border-danger-100', dot: 'bg-danger-500', icon: AlertOctagon },
  warning: { color: 'bg-warning-50 text-warning-700 border-warning-100', dot: 'bg-warning-500', icon: AlertTriangle },
  info: { color: 'bg-primary-50 text-primary-700 border-primary-100', dot: 'bg-primary-500', icon: Info },
};

const alertTypeConfig: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  low_fuel: { label: 'Low Fuel', icon: Fuel },
  maintenance_due: { label: 'Maintenance', icon: Wrench },
  speed_violation: { label: 'Speed Violation', icon: Gauge },
  geofence: { label: 'Geofence', icon: MapPin },
  delivery_failed: { label: 'Delivery Failed', icon: AlertTriangle },
  general: { label: 'General', icon: Bell },
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
    ]).then(([a, v, d]) => {
      setAlerts((a.data || []) as AlertRecord[]);
      setVehicles((v.data || []) as Vehicle[]);
      setDrivers((d.data || []) as Driver[]);
      setLoading(false);
    });
  }, []);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const filtered = alerts.filter((a) => {
    const q = search.toLowerCase();
    const v = a.vehicle_id ? vehicleMap.get(a.vehicle_id) : null;
    const d = a.driver_id ? driverMap.get(a.driver_id) : null;
    return (
      (filterSeverity === 'all' || a.severity === filterSeverity) &&
      (filterType === 'all' || a.type === filterType) &&
      (filterStatus === 'all' || (filterStatus === 'resolved') === a.resolved) &&
      (a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || v?.name.toLowerCase().includes(q) || d?.name.toLowerCase().includes(q))
    );
  });

  const unresolved = alerts.filter((a) => !a.resolved);
  const critical = unresolved.filter((a) => a.severity === 'critical').length;
  const warning = unresolved.filter((a) => a.severity === 'warning').length;
  const info = unresolved.filter((a) => a.severity === 'info').length;

  const resolveAlert = async (id: string) => {
    await supabase.from('alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a));
  };

  const dismissAlert = async (id: string) => {
    await supabase.from('alerts').delete().eq('id', id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Unresolved', value: unresolved.length, sub: 'Needs action', color: 'from-danger-500 to-danger-700', icon: AlertOctagon },
          { label: 'Critical', value: critical, sub: 'Urgent', color: 'from-danger-600 to-danger-800', icon: AlertTriangle },
          { label: 'Warning', value: warning, sub: 'Attention needed', color: 'from-warning-500 to-warning-700', icon: Bell },
          { label: 'Info', value: info, sub: 'FYI only', color: 'from-primary-500 to-primary-700', icon: Info },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="stat-card">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${k.color} flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="input max-w-[130px]">
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input max-w-[140px]">
            <option value="all">All Types</option>
            <option value="low_fuel">Low Fuel</option>
            <option value="maintenance_due">Maintenance</option>
            <option value="speed_violation">Speed</option>
            <option value="geofence">Geofence</option>
            <option value="delivery_failed">Delivery</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input max-w-[130px]">
            <option value="all">All Status</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-20 shimmer" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.info;
            const typeCfg = alertTypeConfig[alert.type] || alertTypeConfig.general;
            const Icon = typeCfg.icon;
            const v = alert.vehicle_id ? vehicleMap.get(alert.vehicle_id) : null;
            const d = alert.driver_id ? driverMap.get(alert.driver_id) : null;
            return (
              <div
                key={alert.id}
                className={`card p-4 flex items-start gap-4 transition-all ${alert.resolved ? 'opacity-60' : 'hover:shadow-md'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sev.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <span className={`badge ${sev.color} text-[10px]`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                      {alert.severity}
                    </span>
                    {alert.resolved && (
                      <span className="badge bg-accent-100 text-accent-700 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                    {v && <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{v.name}</span>}
                    {d && <span className="flex items-center gap-1">{d.name}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(alert.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="btn btn-sm btn-primary"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No alerts found</p>
              <p className="text-sm text-slate-400">All systems are clear</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
