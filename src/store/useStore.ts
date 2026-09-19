import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { TRACK_MIN_STEP_M } from '../config';
import {
  Attendance,
  Merchant,
  Role,
  RoutePoint,
  Team,
  User,
  Visit,
  VisitResult,
} from '../types';
import { haversineM } from '../utils/geo';
import { uid } from '../utils/uuid';

/** posisi yang tidak terikat tim */
const TEAMLESS_ROLES: Role[] = ['super_admin', 'admin', 'client'];

export interface NewMerchantInput {
  name: string;
  address: string;
  phone: string;
  ownerName?: string;
  category?: string;
  cityTier: Merchant['cityTier'];
  lat: number | null;
  lng: number | null;
}

interface StoreState {
  ready: boolean;
  sessionUserId: string | null;
  users: User[];
  teams: Team[];
  merchants: Merchant[];
  visits: Visit[];
  attendances: Attendance[];

  /** Restores an existing Supabase session (if any) on cold app start. Call once from App.tsx. */
  init(): Promise<void>;
  login(username: string, password: string): Promise<string | null>;
  logout(): Promise<void>;

  addUser(p: {
    name: string;
    username: string;
    password: string;
    role: Role;
    teamId: string | null;
    phone?: string;
  }): Promise<string | null>;
  toggleUserActive(id: string): Promise<void>;
  updateUser(
    id: string,
    patch: Partial<Pick<User, 'name' | 'role' | 'teamId' | 'password' | 'phone'>>,
  ): Promise<string | null>;
  addTeam(p: { name: string; city: string; cityTier: Team['cityTier']; lat: number; lng: number }): Promise<void>;

  upsertMerchant(m: Merchant): Promise<void>;
  assignMerchants(ids: string[], agentId: string | null): Promise<void>;

  startVisit(
    merchantId: string,
    agentId: string,
    pos: { lat: number; lng: number },
    distM: number | null,
    geoValid: boolean,
  ): Promise<string>;
  updateVisit(id: string, patch: Partial<Visit>): void;
  finishVisit(id: string): Promise<void>;

  clockIn(pos: { lat: number; lng: number }, geoFenceOk: boolean): Promise<string>;
  clockOut(pos: { lat: number; lng: number }): Promise<void>;
  addRoutePoint(userId: string, p: Omit<RoutePoint, 't'>): void;

  /** Re-fetches everything from Supabase for the current session (was a local-seed reset pre-migration). */
  resetDemo(): Promise<void>;
}

/** user yang datanya boleh dilihat `viewer` sesuai posisi (role) — mirrors profiles_select RLS */
export function scopeUsers(s: Pick<StoreState, 'users'>, viewer: User): User[] {
  if (viewer.role === 'team_lead')
    return s.users.filter((u) => u.active && u.teamId === viewer.teamId);
  if (viewer.role === 'field_agent') return s.users.filter((u) => u.id === viewer.id);
  // super_admin, admin (ops manager), dan client memantau seluruh tim
  return s.users.filter((u) => u.active);
}

export function merchantScope(s: Pick<StoreState, 'merchants'>, viewer: User): Merchant[] {
  if (viewer.role === 'team_lead') return s.merchants.filter((m) => m.teamId === viewer.teamId);
  if (viewer.role === 'field_agent')
    return s.merchants.filter((m) => m.assignedTo === viewer.id);
  return s.merchants;
}

function applyResult(m: Merchant, result: VisitResult): Merchant {
  const next = { ...m };
  if (
    result === 'registered' ||
    result === 'qualification_passed' ||
    result === 'product_uploaded'
  ) {
    next.status = 'registered';
  }
  if (result === 'redemption') {
    next.status = 'activated';
  }
  if (result === 'cold_start_complete') {
    next.status = 'activated';
    next.coldStartDone = true;
  }
  return next;
}

function upsertById<T extends { id: string | number }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  return i === -1 ? [row, ...list] : list.map((x, idx) => (idx === i ? row : x));
}

// --- Supabase row <-> app type mapping -------------------------------------

function mapProfile(p: any): User {
  return {
    id: p.id,
    name: p.name,
    username: p.username,
    password: '', // Supabase Auth owns credentials now; never read client-side.
    role: p.role,
    teamId: p.team_id,
    phone: p.phone ?? undefined,
    active: p.active,
    createdAt: new Date(p.created_at).getTime(),
  };
}

