/**
 * One-time (but safely re-runnable) seed of the Supabase project with the
 * exact same demo data the app ships locally (src/store/seed.ts), so the
 * 8 demo accounts and their history keep working after the auth/data
 * migration. Run with:
 *
 *   npx tsx scripts/seed-supabase.ts
 *
 * Requires .env (see .env.example) with EXPO_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY set. The service-role key bypasses RLS - never
 * ship it in the app, never commit it.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { buildSeed } from '../src/store/seed';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { teams, users, merchants, visits, attendances } = buildSeed();

  console.log(
    `Seeding ${teams.length} teams, ${users.length} users, ${merchants.length} merchants, ` +
      `${visits.length} visits, ${attendances.length} attendances...`,
  );

  // 1. Teams
  const { error: teamsErr } = await supabase.from('teams').upsert(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      city: t.city,
      city_tier: t.cityTier,
      lat: t.lat,
      lng: t.lng,
      radius_km: t.radiusKm,
    })),
  );
  if (teamsErr) throw teamsErr;
  console.log('teams done');

  // 2. Auth users (profiles rows are created automatically by the
  //    handle_new_auth_user trigger from 0001_init.sql). Map each seed
  //    User.id (e.g. "u_budi") to the real auth uuid Supabase assigns, since
  //    every downstream table's FK needs the uuid, not the old id.
  const idMap = new Map<string, string>();
  for (const u of users) {
    const email = `${u.username.toLowerCase()}@internal.spc`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, username: u.username, role: u.role, team_id: u.teamId, phone: u.phone },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        const existing = list.users.find((x) => x.email === email);
        if (!existing) throw error;
        idMap.set(u.id, existing.id);
        console.log(`  ${u.username} already exists, reusing ${existing.id}`);
        continue;
      }
      throw error;
    }
    idMap.set(u.id, data.user.id);
    console.log(`  created ${u.username} -> ${data.user.id}`);
  }

  // 3. Merchants (remap assigned_to from old User.id to the new auth uuid)
  const { error: merchErr } = await supabase.from('merchants').upsert(
    merchants.map((m) => ({
      id: m.id,
      name: m.name,
      address: m.address,
      phone: m.phone,
      owner_name: m.ownerName,
      category: m.category,
      city_tier: m.cityTier,
      lat: m.lat,
      lng: m.lng,
      status: m.status,
      cold_start_done: m.coldStartDone,
      assigned_to: m.assignedTo ? idMap.get(m.assignedTo) : null,
      team_id: m.teamId,
      source: m.source,
      created_at: new Date(m.createdAt).toISOString(),
    })),
  );
  if (merchErr) throw merchErr;
  console.log('merchants done');

  // 4. Visits
  const { error: visitErr } = await supabase.from('visits').upsert(
    visits.map((v) => ({
      id: v.id,
      merchant_id: v.merchantId,
      agent_id: idMap.get(v.agentId),
      check_in_at: new Date(v.checkInAt).toISOString(),
      check_out_at: v.checkOutAt ? new Date(v.checkOutAt).toISOString() : null,
      lat: v.lat,
      lng: v.lng,
      merchant_distance_m: v.merchantDistanceM,
      geo_valid: v.geoValid,
      owner_name: v.ownerName,
      contact_phone: v.contactPhone,
      notes: v.notes,
      result: v.result,
      photos: v.photos,
      docs: v.docs,
    })),
  );
  if (visitErr) throw visitErr;
  console.log('visits done');

  // 5. Attendances
  const { error: attErr } = await supabase.from('attendances').upsert(
    attendances.map((a) => ({
      id: a.id,
      user_id: idMap.get(a.userId),
      clock_in_at: new Date(a.clockInAt).toISOString(),
      clock_in_lat: a.clockInLat,
      clock_in_lng: a.clockInLng,
      clock_out_at: a.clockOutAt ? new Date(a.clockOutAt).toISOString() : null,
      clock_out_lat: a.clockOutLat,
      clock_out_lng: a.clockOutLng,
      geo_fence_ok: a.geoFenceOk,
    })),
  );
  if (attErr) throw attErr;
  console.log('attendances done');

  // 6. Route points - delete-then-insert per attendance so re-running the
  //    script is idempotent (route_points has no natural unique key to upsert on).
  const attendanceIds = attendances.map((a) => a.id);
  const { error: delErr } = await supabase.from('route_points').delete().in('attendance_id', attendanceIds);
  if (delErr) throw delErr;

  const points = attendances.flatMap((a) =>
    a.route.map((p) => ({
      attendance_id: a.id,
      user_id: idMap.get(a.userId)!,
      lat: p.lat,
      lng: p.lng,
      recorded_at: new Date(p.t).toISOString(),
    })),
  );
  const BATCH = 500;
  for (let i = 0; i < points.length; i += BATCH) {
    const { error } = await supabase.from('route_points').insert(points.slice(i, i + BATCH));
    if (error) throw error;
  }
  console.log(`route_points done (${points.length} points)`);

  console.log('\nSeed complete. Demo logins (username / password):');
  for (const u of users) console.log(`  ${u.username} / ${u.password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
