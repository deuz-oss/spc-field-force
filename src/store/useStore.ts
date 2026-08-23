import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
import { buildSeed } from './seed';

const seed = buildSeed();

/** posisi yang tidak terikat tim */
const TEAMLESS_ROLES = ['super_admin', 'admin', 'client'];

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

  markReady(): void;
  login(username: string, password: string): string | null;
  logout(): void;

  addUser(p: {
    name: string;
    username: string;
    password: string;
    role: Role;
    teamId: string | null;
    phone?: string;
  }): string | null;
  toggleUserActive(id: string): void;
  updateUser(
    id: string,
    patch: Partial<Pick<User, 'name' | 'role' | 'teamId' | 'password' | 'phone'>>,
  ): string | null;
  addTeam(p: { name: string; city: string; cityTier: Team['cityTier']; lat: number; lng: number }): void;

  upsertMerchant(m: Merchant): void;
  assignMerchants(ids: string[], agentId: string | null): void;

  startVisit(
    merchantId: string,
    agentId: string,
    pos: { lat: number; lng: number },
    distM: number | null,
    geoValid: boolean,
  ): string;
  updateVisit(id: string, patch: Partial<Visit>): void;
  finishVisit(id: string): void;

  clockIn(pos: { lat: number; lng: number }, geoFenceOk: boolean): string;
  clockOut(pos: { lat: number; lng: number }): void;
  addRoutePoint(userId: string, p: Omit<RoutePoint, 't'>): void;

  resetDemo(): void;
}

