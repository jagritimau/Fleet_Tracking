/*
# Real-Time Logistics & Fleet Tracking Platform — Initial Schema

## Summary
Creates the full schema for a fleet tracking platform: vehicles, drivers, shipments, routes, and telemetry/events.

## New Tables
1. `vehicles` — fleet vehicles with status, location, fuel, mileage
2. `drivers` — driver profiles linked to vehicles
3. `shipments` — delivery shipments with origin/destination, status, ETA
4. `vehicle_telemetry` — real-time GPS pings (lat, lng, speed, heading)
5. `delivery_events` — status timeline events per shipment
6. `routes` — optimized route plans for vehicles

## Security
- RLS enabled on all tables
- Public (anon + authenticated) access since this is a single-tenant ops dashboard (no user auth)
*/

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plate text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'truck', -- truck, van, bike, car
  status text NOT NULL DEFAULT 'idle', -- idle, en_route, maintenance, offline
  current_lat double precision,
  current_lng double precision,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  fuel_level integer DEFAULT 100,
  mileage integer DEFAULT 0,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE TO anon, authenticated USING (true);

-- DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  license_no text,
  status text NOT NULL DEFAULT 'available', -- available, on_duty, off_duty
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  rating double precision DEFAULT 5.0,
  trips_completed integer DEFAULT 0,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_drivers" ON drivers;
CREATE POLICY "anon_select_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);

-- SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_no text UNIQUE NOT NULL DEFAULT 'SHP-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  customer_name text NOT NULL,
  customer_phone text,
  origin_address text NOT NULL,
  origin_lat double precision,
  origin_lng double precision,
  destination_address text NOT NULL,
  destination_lat double precision,
  destination_lng double precision,
  status text NOT NULL DEFAULT 'pending', -- pending, picked_up, in_transit, out_for_delivery, delivered, failed
  priority text NOT NULL DEFAULT 'standard', -- standard, express, urgent
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  weight_kg double precision,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_shipments" ON shipments;
CREATE POLICY "anon_select_shipments" ON shipments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shipments" ON shipments;
CREATE POLICY "anon_insert_shipments" ON shipments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shipments" ON shipments;
CREATE POLICY "anon_update_shipments" ON shipments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shipments" ON shipments;
CREATE POLICY "anon_delete_shipments" ON shipments FOR DELETE TO anon, authenticated USING (true);

-- VEHICLE TELEMETRY (real-time GPS pings)
CREATE TABLE IF NOT EXISTS vehicle_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  fuel_level integer,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_telemetry" ON vehicle_telemetry;
CREATE POLICY "anon_select_telemetry" ON vehicle_telemetry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_telemetry" ON vehicle_telemetry;
CREATE POLICY "anon_insert_telemetry" ON vehicle_telemetry FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_telemetry" ON vehicle_telemetry;
CREATE POLICY "anon_update_telemetry" ON vehicle_telemetry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_telemetry" ON vehicle_telemetry;
CREATE POLICY "anon_delete_telemetry" ON vehicle_telemetry FOR DELETE TO anon, authenticated USING (true);

-- DELIVERY EVENTS (timeline per shipment)
CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- created, picked_up, checkpoint, out_for_delivery, delivered, failed, note
  description text NOT NULL,
  location text,
  lat double precision,
  lng double precision,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_events" ON delivery_events;
CREATE POLICY "anon_select_events" ON delivery_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON delivery_events;
CREATE POLICY "anon_insert_events" ON delivery_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON delivery_events;
CREATE POLICY "anon_update_events" ON delivery_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON delivery_events;
CREATE POLICY "anon_delete_events" ON delivery_events FOR DELETE TO anon, authenticated USING (true);

-- ROUTES
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  waypoints jsonb DEFAULT '[]'::jsonb, -- array of {lat, lng, address}
  total_distance_km double precision,
  estimated_duration_min integer,
  status text NOT NULL DEFAULT 'planned', -- planned, active, completed
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_routes" ON routes;
CREATE POLICY "anon_select_routes" ON routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_routes" ON routes;
CREATE POLICY "anon_insert_routes" ON routes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routes" ON routes;
CREATE POLICY "anon_update_routes" ON routes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routes" ON routes;
CREATE POLICY "anon_delete_routes" ON routes FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_vehicle_id ON vehicle_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_recorded_at ON vehicle_telemetry(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_vehicle_id ON shipments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_shipment_id ON delivery_events(shipment_id);
