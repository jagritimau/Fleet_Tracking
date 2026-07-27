import { useEffect, useState } from 'react';
import {
  Radar, LayoutDashboard, Map, Truck, Package, Users, BarChart3,
  Route, Bell, Settings, ArrowRight, Activity, Zap, ShieldCheck,
  TrendingUp, Clock, ChevronRight, Sparkles, Globe,
} from 'lucide-react';
import { useUIStore, type PageId } from '../hooks/useUIStore';
import { supabase } from '../lib/supabase';

interface ModuleCard {
  id: PageId;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  gradient: string;
  glow: string;
  accent: string;
}

const modules: ModuleCard[] = [
  {
    id: 'dashboard',
    label: 'Operations Dashboard',
    description: 'Real-time fleet overview with live KPIs, activity feed and instant alerts.',
    icon: LayoutDashboard,
    gradient: 'from-primary-600 to-primary-800',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-primary-600',
  },
  {
    id: 'live-map',
    label: 'Live Tracking Map',
    description: 'GPS telemetry for every active vehicle, updating in real time.',
    icon: Map,
    gradient: 'from-emerald-500 to-emerald-700',
    glow: 'group-hover:shadow-glow-accent',
    accent: 'text-accent-600',
  },
  {
    id: 'fleet',
    label: 'Fleet Management',
    description: 'Vehicles, maintenance schedules and availability in one place.',
    icon: Truck,
    gradient: 'from-blue-500 to-blue-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-primary-600',
  },
  {
    id: 'shipments',
    label: 'Shipment Control',
    description: 'Active deliveries, tracking numbers and dispatch operations.',
    icon: Package,
    gradient: 'from-amber-500 to-amber-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-warning-600',
  },
  {
    id: 'drivers',
    label: 'Driver Management',
    description: 'Profiles, assignments and performance metrics for your team.',
    icon: Users,
    gradient: 'from-rose-500 to-rose-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-danger-600',
  },
  {
    id: 'routes',
    label: 'Route Planning',
    description: 'Optimised routes, ETAs and stop-by-stop sequencing.',
    icon: Route,
    gradient: 'from-cyan-500 to-cyan-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-primary-600',
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    description: 'KPIs, trends and business intelligence across the fleet.',
    icon: BarChart3,
    gradient: 'from-violet-500 to-violet-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-primary-600',
  },
  {
    id: 'alerts',
    label: 'Alerts Centre',
    description: 'Fuel warnings, delivery failures and system notifications.',
    icon: Bell,
    gradient: 'from-red-500 to-red-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-danger-600',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Preferences, organisation config and platform controls.',
    icon: Settings,
    gradient: 'from-slate-500 to-slate-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'text-slate-600',
  },
];

export function HomePage() {
  const { setPage } = useUIStore();
  const [stats, setStats] = useState({ vehicles: 0, shipments: 0, drivers: 0, enRoute: 0 });
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    async function load() {
      const [v, s, d] = await Promise.all([
        supabase.from('vehicles').select('id, status'),
        supabase.from('shipments').select('id'),
        supabase.from('drivers').select('id'),
      ]);
      setStats({
        vehicles: v.data?.length ?? 0,
        shipments: s.data?.length ?? 0,
        drivers: d.data?.length ?? 0,
        enRoute: v.data?.filter((x) => x.status === 'en_route').length ?? 0,
      });
    }
    load();
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const heroStats = [
    { label: 'Vehicles', value: stats.vehicles, icon: Truck },
    { label: 'Active Now', value: stats.enRoute, icon: Activity },
    { label: 'Shipments', value: stats.shipments, icon: Package },
    { label: 'Drivers', value: stats.drivers, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Nav bar */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 h-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-primary">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">FleetOps</h1>
            <p className="text-slate-500 text-[10px] leading-tight mt-0.5 tracking-widest uppercase">Intelligence Platform</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
          </span>
          <span className="text-xs font-medium text-slate-300">All systems operational</span>
        </div>

        <button
          onClick={() => setPage('dashboard')}
          className="btn btn-primary gap-2 group"
        >
          Launch Dashboard
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-16 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-slate-300 tracking-wide">Next-gen fleet intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Command your entire fleet
            <span className="block bg-gradient-to-r from-primary-400 via-primary-300 to-accent-400 bg-clip-text text-transparent">
              from a single cockpit
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
            Real-time tracking, shipment control, driver management and analytics —
            unified in one elegant platform built for modern logistics operations.
          </p>

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={() => setPage('dashboard')}
              className="btn btn-primary gap-2 group text-sm px-5 py-3"
            >
              <Zap className="w-4 h-4" />
              Enter Platform
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => setPage('live-map')}
              className="btn gap-2 text-sm px-5 py-3 bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Globe className="w-4 h-4" />
              View Live Map
            </button>
          </div>

          {/* Hero stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 w-full max-w-3xl">
            {heroStats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 backdrop-blur-sm animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary-400" />
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Platform Modules</h2>
            <p className="text-slate-400 text-sm mt-1">Choose a workspace to open</p>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setPage(m.id)}
                className="group relative text-left rounded-2xl bg-white/[0.03] border border-white/10 p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1 animate-slide-up overflow-hidden"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">{m.label}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{m.description}</p>
                <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${m.gradient} transition-all duration-300 w-0 group-hover:w-full`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: 'Secure & Reliable', desc: 'Row-level security on every record with real-time sync.' },
            { icon: Activity, title: 'Live Telemetry', desc: 'Sub-second GPS updates streamed straight to your dashboard.' },
            { icon: TrendingUp, title: 'Actionable Insights', desc: 'Analytics that turn raw fleet data into decisions.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 lg:px-10 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Radar className="w-4 h-4 text-primary-500" />
            <span>FleetOps Intelligence Platform</span>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} FleetOps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
