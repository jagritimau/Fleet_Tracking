import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useUIStore } from './hooks/useUIStore';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { FleetPage } from './pages/FleetPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { DriversPage } from './pages/DriversPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RoutesPage } from './pages/RoutesPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { currentPage } = useUIStore();

  if (currentPage === 'home') {
    return <HomePage />;
  }

  const page = {
    dashboard: <DashboardPage />,
    'live-map': <LiveMapPage />,
    fleet: <FleetPage />,
    shipments: <ShipmentsPage />,
    drivers: <DriversPage />,
    analytics: <AnalyticsPage />,
    routes: <RoutesPage />,
    alerts: <AlertsPage />,
    settings: <SettingsPage />,
  }[currentPage] ?? <DashboardPage />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{page}</main>
      </div>
    </div>
  );
}

export default App;
