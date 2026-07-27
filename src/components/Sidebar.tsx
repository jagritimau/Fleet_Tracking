import {
  LayoutDashboard,
  Truck,
  Package,
  Users,
  BarChart3,
  Map,
  Radar,
  X,
  ChevronRight,
  Activity,
  Zap,
  Route,
  Bell,
  Settings,
} from 'lucide-react';
import { useUIStore, type PageId } from '../hooks/useUIStore';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { id: 'live-map' as PageId, label: 'Live Map', icon: Map, badge: 'LIVE' },
      { id: 'alerts' as PageId, label: 'Alerts', icon: Bell, badge: null },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'fleet' as PageId, label: 'Fleet', icon: Truck, badge: null },
      { id: 'shipments' as PageId, label: 'Shipments', icon: Package, badge: null },
      { id: 'drivers' as PageId, label: 'Drivers', icon: Users, badge: null },
      { id: 'routes' as PageId, label: 'Routes', icon: Route, badge: null },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'analytics' as PageId, label: 'Analytics', icon: BarChart3, badge: null },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings' as PageId, label: 'Settings', icon: Settings, badge: null },
    ],
  },
];

export function Sidebar() {
  const { currentPage, setPage, sidebarOpen, setSidebar } = useUIStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-slate-950 z-40 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { setPage('home'); setSidebar(false); }}
            className="flex items-center gap-3 group"
            title="Back to home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary transition-transform group-hover:scale-105">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-white font-bold text-[15px] leading-none tracking-tight group-hover:text-primary-300 transition-colors">FleetOps</h1>
              <p className="text-slate-500 text-[10px] leading-tight mt-0.5 tracking-widest uppercase">Intelligence Platform</p>
            </div>
          </button>
          <button
            onClick={() => setSidebar(false)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setPage(item.id); setSidebar(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                        active
                          ? 'bg-primary-600/20 text-primary-400'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-full" />
                      )}
                      <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`} style={{ width: '18px', height: '18px' }} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3.5 h-3.5 text-primary-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* System status footer */}
        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-3 py-3 rounded-xl bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                </span>
                <span className="text-xs font-semibold text-slate-300">All Systems Operational</span>
              </div>
              <Activity className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[['DB', '12ms'], ['API', '45ms'], ['RT', '8ms']].map(([label, val]) => (
                <div key={label} className="bg-black/20 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-bold text-accent-400 mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5 mt-3 px-1">
            <img
              src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=40"
              className="w-8 h-8 rounded-full object-cover border border-white/10"
              alt="Admin"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">Fleet Admin</p>
              <p className="text-[10px] text-slate-500 truncate">admin@fleetops.io</p>
            </div>
            <Zap className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