/** user yang datanya boleh dilihat `viewer` sesuai posisi (role) */
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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ready: false,
      sessionUserId: null,
      ...seed,

      markReady: () => set({ ready: true }),

      login: (username, password) => {
        const u = get().users.find(
          (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
        );
        if (!u || u.password !== password) return 'Username atau password salah.';
        if (!u.active) return 'Akun dinonaktifkan. Hubungi admin.';
        set({ sessionUserId: u.id });
        return null;
      },

      logout: () => set({ sessionUserId: null }),

      addUser: ({ name, username, password, role, teamId, phone }) => {
        const uname = username.trim().toLowerCase();
        if (!name.trim()) return 'Nama wajib diisi.';
        if (!uname) return 'Username wajib diisi.';
        if (get().users.some((u) => u.username.toLowerCase() === uname))
          return 'Username sudah dipakai.';
        if (password.length < 4) return 'Password minimal 4 karakter.';
        const u: User = {
          id: uid('u_'),
          name: name.trim(),
          username: uname,
          password,
          role,
          teamId: TEAMLESS_ROLES.includes(role) ? null : teamId,
          phone: phone?.trim(),
          active: true,
          createdAt: Date.now(),
        };
        set({ users: [...get().users, u] });
        return null;
      },

      toggleUserActive: (id) =>
        set({
          users: get().users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)),
        }),

      updateUser: (id, patch) => {
        const target = get().users.find((u) => u.id === id);
        if (!target) return 'Pengguna tidak ditemukan.';
        if (patch.password !== undefined && patch.password.length > 0 && patch.password.length < 4)
          return 'Password minimal 4 karakter.';
        set({
          users: get().users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  name: patch.name?.trim() || u.name,
                  role: patch.role ?? u.role,
                  teamId:
                    patch.role && ['admin', 'super_admin', 'client'].includes(patch.role)
                      ? null
                      : patch.teamId !== undefined
                      ? patch.teamId
                      : patch.role && ['admin', 'super_admin', 'client'].includes(u.role)
                      ? patch.teamId ?? null
                      : u.teamId,
                  password:
                    patch.password && patch.password.length > 0 ? patch.password : u.password,
                  phone: patch.phone !== undefined ? patch.phone : u.phone,
                }
              : u,
          ),
        });
        return null;
      },

      addTeam: ({ name, city, cityTier, lat, lng }) =>
        set({
          teams: [
            ...get().teams,
            {
              id: uid('t_'),
              name: name.trim() || city.trim(),
              city: city.trim(),
              cityTier,
              lat,
              lng,
              radiusKm: 12,
            },
          ],
        }),

      upsertMerchant: (m) => {
        const list = get().merchants;
        const exists = list.some((x) => x.id === m.id);
        set({
          merchants: exists ? list.map((x) => (x.id === m.id ? m : x)) : [m, ...list],
        });
      },

      assignMerchants: (ids, agentId) => {
        let teamId: string | null | undefined;
        if (agentId) {
          const a = get().users.find((u) => u.id === agentId);
          teamId = a?.teamId ?? null;
        }
        set({
          merchants: get().merchants.map((m) =>
            ids.includes(m.id)
              ? { ...m, assignedTo: agentId, teamId: agentId ? teamId! : m.teamId }
              : m,
          ),
        });
      },

      startVisit: (merchantId, agentId, pos, distM, geoValid) => {
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
        return v.id;
      },

      updateVisit: (id, patch) =>
        set({
          visits: get().visits.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        }),

      finishVisit: (id) => {
        const s = get();
        const v = s.visits.find((x) => x.id === id);
        if (!v) return;
        set({
          visits: s.visits.map((x) =>
            x.id === id ? { ...x, checkOutAt: Date.now(), contactPhone: x.contactPhone || '' } : x,
          ),
          merchants: s.merchants.map((m) =>
            m.id === v.merchantId
              ? applyResult(m, v.result)
              : m,
          ),
        });
      },

      clockIn: (pos, geoFenceOk) => {
        const userId = get().sessionUserId!;
        const a: Attendance = {
          id: uid('a_'),
          userId,
          clockInAt: Date.now(),
          clockInLat: pos.lat,
          clockInLng: pos.lng,
          clockOutAt: null,
          route: [{ ...pos, t: Date.now() }],
          geoFenceOk,
        };
        set({ attendances: [a, ...get().attendances] });
        return a.id;
      },

      clockOut: (pos) => {
        const userId = get().sessionUserId!;
        set({
          attendances: get().attendances.map((a) => {
            if (a.userId !== userId || a.clockOutAt) return a;
            return {
              ...a,
              clockOutAt: Date.now(),
              clockOutLat: pos.lat,
              clockOutLng: pos.lng,
              route:
                haversineM(a.route[a.route.length - 1] ?? a, pos) > TRACK_MIN_STEP_M
                  ? [...a.route, { ...pos, t: Date.now() }]
                  : a.route,
            };
          }),
        });
      },

      addRoutePoint: (userId, p) =>
        set({
          attendances: get()
            .attendances.map((a) => {
              if (a.userId !== userId || a.clockOutAt) return a;
              const last = a.route[a.route.length - 1];
              if (last && haversineM(last, p) < TRACK_MIN_STEP_M) return a;
              return { ...a, route: [...a.route, { ...p, t: Date.now() }] };
            })
            .slice(), // buat referensi array baru agar re-render
        }),

      resetDemo: () => {
        const fresh = buildSeed();
        set({
          users: fresh.users,
          teams: fresh.teams,
          merchants: fresh.merchants,
          visits: fresh.visits,
          attendances: fresh.attendances,
          sessionUserId: null,
        });
      },
    }),
    {
      name: 'spc-ffc-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        sessionUserId: s.sessionUserId,
        users: s.users,
        teams: s.teams,
        merchants: s.merchants,
        visits: s.visits,
        attendances: s.attendances,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // migrasi ringan: pastikan akun super admin & client selalu tersedia
          const hasSuperAdmin = state.users.some((u) => u.role === 'super_admin');
          const hasClient = state.users.some((u) => u.role === 'client');
          if (!hasSuperAdmin || !hasClient) {
            const fresh = buildSeed();
            const additions = fresh.users.filter(
              (f) => !state.users.some((u) => u.username === f.username),
            );
            useStore.setState({ users: [...additions, ...state.users] });
          }
          state.markReady();
        }
      },
    },
  ),
);

export function useCurrentUser(): User | null {
  return useStore((s) =>
    s.sessionUserId ? (s.users.find((u) => u.id === s.sessionUserId) ?? null) : null,
  );
}
