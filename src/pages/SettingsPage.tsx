import { useState, useEffect } from 'react';
import {
  Moon, Sun, Bell, Database,
  Palette, Monitor, AlertTriangle,
  ChevronRight, Trash2, Download,
  Activity, Server, Wifi, Clock, Gauge,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  notifications: boolean;
  refreshInterval: number;
  showFuelAlerts: boolean;
  showSpeedAlerts: boolean;
  showMaintenanceAlerts: boolean;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'comfortable' | 'spacious';
}

const defaultSettings: Settings = {
  theme: 'light',
  sidebarCollapsed: false,
  notifications: true,
  refreshInterval: 30,
  showFuelAlerts: true,
  showSpeedAlerts: true,
  showMaintenanceAlerts: true,
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  density: 'comfortable',
};

function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('fleetops-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('fleetops-settings', JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}

export function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('appearance');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [dbLatency, setDbLatency] = useState(0);

  useEffect(() => {
    const ping = async () => {
      const start = performance.now();
      const { error } = await supabase.from('vehicles').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      setDbLatency(latency);
      setDbStatus(error ? 'error' : 'connected');
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'system', label: 'System', icon: Server },
  ];

  const resetSettings = () => {
    setSettings(defaultSettings);
    setShowResetConfirm(false);
  };

  const exportData = async () => {
    const tables = ['vehicles', 'drivers', 'shipments', 'delivery_events', 'routes', 'alerts'];
    const data: Record<string, unknown[]> = {};
    for (const table of tables) {
      const { data: rows } = await supabase.from(table).select('*').limit(100);
      data[table] = rows || [];
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleetops-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in max-w-[1200px]">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your FleetOps preferences and system configuration</p>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Appearance */}
          {activeTab === 'appearance' && (
            <>
              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
                    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                    { id: 'system', label: 'System', icon: Monitor, desc: 'Follows OS preference' },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSettings({ ...settings, theme: t.id as Settings['theme'] })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          settings.theme === t.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${settings.theme === t.id ? 'text-primary-600' : 'text-slate-400'}`} />
                        <p className="font-semibold text-slate-900 text-sm">{t.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">Layout</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Sidebar Collapsed</p>
                      <p className="text-xs text-slate-500">Start with collapsed sidebar on desktop</p>
                    </div>
                    <ToggleSwitch
                      checked={settings.sidebarCollapsed}
                      onChange={(v) => setSettings({ ...settings, sidebarCollapsed: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Content Density</p>
                      <p className="text-xs text-slate-500">Adjust spacing between elements</p>
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setSettings({ ...settings, density: d })}
                          className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                            settings.density === d ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Date Format</p>
                      <p className="text-xs text-slate-500">How dates are displayed</p>
                    </div>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                      className="input max-w-[160px]"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Time Format</p>
                      <p className="text-xs text-slate-500">12-hour or 24-hour clock</p>
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      {(['12h', '24h'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setSettings({ ...settings, timeFormat: t })}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                            settings.timeFormat === t ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-5">Alert Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Push Notifications</p>
                    <p className="text-xs text-slate-500">Show alerts in the notification bell</p>
                  </div>
                  <ToggleSwitch checked={settings.notifications} onChange={(v) => setSettings({ ...settings, notifications: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Auto-refresh Interval</p>
                    <p className="text-xs text-slate-500">How often data refreshes automatically</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={settings.refreshInterval}
                      onChange={(e) => setSettings({ ...settings, refreshInterval: Math.max(5, Math.min(300, parseInt(e.target.value) || 30)) })}
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-slate-500">seconds</span>
                  </div>
                </div>
                <div className="h-px bg-slate-100 my-4" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Alert Types</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                      <Gauge className="w-4 h-4 text-warning-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Fuel Alerts</p>
                      <p className="text-xs text-slate-500">Low fuel warnings</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.showFuelAlerts} onChange={(v) => setSettings({ ...settings, showFuelAlerts: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-danger-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Speed Violations</p>
                      <p className="text-xs text-slate-500">Over-speeding alerts</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.showSpeedAlerts} onChange={(v) => setSettings({ ...settings, showSpeedAlerts: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Maintenance Alerts</p>
                      <p className="text-xs text-slate-500">Service due reminders</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.showMaintenanceAlerts} onChange={(v) => setSettings({ ...settings, showMaintenanceAlerts: v })} />
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy */}
          {activeTab === 'data' && (
            <>
              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">Data Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <Download className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Export All Data</p>
                        <p className="text-xs text-slate-500">Download a JSON backup of all tables</p>
                      </div>
                    </div>
                    <button onClick={exportData} className="btn btn-primary">
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-danger-50 rounded-xl border border-danger-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-danger-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-danger-700">Reset All Settings</p>
                        <p className="text-xs text-danger-500">Restore all preferences to default</p>
                      </div>
                    </div>
                    <button onClick={() => setShowResetConfirm(true)} className="btn btn-danger">
                      <Trash2 className="w-4 h-4" /> Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">Privacy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Local Storage</p>
                      <p className="text-xs text-slate-500">Settings are stored in your browser</p>
                    </div>
                    <span className="badge bg-accent-100 text-accent-700 text-[10px]">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Supabase Connection</p>
                      <p className="text-xs text-slate-500">Data is synced to cloud database</p>
                    </div>
                    <span className="badge bg-accent-100 text-accent-700 text-[10px]">Connected</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* System */}
          {activeTab === 'system' && (
            <>
              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">System Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-primary-500" />
                      <span className="text-xs text-slate-500">Database</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-accent-500' : dbStatus === 'error' ? 'bg-danger-500' : 'bg-warning-500'}`} />
                      <span className="text-sm font-bold text-slate-900">{dbStatus === 'connected' ? 'Connected' : dbStatus === 'error' ? 'Error' : 'Checking'}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{dbLatency}ms latency</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-primary-500" />
                      <span className="text-xs text-slate-500">Realtime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent-500" />
                      <span className="text-sm font-bold text-slate-900">Live</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">WebSocket active</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary-500" />
                      <span className="text-xs text-slate-500">Version</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">v1.0.0</span>
                    <p className="text-xs text-slate-400 mt-1">FleetOps Platform</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5">About FleetOps</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>FleetOps is a real-time logistics and fleet intelligence platform built for modern fleet operations.</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><span className="text-slate-400">Frontend:</span> <span className="font-semibold text-slate-700">React 18 + Vite + TypeScript + Tailwind CSS</span></div>
                    <div><span className="text-slate-400">Backend:</span> <span className="font-semibold text-slate-700">Supabase (PostgreSQL + Realtime)</span></div>
                    <div><span className="text-slate-400">Icons:</span> <span className="font-semibold text-slate-700">Lucide React</span></div>
                    <div><span className="text-slate-400">Charts:</span> <span className="font-semibold text-slate-700">Custom Canvas</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}>
          <div className="card p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reset Settings?</h3>
                <p className="text-sm text-slate-500">This will restore all preferences to default.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={resetSettings} className="btn-danger flex-1">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}