function mapTeam(t: any): Team {
  return {
    id: t.id,
    name: t.name,
    city: t.city,
    cityTier: t.city_tier,
    lat: t.lat,
    lng: t.lng,
    radiusKm: t.radius_km,
  };
}

function mapMerchant(m: any): Merchant {
  return {
    id: m.id,
    name: m.name,
    address: m.address,
    phone: m.phone,
    ownerName: m.owner_name ?? undefined,
    category: m.category ?? undefined,
    cityTier: m.city_tier,
    lat: m.lat,
    lng: m.lng,
    status: m.status,
    coldStartDone: m.cold_start_done,
    assignedTo: m.assigned_to,
    teamId: m.team_id,
    source: m.source,
    createdAt: new Date(m.created_at).getTime(),
  };
}

function mapVisit(v: any): Visit {
  return {
    id: v.id,
    merchantId: v.merchant_id,
    agentId: v.agent_id,
    checkInAt: new Date(v.check_in_at).getTime(),
    checkOutAt: v.check_out_at ? new Date(v.check_out_at).getTime() : null,
    lat: v.lat,
    lng: v.lng,
    merchantDistanceM: v.merchant_distance_m,
    geoValid: v.geo_valid,
    ownerName: v.owner_name,
    contactPhone: v.contact_phone,
    notes: v.notes,
    result: v.result,
    photos: v.photos ?? [],
    docs: v.docs ?? [],
  };
}

function mapAttendance(a: any, route: RoutePoint[]): Attendance {
  return {
    id: a.id,
    userId: a.user_id,
    clockInAt: new Date(a.clock_in_at).getTime(),
    clockInLat: a.clock_in_lat,
    clockInLng: a.clock_in_lng,
    clockOutAt: a.clock_out_at ? new Date(a.clock_out_at).getTime() : null,
    clockOutLat: a.clock_out_lat ?? undefined,
    clockOutLng: a.clock_out_lng ?? undefined,
    route,
    geoFenceOk: a.geo_fence_ok,
  };
}

function visitRow(v: Visit) {
  return {
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
  };
}

// --- module-scope (non-reactive) helpers: realtime channel + debounce ------

let channel: RealtimeChannel | null = null;
let authListenerBound = false;

function teardownRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

function subscribeRealtime(set: (partial: Partial<StoreState>) => void, get: () => StoreState) {
  teardownRealtime();
  channel = supabase
    .channel('app-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        set({ users: get().users.filter((u) => u.id !== (payload.old as any).id) });
      } else {
        set({ users: upsertById(get().users, mapProfile(payload.new)) });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        set({ teams: get().teams.filter((t) => t.id !== (payload.old as any).id) });
      } else {
        set({ teams: upsertById(get().teams, mapTeam(payload.new)) });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        set({ merchants: get().merchants.filter((m) => m.id !== (payload.old as any).id) });
      } else {
        set({ merchants: upsertById(get().merchants, mapMerchant(payload.new)) });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        set({ visits: get().visits.filter((v) => v.id !== (payload.old as any).id) });
      } else {
        set({ visits: upsertById(get().visits, mapVisit(payload.new)) });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        set({ attendances: get().attendances.filter((a) => a.id !== (payload.old as any).id) });
      } else {
        const existing = get().attendances.find((a) => a.id === (payload.new as any).id);
        set({ attendances: upsertById(get().attendances, mapAttendance(payload.new, existing?.route ?? [])) });
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'route_points' }, (payload) => {
      const p = payload.new as any;
      set({
        attendances: get().attendances.map((a) =>
          a.id === p.attendance_id
            ? { ...a, route: [...a.route, { lat: p.lat, lng: p.lng, t: new Date(p.recorded_at).getTime() }] }
            : a,
        ),
      });
    })
    .subscribe();
}

