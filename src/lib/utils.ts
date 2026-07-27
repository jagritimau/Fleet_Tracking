import type {
  VehicleStatus,
  DriverStatus,
  ShipmentStatus,
  ShipmentPriority,
} from '../types';

export function formatTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const vehicleStatusConfig: Record<
  VehicleStatus,
  { label: string; color: string; dot: string }
> = {
  en_route: { label: 'En Route', color: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  idle: { label: 'Idle', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  maintenance: { label: 'Maintenance', color: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  offline: { label: 'Offline', color: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
};

export const driverStatusConfig: Record<
  DriverStatus,
  { label: string; color: string; dot: string }
> = {
  on_duty: { label: 'On Duty', color: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  available: { label: 'Available', color: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  off_duty: { label: 'Off Duty', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

export const shipmentStatusConfig: Record<
  ShipmentStatus,
  { label: string; color: string; dot: string }
> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  picked_up: { label: 'Picked Up', color: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  in_transit: { label: 'In Transit', color: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  delivered: { label: 'Delivered', color: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  failed: { label: 'Failed', color: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
};

export const priorityConfig: Record<ShipmentPriority, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-slate-100 text-slate-600' },
  express: { label: 'Express', color: 'bg-primary-100 text-primary-700' },
  urgent: { label: 'Urgent', color: 'bg-danger-100 text-danger-700' },
};
