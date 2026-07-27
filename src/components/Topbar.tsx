import { useState, useEffect } from 'react';
import {
  Menu, Bell, Search, ChevronDown, RefreshCw, Settings,
  AlertTriangle, CheckCircle2, Info, XCircle,
} from 'lucide-react';
import { useUIStore } from '../hooks/useUIStore';
import { supabase } from '../lib/supabase';

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard:   { title: 'Operations Dashboard',  subtitle: 'Real-time fleet overview · Updated just now' },
  'live-map':  { title: 'Live Tracking Map',      subtitle: 'GPS telemetry · All active vehicles' },
  fleet:       { title: 'Fleet Management',       subtitle: 'Vehicles, maintenance & availability' },
  shipments:   { title: 'Shipment Control',       subtitle: 'Active deliveries, tracking & dispatch' },
  drivers:     { title: 'Driver Management',      subtitle: 'Profiles, assignments & performance' },
  analytics:   { title: 'Analytics & Reports',    subtitle: 'KPIs, trends & business intelligence' },
};

interface Notif {
  id: string;
  type: 'warning' | 'success' | 'error' | 'info';
  message: string;
  time: string;
}

const notifStyle: Record<Notif['type'], { icon: typeof AlertTriangle; cls: string }> = {
  warning: { icon: AlertTriangle, cls: 'text-warning-600 bg-warning-50' },
  success: { icon: CheckCircle2, cls: 'text-accent-600 bg-accent-50' },
  error:   { icon: XCircle,      cls: 'text-danger-600 bg-danger-50' },
  info:    { icon: Info,         cls: 'text-primary-600 bg-primary-50' },
};

function timeLabel(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function Topbar() {
  const { currentPage, toggleSidebar } = useUIStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const meta = pageMeta[currentPage] ?? pageMeta.dashboard;

  // Build notifications from real data
  useEffect(() => {
    async function fetchAlerts() {
      const [vehicles, shipments] = await Promise.all([
        supabase.from('vehicles').select('id, name, fuel_level, status, last_seen'),
        supabase
          .from('shipments')
          .select('id, tracking_no, customer_name, status, updated_at')
          .in('status', ['failed', 'delivered'])
          .order('updated_at', { ascending: false })
          .limit(6),
      ]);

      const notifs: Notif[] = [];

      // Low-fuel alerts
      (vehicles.data || [])
        .filter((v) => v.fuel_level < 30 && v.status !== 'offline')
        .sort((a, b) => a.fuel_level - b.fuel_level)
        .slice(0, 3)
        .forEach((v) => {
          notifs.push({
            id: `fuel-${v.id}`,
            type: v.fuel_level < 15 ? 'error' : 'warning',
            message: `${v.name} — Fuel at ${v.fuel_level}%. Refuel required.`,
            time: timeLabel(v.last_seen),
          });
        });

      // Shipment events
      (shipments.data || []).slice(0, 4).forEach((s) => {
        notifs.push({
          id: `shp-${s.id}`,
          type: s.status === 'delivered' ? 'success' : 'error',
          message: s.status === 'delivered'
            ? `${s.tracking_no} delivered to ${s.customer_name}`
            : `${s.tracking_no} — Delivery failed. Follow-up needed.`,
          time: timeLabel(s.updated_at),
        });
      });

      // Sort: errors first, then warnings, then others
      const order: Notif['type'][] = ['error', 'warning', 'info', 'success'];
      notifs.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      setNotifications(notifs.slice(0, 8));
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => n.type === 'error' || n.type === 'warning').length;

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 leading-none">{meta.title}</h2>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5 hidden sm:block">{meta.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 w-72 border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all shadow-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vehicles, shipments, drivers…"
            className="bg-transparent text-sm outline-none flex-1 placeholder-slate-400 min-w-0"
          />
          <kbd className="hidden lg:inline-flex text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </div>

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors relative"
          >
            <Bell className="w-5 h-5" style={{ width: 18, height: 18 }} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-[340px] card shadow-card-lg z-40 animate-slide-down overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">Alerts & Notifications</p>
                  {unread > 0 && (
                    <span className="badge-sm bg-danger-100 text-danger-700">{unread} urgent</span>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">All clear — no alerts</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.map((n) => {
                      const { icon: Icon, cls } = notifStyle[n.type];
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] text-slate-400">Refreshes every 30 seconds · {notifications.length} total alerts</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <button className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
          <Settings className="w-4 h-4" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors group">
          <img
            src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=40"
            className="w-7 h-7 rounded-full object-cover border border-slate-200"
            alt="Admin"
          />
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">Admin</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </button>
      </div>
    </header>
  );
}
