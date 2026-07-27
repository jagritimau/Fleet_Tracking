import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch all en_route vehicles
    const { data: vehicles, error: fetchErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'en_route');

    if (fetchErr) throw fetchErr;
    if (!vehicles || vehicles.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: 'No en_route vehicles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    for (const v of vehicles) {
      if (!v.current_lat || !v.current_lng) continue;

      // Simulate movement: small random delta
      const delta = 0.01;
      const newLat = v.current_lat + (Math.random() - 0.5) * delta;
      const newLng = v.current_lng + (Math.random() - 0.5) * delta;
      const newSpeed = Math.max(0, Math.round(v.speed + (Math.random() - 0.5) * 10));
      const newHeading = Math.round((v.heading + (Math.random() - 0.5) * 30 + 360) % 360);
      const newFuel = Math.max(0, v.fuel_level - Math.round(Math.random()));

      // Update vehicle position
      const { error: updateErr } = await supabase
        .from('vehicles')
        .update({
          current_lat: newLat,
          current_lng: newLng,
          speed: newSpeed,
          heading: newHeading,
          fuel_level: newFuel,
          last_seen: new Date().toISOString(),
        })
        .eq('id', v.id);

      if (updateErr) {
        console.error(`Failed to update ${v.name}:`, updateErr.message);
        continue;
      }

      // Insert telemetry ping
      await supabase.from('vehicle_telemetry').insert({
        vehicle_id: v.id,
        lat: newLat,
        lng: newLng,
        speed: newSpeed,
        heading: newHeading,
        fuel_level: newFuel,
      });

      updated++;
    }

    return new Response(
      JSON.stringify({ updated, total: vehicles.length, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
