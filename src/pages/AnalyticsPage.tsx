import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, Truck, BarChart2, Target, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vehicle, Shipment, Driver } from '../types';

// ── Canvas helper ─────────────────────────────────────────────────────────────
function useResizableChart(
  ref: React.RefObject<HTMLCanvasElement>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[],
) {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const render = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    drawRef.current(ctx, rect.width, rect.height);
  }, [ref]);

  // Re-render when deps change
  useEffect(() => { render(); }, [...deps, render]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render on resize
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const obs = new ResizeObserver(render);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [ref, render]);
}

// ── Day-bucket helpers ────────────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function bucketsFromShipments(shipments: Shipment[]) {
  const delivered = new Array(7).fill(0);
  const failed = new Array(7).fill(0);
  shipments.forEach((s) => {
    const dow = new Date(s.created_at).getDay(); // 0=Sun … 6=Sat
    const idx = dow === 0 ? 6 : dow - 1;         // rebase to Mon=0
    if (s.status === 'delivered') delivered[idx]++;
    else if (s.status === 'failed') failed[idx]++;
  });
  return { delivered, failed };
}

// ── Chart drawing utilities ───────────────────────────────────────────────────
function drawGridAndAxes(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  maxVal: number,
  xLabels: string[],
) {
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal - (maxVal / 4) * i)), pad.left - 6, y + 4);
  }
  ctx.textAlign = 'center';
  xLabels.forEach((lbl, i) => {
    const x = pad.left + (cw / (xLabels.length - 1)) * i;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(lbl, x, h - 8);
  });
  return { cw, ch };
}