/** Fetches the caller's profile + every scoped row (RLS-filtered) and hydrates the store. */
async function hydrateAll(
  set: (partial: Partial<StoreState>) => void,
  get: () => StoreState,
  userId: string,
): Promise<boolean> {
  const { data: me, error: meErr } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (meErr || !me || !me.active) return false;

  const [profilesRes, teamsRes, merchantsRes, visitsRes, attendancesRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('merchants').select('*'),
    supabase.from('visits').select('*'),
    supabase.from('attendances').select('*'),
  ]);

  const attendanceRows = attendancesRes.data ?? [];
  const attendanceIds = attendanceRows.map((a: any) => a.id);
  const { data: routePoints } =
    attendanceIds.length > 0
      ? await supabase
          .from('route_points')
          .select('*')
          .in('attendance_id', attendanceIds)
          .order('recorded_at', { ascending: true })
      : { data: [] as any[] };

  const routesByAttendance = new Map<string, RoutePoint[]>();
  for (const p of routePoints ?? []) {
    const arr = routesByAttendance.get(p.attendance_id) ?? [];
    arr.push({ lat: p.lat, lng: p.lng, t: new Date(p.recorded_at).getTime() });
    routesByAttendance.set(p.attendance_id, arr);
  }

  set({
    sessionUserId: userId,
    users: (profilesRes.data ?? []).map(mapProfile),
    teams: (teamsRes.data ?? []).map(mapTeam),
    merchants: (merchantsRes.data ?? []).map(mapMerchant),
    visits: (visitsRes.data ?? []).map(mapVisit),
    attendances: attendanceRows.map((a: any) => mapAttendance(a, routesByAttendance.get(a.id) ?? [])),
  });

  subscribeRealtime(set, get);
  return true;
}

async function callAdminUsers(body: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) return { error: error.message ?? 'Gagal menghubungi server.' };
  if (data?.error) return { error: data.error };
  return { data };
}

const visitWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounces per-keystroke visit field edits into one write ~600ms after the user stops typing. */
function scheduleVisitWrite(get: () => StoreState, id: string) {
  const existing = visitWriteTimers.get(id);
  if (existing) clearTimeout(existing);
  visitWriteTimers.set(
    id,
    setTimeout(() => {
      visitWriteTimers.delete(id);
      const v = get().visits.find((x) => x.id === id);
      if (!v) return;
      supabase
        .from('visits')
        .update(visitRow(v))
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('updateVisit failed:', error.message);
        });
    }, 600),
  );
}

function flushVisitWrite(id: string) {
  const existing = visitWriteTimers.get(id);
  if (existing) {
    clearTimeout(existing);
    visitWriteTimers.delete(id);
  }
}

