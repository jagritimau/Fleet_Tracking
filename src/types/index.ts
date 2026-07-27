export type VehicleType = 'truck' | 'van' | 'bike' | 'car';
export type VehicleStatus = 'idle' | 'en_route' | 'maintenance' | 'offline';
export type DriverStatus = 'available' | 'on_duty' | 'off_duty';
export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';
export type ShipmentPriority = 'standard' | 'express' | 'urgent';
export type RouteStatus = 'planned' | 'active' | 'completed';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: VehicleType;
  status: VehicleStatus;
  current_lat: number | null;
  current_lng: number | null;
  speed: number;
  heading: number;
  fuel_level: number;
  mileage: number;
  last_seen: string;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  license_no: string | null;
  status: DriverStatus;
  vehicle_id: string | null;
  rating: number;
  trips_completed: number;
  avatar_url: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  tracking_no: string;
  customer_name: string;
  customer_phone: string | null;
  origin_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  vehicle_id: string | null;
  driver_id: string | null;
  weight_kg: number | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleTelemetry {
  id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuel_level: number | null;
  recorded_at: string;
}

export interface DeliveryEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  description: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  occurred_at: string;
}

export interface Route {
  id: string;
  vehicle_id: string;
  shipment_id: string | null;
  waypoints: { lat: number; lng: number; address: string }[];
  total_distance_km: number | null;
  estimated_duration_min: number | null;
  status: RouteStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