function drawSmoothLine(
  ctx: CanvasRenderingContext2D,
  data: number[],
  color: string,
  pad: { top: number; right: number; bottom: number; left: number },
  w: number,
  ch: number,
  maxVal: number,
  fill = true,
) {
  const cw = w - pad.left - pad.right;
  const pts = data.map((v, i) => ({
    x: pad.left + (cw / (data.length - 1)) * i,
    y: pad.top + ch - (v / Math.max(maxVal, 1)) * ch,
  }));

  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) { ctx.moveTo(p.x, p.y); return; }
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  if (fill) {
    ctx.lineTo(pts[pts.length - 1].x, pad.top + ch);
    ctx.lineTo(pts[0].x, pad.top + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + '28');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Dots
  pts.forEach((p) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.stroke();
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lineRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const fuelRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('shipments').select('*'),
      supabase.from('drivers').select('*'),
    ]).then(([v, s, d]) => {
      if (v.error || s.error || d.error) {
        setError((v.error || s.error || d.error)!.message);
        return;
      }
      setVehicles(v.data || []);
      setShipments(s.data || []);
      setDrivers(d.data || []);
      setLoading(false);
    });
  }, []);

  // ── Line chart: real day-of-week delivery data ─────────────────────────────
  const { delivered: deliveredByDay, failed: failedByDay } = bucketsFromShipments(shipments);
  const lineMax = Math.max(...deliveredByDay, ...failedByDay, 4) + 2;

  useResizableChart(lineRef, (ctx, w, h) => {
    const pad = { top: 24, right: 16, bottom: 32, left: 44 };
    const { ch } = drawGridAndAxes(ctx, w, h, pad, lineMax, DAY_LABELS);
    drawSmoothLine(ctx, deliveredByDay, '#10b981', pad, w, ch, lineMax, true);
    drawSmoothLine(ctx, failedByDay, '#ef4444', pad, w, ch, lineMax, false);
  }, [loading, deliveredByDay, failedByDay, lineMax]);

  // ── Donut chart: shipment status distribution ──────────────────────────────
  const donutData = [
    { label: 'Delivered', value: shipments.filter((s) => s.status === 'delivered').length, color: '#10b981' },
    { label: 'In Transit', value: shipments.filter((s) => ['in_transit', 'picked_up'].includes(s.status)).length, color: '#3479fb' },
    { label: 'Pending', value: shipments.filter((s) => s.status === 'pending').length, color: '#94a3b8' },
    { label: 'Failed', value: shipments.filter((s) => s.status === 'failed').length, color: '#ef4444' },
    { label: 'Out for Del.', value: shipments.filter((s) => s.status === 'out_for_delivery').length, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  useResizableChart(donutRef, (ctx, w, h) => {
    const total = donutData.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    const cx = w / 2, cy = h / 2 - 14;
    const outerR = Math.min(w, h) / 2 - 24;
    const innerR = outerR * 0.58;
    let angle = -Math.PI / 2;

    donutData.forEach((d) => {
      const slice = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      angle += slice;
    });

    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(String(total), cx, cy + 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('shipments', cx, cy + 20);

    // Legend below donut
    const legendY = h - 10;
    const colW = Math.floor(w / donutData.length);
    donutData.forEach((d, i) => {
      const lx = colW * i + colW / 2;
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(lx - ctx.measureText(`${d.label}`).width / 2 - 6, legendY - 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${d.label} (${d.value})`, lx - ctx.measureText(`${d.label}`).width / 2, legendY);
    });
  }, [loading, donutData]);

  // ── Bar chart: fleet type distribution ─────────────────────────────────────
  const vehicleTypes = ['Truck', 'Van', 'Bike', 'Car'];
  const vehicleTypeCounts = vehicleTypes.map((t) => vehicles.filter((v) => v.type === t.toLowerCase()).length);
  const barColors = ['#3479fb', '#10b981', '#f59e0b', '#6366f1'];
  const barMax = Math.max(...vehicleTypeCounts, 1);

  useResizableChart(barRef, (ctx, w, h) => {
    const pad = { top: 24, right: 16, bottom: 36, left: 40 };
    const { cw, ch } = drawGridAndAxes(ctx, w, h, pad, barMax, vehicleTypes);
    const bw = (cw / vehicleTypes.length) * 0.52;
    vehicleTypes.forEach((_, i) => {
      const x = pad.left + (cw / vehicleTypes.length) * i + (cw / vehicleTypes.length - bw) / 2;
      const count = vehicleTypeCounts[i];
      const bh = (count / Math.max(barMax, 1)) * ch;
      const y = pad.top + ch - bh;
      const grad = ctx.createLinearGradient(0, y, 0, y + bh);
      grad.addColorStop(0, barColors[i]);
      grad.addColorStop(1, barColors[i] + '70');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, y, bw, Math.max(bh, 2), [5, 5, 0, 0]); ctx.fill();
      if (count > 0) {
        ctx.fillStyle = barColors[i];
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(count), x + bw / 2, y - 6);
      }
    });
  }, [loading, vehicleTypeCounts, barMax]);

  // ── Horizontal bar: top 5 drivers ──────────────────────────────────────────
  const top5Drivers = [...drivers].sort((a, b) => b.trips_completed - a.trips_completed).slice(0, 5);
  const maxTrips = top5Drivers[0]?.trips_completed || 1;

  useResizableChart(fuelRef, (ctx, w, h) => {
    if (!top5Drivers.length) return;
    const pad = { top: 8, right: 72, bottom: 8, left: 108 };
    const ch = h - pad.top - pad.bottom;
    const rowH = ch / top5Drivers.length;
    const hues = ['#10b981', '#3479fb', '#6366f1', '#f59e0b', '#94a3b8'];

    top5Drivers.forEach((d, i) => {
      const y = pad.top + i * rowH + rowH * 0.22;
      const bh = rowH * 0.56;
      const bw = ((d.trips_completed / maxTrips) * (w - pad.left - pad.right));

      ctx.fillStyle = '#475569';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(d.name.split(' ')[0] + ' ' + (d.name.split(' ')[1]?.[0] || '') + '.', pad.left - 8, y + bh / 2 + 4);

      // Track
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath(); ctx.roundRect(pad.left, y, w - pad.left - pad.right, bh, 4); ctx.fill();

      // Fill
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
      grad.addColorStop(0, hues[i]); grad.addColorStop(1, hues[i] + '80');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(pad.left, y, Math.max(bw, 6), bh, 4); ctx.fill();

      // Value
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${d.trips_completed}`, pad.left + bw + 6, y + bh / 2 + 4);
    });
  }, [loading, top5Drivers, maxTrips]);

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <p className="text-danger-600 font-semibold">Failed to load analytics</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    </div>
  );

  const totalDelivered = shipments.filter((s) => s.status === 'delivered').length;
  const successRate = shipments.length > 0 ? ((totalDelivered / shipments.length) * 100).toFixed(1) : '0';
  const avgRating = drivers.length ? (drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(2) : '0';
  const enRoute = vehicles.filter((v) => v.status === 'en_route').length;
  const totalMileage = vehicles.reduce((s, v) => s + v.mileage, 0);

  const kpis = [
    { label: 'Delivery Success', value: `${successRate}%`, sub: `${totalDelivered} completed`, icon: Target, color: 'from-accent-500 to-accent-700' },
    { label: 'Active Vehicles', value: enRoute, sub: `of ${vehicles.length} fleet`, icon: Truck, color: 'from-primary-600 to-primary-800' },
    { label: 'Avg Driver Rating', value: avgRating, sub: 'Fleet average', icon: Award, color: 'from-warning-500 to-warning-600' },
    { label: 'Total Fleet KM', value: `${(totalMileage / 1000).toFixed(0)}k`, sub: 'all vehicles combined', icon: BarChart2, color: 'from-primary-600 to-primary-800' },
  ];

  return (
    <div className="space-y-5 animate-fade-in max-w-[1600px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 animate-count-up">{k.value}</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Line chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="section-header">
            <div>
              <p className="section-title">Weekly Delivery Performance</p>
              <p className="section-subtitle">Delivered vs Failed — grouped by day of week</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent-500" /><span className="text-xs text-slate-600">Delivered</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-danger-500" /><span className="text-xs text-slate-600">Failed</span></div>
            </div>
          </div>
          <canvas ref={lineRef} className="w-full" style={{ height: 240 }} />
        </div>

        {/* Donut */}
        <div className="card p-5">
          <div className="section-header">
            <div>
              <p className="section-title">Shipment Distribution</p>
              <p className="section-subtitle">By current status</p>
            </div>
          </div>
          <canvas ref={donutRef} className="w-full" style={{ height: 240 }} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="section-header">
            <div>
              <p className="section-title">Fleet Composition</p>
              <p className="section-subtitle">Vehicles by type</p>
            </div>
          </div>
          <canvas ref={barRef} className="w-full" style={{ height: 200 }} />
        </div>

        <div className="card p-5">
          <div className="section-header">
            <div>
              <p className="section-title">Top Drivers by Trips</p>
              <p className="section-subtitle">Ranked by completed deliveries</p>
            </div>
          </div>
          <canvas ref={fuelRef} className="w-full" style={{ height: 200 }} />
        </div>
      </div>

      {/* Full leaderboard */}
      <div className="card overflow-hidden">
        <div className="section-header px-5 pt-5">
          <div>
            <p className="section-title">Driver Leaderboard</p>
            <p className="section-subtitle">All-time performance ranking</p>
          </div>
          <Award className="w-5 h-5 text-warning-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Trips</th>
                <th>Rating</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {[...drivers]
                .sort((a, b) => b.trips_completed - a.trips_completed)
                .map((d, i) => {
                  const maxBenchmark = Math.max(...drivers.map((x) => x.trips_completed), 1);
                  const perf = Math.round((d.trips_completed / maxBenchmark) * 100);
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i === 0 ? 'bg-warning-100 text-warning-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {d.avatar_url ? (
                            <img src={d.avatar_url} alt={d.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">{d.name[0]}</div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'on_duty' ? 'bg-accent-100 text-accent-700' : d.status === 'available' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="font-bold text-slate-900">{d.trips_completed.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-warning-400 fill-current flex-shrink-0" viewBox="0 0 20 20">
                            <path d="M10 1l2.928 5.934 6.55.952-4.739 4.62L15.855 19 10 15.917 4.145 19l1.116-6.494L.522 7.886l6.55-.952L10 1z" />
                          </svg>
                          <span className="font-semibold text-slate-900">{d.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                              style={{ width: `${perf}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-8">{perf}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