export const useStore = create<StoreState>()((set, get) => ({
  ready: false,
  sessionUserId: null,
  users: [],
  teams: [],
  merchants: [],
  visits: [],
  attendances: [],

  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const ok = await hydrateAll(set, get, session.user.id);
      if (!ok) await supabase.auth.signOut();
    }
    set({ ready: true });

    if (!authListenerBound) {
      authListenerBound = true;
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          teardownRealtime();
          set({ sessionUserId: null, users: [], teams: [], merchants: [], visits: [], attendances: [] });
        }
      });
    }
  },

  login: async (username, password) => {
    const email = `${username.trim().toLowerCase()}@internal.spc`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return 'Username atau password salah.';
    const ok = await hydrateAll(set, get, data.user.id);
    if (!ok) {
      await supabase.auth.signOut();
      return 'Akun dinonaktifkan atau tidak ditemukan. Hubungi admin.';
    }
    return null;
  },

  logout: async () => {
    teardownRealtime();
    await supabase.auth.signOut();
    set({ sessionUserId: null, users: [], teams: [], merchants: [], visits: [], attendances: [] });
  },

  addUser: async ({ name, username, password, role, teamId, phone }) => {
    const uname = username.trim().toLowerCase();
    if (!name.trim()) return 'Nama wajib diisi.';
    if (!uname) return 'Username wajib diisi.';
    if (get().users.some((u) => u.username.toLowerCase() === uname)) return 'Username sudah dipakai.';
    if (password.length < 4) return 'Password minimal 4 karakter.';
    const { error } = await callAdminUsers({
      action: 'create',
      username: uname,
      password,
      name: name.trim(),
      role,
      teamId: TEAMLESS_ROLES.includes(role) ? null : teamId,
      phone: phone?.trim(),
    });
    if (error) return error;
    // the new profile row arrives via the realtime subscription (INSERT on profiles).
    return null;
  },

  toggleUserActive: async (id) => {
    const target = get().users.find((u) => u.id === id);
    if (!target) return;
    const nextActive = !target.active;
    set({ users: get().users.map((u) => (u.id === id ? { ...u, active: nextActive } : u)) });
    const { error } = await supabase.from('profiles').update({ active: nextActive }).eq('id', id);
    if (error) {
      set({ users: get().users.map((u) => (u.id === id ? { ...u, active: target.active } : u)) });
    }
  },

  updateUser: async (id, patch) => {
    const target = get().users.find((u) => u.id === id);
    if (!target) return 'Pengguna tidak ditemukan.';
    if (patch.password !== undefined && patch.password.length > 0 && patch.password.length < 4)
      return 'Password minimal 4 karakter.';

    const nextRole = patch.role ?? target.role;
    const nextTeamId = TEAMLESS_ROLES.includes(nextRole)
      ? null
      : patch.teamId !== undefined
        ? patch.teamId
        : target.teamId;
    const nextName = patch.name?.trim() || target.name;
    const nextPhone = patch.phone !== undefined ? patch.phone : target.phone;

    const { error } = await supabase
      .from('profiles')
      .update({ name: nextName, role: nextRole, team_id: nextTeamId, phone: nextPhone })
      .eq('id', id);
    if (error) return 'Gagal menyimpan perubahan.';

    if (patch.password && patch.password.length > 0) {
      const { error: pwErr } = await callAdminUsers({ action: 'setPassword', userId: id, password: patch.password });
      if (pwErr) return pwErr;
    }

    set({
      users: get().users.map((u) =>
        u.id === id ? { ...u, name: nextName, role: nextRole, teamId: nextTeamId, phone: nextPhone } : u,
      ),
    });
    return null;
  },

  addTeam: async ({ name, city, cityTier, lat, lng }) => {
    const t: Team = { id: uid('t_'), name: name.trim() || city.trim(), city: city.trim(), cityTier, lat, lng, radiusKm: 12 };
    set({ teams: [...get().teams, t] });
    const { error } = await supabase.from('teams').insert({
      id: t.id,
      name: t.name,
      city: t.city,
      city_tier: t.cityTier,
      lat: t.lat,
      lng: t.lng,
      radius_km: t.radiusKm,
    });
    if (error) set({ teams: get().teams.filter((x) => x.id !== t.id) });
  },

  upsertMerchant: async (m) => {
    const list = get().merchants;
    const exists = list.some((x) => x.id === m.id);
    set({ merchants: exists ? list.map((x) => (x.id === m.id ? m : x)) : [m, ...list] });
    const { error } = await supabase.from('merchants').upsert({
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
      assigned_to: m.assignedTo,
      team_id: m.teamId,
      source: m.source,
      created_at: new Date(m.createdAt).toISOString(),
    });
    if (error) console.warn('upsertMerchant failed:', error.message);
  },

  assignMerchants: async (ids, agentId) => {
    let teamId: string | null | undefined;
    if (agentId) {
      const a = get().users.find((u) => u.id === agentId);
      teamId = a?.teamId ?? null;
    }
    set({
      merchants: get().merchants.map((m) =>
        ids.includes(m.id) ? { ...m, assignedTo: agentId, teamId: agentId ? teamId! : m.teamId } : m,
      ),
    });
    const patch: Record<string, unknown> = { assigned_to: agentId };
    if (agentId) patch.team_id = teamId;
    const { error } = await supabase.from('merchants').update(patch).in('id', ids);
    if (error) console.warn('assignMerchants failed:', error.message);
  },

  startVisit: async (merchantId, agentId, pos, distM, geoValid) => {
    const v: Visit = {
      id: uid('v_'),
      merchantId,
      agentId,
      checkInAt: Date.now(),
      checkOutAt: null,
      lat: pos.lat,
      lng: pos.lng,
      merchantDistanceM: distM,
      geoValid,
      ownerName: '',
      contactPhone: '',
      notes: '',
      result: 'pitch',
      photos: [],
      docs: [],
    };
    set({ visits: [v, ...get().visits] });
    const { error } = await supabase.from('visits').insert({
      id: v.id,
      merchant_id: v.merchantId,
      agent_id: v.agentId,
      check_in_at: new Date(v.checkInAt).toISOString(),
      check_out_at: null,
      ...visitRow(v),
    });
    if (error) {
      set({ visits: get().visits.filter((x) => x.id !== v.id) });
      throw new Error(error.message);
    }
    return v.id;
  },

  updateVisit: (id, patch) => {
    set({ visits: get().visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
    scheduleVisitWrite(get, id);
  },

  finishVisit: async (id) => {
    const s = get();
    const v = s.visits.find((x) => x.id === id);
    if (!v) return;
    flushVisitWrite(id);
    set({
      visits: s.visits.map((x) => (x.id === id ? { ...x, checkOutAt: Date.now() } : x)),
      merchants: s.merchants.map((m) => (m.id === v.merchantId ? applyResult(m, v.result) : m)),
    });
    // make sure the latest (possibly just-typed) field edits land before the record locks
    const { error: syncErr } = await supabase.from('visits').update(visitRow(v)).eq('id', id);
    if (syncErr) console.warn('finishVisit field sync failed:', syncErr.message);
    const { error } = await supabase.rpc('finish_visit', { p_visit_id: id });
    if (error) console.warn('finish_visit RPC failed:', error.message);
  },

  clockIn: async (pos, geoFenceOk) => {
    const userId = get().sessionUserId!;
    const t = Date.now();
    const a: Attendance = {
      id: uid('a_'),
      userId,
      clockInAt: t,
      clockInLat: pos.lat,
      clockInLng: pos.lng,
      clockOutAt: null,
      route: [{ ...pos, t }],
      geoFenceOk,
    };
    set({ attendances: [a, ...get().attendances] });
    const { error } = await supabase.from('attendances').insert({
      id: a.id,
      user_id: a.userId,
      clock_in_at: new Date(a.clockInAt).toISOString(),
      clock_in_lat: a.clockInLat,
      clock_in_lng: a.clockInLng,
      clock_out_at: null,
      geo_fence_ok: a.geoFenceOk,
    });
    if (error) {
      // rollback optimistic state — a failed insert means the user isn't actually
      // clocked in server-side, so the local cache must not claim otherwise.
      set({ attendances: get().attendances.filter((x) => x.id !== a.id) });
      throw new Error(error.message);
    }
    const { error: rpErr } = await supabase
      .from('route_points')
      .insert({ attendance_id: a.id, user_id: userId, lat: pos.lat, lng: pos.lng, recorded_at: new Date(t).toISOString() });
    if (rpErr) console.warn('clockIn route point failed:', rpErr.message);
    return a.id;
  },

  clockOut: async (pos) => {
    const userId = get().sessionUserId!;
    const a = get().attendances.find((x) => x.userId === userId && !x.clockOutAt);
    if (!a) return;
    const t = Date.now();
    const shouldAddPoint = haversineM(a.route[a.route.length - 1] ?? a, pos) > TRACK_MIN_STEP_M;
    set({
      attendances: get().attendances.map((x) =>
        x.id === a.id
          ? {
              ...x,
              clockOutAt: t,
              clockOutLat: pos.lat,
              clockOutLng: pos.lng,
              route: shouldAddPoint ? [...x.route, { ...pos, t }] : x.route,
            }
          : x,
      ),
    });
    const { error } = await supabase
      .from('attendances')
      .update({ clock_out_at: new Date(t).toISOString(), clock_out_lat: pos.lat, clock_out_lng: pos.lng })
      .eq('id', a.id);
    if (error) console.warn('clockOut failed:', error.message);
    if (shouldAddPoint) {
      const { error: rpErr } = await supabase
        .from('route_points')
        .insert({ attendance_id: a.id, user_id: userId, lat: pos.lat, lng: pos.lng, recorded_at: new Date(t).toISOString() });
      if (rpErr) console.warn('clockOut route point failed:', rpErr.message);
    }
  },

  addRoutePoint: (userId, p) => {
    const a = get().attendances.find((x) => x.userId === userId && !x.clockOutAt);
    if (!a) return;
    const last = a.route[a.route.length - 1];
    if (last && haversineM(last, p) < TRACK_MIN_STEP_M) return;
    const t = Date.now();
    set({
      attendances: get().attendances.map((x) => (x.id === a.id ? { ...x, route: [...x.route, { ...p, t }] } : x)),
    });
    supabase
      .from('route_points')
      .insert({ attendance_id: a.id, user_id: userId, lat: p.lat, lng: p.lng, recorded_at: new Date(t).toISOString() })
      .then(({ error }) => {
        if (error) console.warn('addRoutePoint failed:', error.message);
      });
  },

  resetDemo: async () => {
    const userId = get().sessionUserId;
    if (!userId) return;
    await hydrateAll(set, get, userId);
  },
}));

export function useCurrentUser(): User | null {
  return useStore((s) =>
    s.sessionUserId ? (s.users.find((u) => u.id === s.sessionUserId) ?? null) : null,
  );
}
