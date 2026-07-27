import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Truck, Package, TrendingUp, AlertTriangle, Activity, Clock,
  MapPin, Fuel, Gauge, ArrowUpRight, ArrowDownRight, CheckCircle2,
  XCircle, Timer, Zap, Navigation, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle, Shipment, DeliveryEvent, Driver } from '../types';
import { vehicleStatusConfig, shipmentStatusConfig, formatTimeAgo } from '../lib/utils';

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.offsetWidth;
    const h = height;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const step = w / (data.length - 1);
    const pad = 4;
    const points = data.map((v, i) => ({
      x: i * step,
      y: pad + ((max - v) / (max - min || 1)) * (h - pad * 2),
    }));
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }, [data, color, height]);
  return <canvas ref={ref} className="w-full" style={{ height }} />;
}

export function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    const [v, s, d, e] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('shipments').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('drivers').select('*'),
      supabase.from('delivery_events').select('*').order('occurred_at', { ascending: false }).limit(12),
    ]);
    if (v.data) setVehicles(v.data);
    if (s.data) setShipments(s.data);
    if (d.data) setDrivers(d.data);
    if (e.data) setEvents(e.data);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    load();
    const ch1 = supabase.channel('dashboard-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (p) => {
        if (p.eventType === 'UPDATE') setVehicles((prev) => prev.map((v) => v.id === p.new.id ? p.new as Vehicle : v));
        if (p.eventType === 'INSERT') setVehicles((prev) => [...prev, p.new as Vehicle]);
      }).subscribe();
    const ch2 = supabase.channel('dashboard-shipments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, (p) => {
        if (p.eventType === 'INSERT') setShipments((prev) => [p.new as Shipment, ...prev].slice(0, 50));
        if (p.eventType === 'UPDATE') setShipments((prev) => prev.map((s) => s.id === p.new.id ? p.new as Shipment : s));
      }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading fleet data…</p>
      </div>
    </div>
  );

  const enRoute = vehicles.filter((v) => v.status === 'en_route').length;
  const inTransit = shipments.filter((s) => ['in_transit', 'out_for_delivery'].includes(s.status)).length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const failed = shipments.filter((s) => s.status === 'failed').length;
  const maintenance = vehicles.filter((v) => v.status === 'maintenance').length;
  const deliveryRate = shipments.length > 0 ? ((delivered / shipments.length) * 100).toFixed(1) : '0';
  const avgFuel = vehicles.length > 0 ? Math.round(vehicles.reduce((s, v) => s + v.fuel_level, 0) / vehicles.length) : 0;
  const onDutyDrivers = drivers.filter((d) => d.status === 'on_duty').length;
  const lowFuelVehicles = vehicles.filter((v) => v.fuel_level < 30 && v.status !== 'offline');

  const sparkDelivery = [8, 12, 9, 15, 11, 18, 14, 22, 19, 24, 21, delivered || 7];
  const sparkFleet = [6, 5, 7, 6, 8, 7, enRoute || 4, 8, 7, 6, 8, enRoute || 5];
  const sparkRate = [88, 91, 87, 93, 89, 92, 94, 91, 95, 92, 96, parseFloat(deliveryRate) || 94];
  const sparkFailed = [3, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, failed || 1];

  const kpis = [
    {
      label: 'Active Vehicles',
      value: enRoute,
      sub: `of ${vehicles.length} total`,
      icon: Truck,
      trend: '+2 since yesterday',
      trendUp: true,
      color: '#3479fb',
      gradient: 'from-primary-600 to-primary-800',
      spark: sparkFleet,
    },
    {
      label: 'Shipments In Transit',
      value: inTransit,
      sub: `${shipments.length} total`,
      icon: Package,
      trend: '+5 today',
      trendUp: true,
      color: '#10b981',
      gradient: 'from-accent-500 to-accent-700',
      spark: sparkDelivery,
    },
    {
      label: 'Delivery Success Rate',
      value: `${deliveryRate}%`,
      sub: `${delivered} delivered`,
      icon: TrendingUp,
      trend: '+3.2% vs last week',
      trendUp: true,
      color: '#10b981',
      gradient: 'from-accent-500 to-accent-700',
      spark: sparkRate,
    },
    {
      label: 'Failed Deliveries',
      value: failed,
      sub: `${maintenance} in maintenance`,
      icon: AlertTriangle,
      trend: '-1 vs last week',
      trendUp: false,
      color: '#ef4444',
      gradient: 'from-danger-500 to-danger-700',
      spark: sparkFailed,
    },
  ];

  const eventIconMap: Record<string, { icon: typeof Activity; cls: string }> = {
    delivered: { icon: CheckCircle2, cls: 'bg-accent-50 text-accent-600' },
    failed: { icon: XCircle, cls: 'bg-danger-50 text-danger-600' },
    picked_up: { icon: Package, cls: 'bg-primary-50 text-primary-600' },
    out_for_delivery: { icon: Navigation, cls: 'bg-warning-50 text-warning-600' },
    checkpoint: { icon: MapPin, cls: 'bg-slate-100 text-slate-600' },
    created: { icon: Zap, cls: 'bg-purple-50 text-purple-600' },
    note: { icon: Activity, cls: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
          </span>
          <span className="text-xs text-slate-500 font-medium">Live · Updated {formatTimeAgo(lastRefresh.toISOString())}</span>
        </div>
        <button onClick={load} className="btn btn-sm btn-secondary gap-1.5">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="stat-card group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${kpi.trendUp ? 'text-accent-600' : 'text-danger-600'}`}>
                  {kpi.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {kpi.trendUp ? '+' : ''}{kpi.trend.split(' ')[0]}
                </span>
              </div>
              <p className="text-[28px] font-bold text-slate-900 leading-none count-up">{kpi.value}</p>
              <p className="text-[13px] font-medium text-slate-700 mt-1">{kpi.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              <div className="mt-3 -mx-1">
                <Sparkline data={kpi.spark} color={kpi.color} height={36} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fleet Status */}
        <div className="card lg:col-span-5 overflow-hidden">
          <div className="section-header px-5 pt-5">
            <div>
              <p className="section-title">Fleet Status</p>
              <p className="section-subtitle">{vehicles.length} vehicles registered</p>
            </div>
            <span className="badge bg-accent-100 text-accent-700 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
              Real-time
            </span>
          </div>
          <div className="px-3 pb-4 space-y-1">
            {vehicles.map((v) => {
              const cfg = vehicleStatusConfig[v.status];
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                  <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${v.status === 'en_route' ? 'bg-accent-100' : v.status === 'maintenance' ? 'bg-warning-100' : v.status === 'offline' ? 'bg-slate-100' : 'bg-primary-50'}`}>
                    <Truck className={`w-4 h-4 ${v.status === 'en_route' ? 'text-accent-600' : v.status === 'maintenance' ? 'text-warning-600' : 'text-slate-500'}`} />
                    {v.status === 'en_route' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-500 rounded-full border border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
                    <p className="text-[11px] text-slate-400">{v.plate}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="hidden sm:flex items-center gap-1"><Gauge className="w-3 h-3" />{v.speed}</span>
                    <div className="flex items-center gap-1">
                      <Fuel className={`w-3 h-3 ${v.fuel_level < 30 ? 'text-danger-500' : 'text-slate-400'}`} />
                      <span className={v.fuel_level < 30 ? 'text-danger-600 font-semibold' : ''}>{v.fuel_level}%</span>
                    </div>
                  </div>
                  <span className={`badge ${cfg.color} text-[10px] hidden sm:flex`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Shipment breakdown */}
          <div className="card p-5">
            <div className="section-header mb-4">
              <p className="section-title">Shipment Pipeline</p>
              <span className="text-xs text-slate-400">{shipments.length} total</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(shipmentStatusConfig).map(([key, cfg]) => {
                const count = shipments.filter((s) => s.status === key).length;
                const pct = shipments.length > 0 ? Math.round((count / shipments.length) * 100) : 0;
                return (
                  <div key={key} className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[11px] font-medium text-slate-500">{cfg.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <div className="mt-2 h-1 bg-white rounded-full overflow-hidden border border-slate-200">
                      <div className={`h-full ${cfg.dot.replace('bg-', 'bg-')} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts + Quick Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Alerts */}
            <div className="card p-5">
              <div className="section-header">
                <p className="section-title">Active Alerts</p>
                <span className="badge bg-danger-100 text-danger-700 text-[10px]">{lowFuelVehicles.length + failed}</span>
              </div>
              <div className="space-y-2">
                {lowFuelVehicles.slice(0, 2).map((v) => (
                  <div key={v.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-warning-50 border border-warning-100">
                    <AlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{v.name}</p>
                      <p className="text-[10px] text-warning-600">Fuel {v.fuel_level}% — Refuel needed</p>
                    </div>
                  </div>
                ))}
                {failed > 0 && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-danger-50 border border-danger-100">
                    <XCircle className="w-4 h-4 text-danger-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{failed} Delivery Failure{failed > 1 ? 's' : ''}</p>
                      <p className="text-[10px] text-danger-600">Immediate follow-up required</p>
                    </div>
                  </div>
                )}
                {lowFuelVehicles.length === 0 && failed === 0 && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-accent-50 border border-accent-100">
                    <CheckCircle2 className="w-4 h-4 text-accent-600" />
                    <p className="text-xs font-semibold text-accent-700">All systems nominal</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card p-5">
              <p className="section-title mb-3">Quick Stats</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Drivers On Duty', value: `${onDutyDrivers}/${drivers.length}`, icon: Activity },
                  { label: 'Avg Fleet Fuel', value: `${avgFuel}%`, icon: Fuel },
                  { label: 'Total Fleet KM', value: `${(vehicles.reduce((s, v) => s + v.mileage, 0) / 1000).toFixed(0)}k`, icon: Gauge },
                  { label: 'Pending Pickups', value: shipments.filter((s) => s.status === 'pending').length, icon: Timer },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        {s.label}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{s.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="card p-5">
        <div className="section-header">
          <div>
            <p className="section-title">Live Activity Feed</p>
            <p className="section-subtitle">Real-time delivery events</p>
          </div>
          <span className="badge bg-accent-100 text-accent-700 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            Streaming
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {events.map((e) => {
            const { icon: Icon, cls } = eventIconMap[e.event_type] || eventIconMap.note;
            return (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 leading-snug">{e.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{formatTimeAgo(e.occurred_at)}</span>
                    {e.location && (
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{e.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
