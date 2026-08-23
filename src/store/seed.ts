import {
  Attendance,
  Merchant,
  Team,
  User,
  Visit,
  VisitResult,
} from '../types';

const DAY = 86400000;
const NOW = Date.now();

/** timestamp hari-ago jam:menit */
function ts(daysAgo: number, h = 9, m = 0): number {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export interface SeedData {
  teams: Team[];
  users: User[];
  merchants: Merchant[];
  visits: Visit[];
  attendances: Attendance[];
}

export function buildSeed(): SeedData {
  const teams: Team[] = [
    {
      id: 't_jaksel',
      name: 'Jakarta Selatan',
      city: 'Jakarta Selatan',
      cityTier: 'tier1',
      lat: -6.2607,
      lng: 106.7816,
      radiusKm: 12,
    },
    {
      id: 't_sby',
      name: 'Surabaya',
      city: 'Surabaya',
      cityTier: 'tier2',
      lat: -7.2756,
      lng: 112.7521,
      radiusKm: 15,
    },
  ];

  const users: User[] = [
    {
      id: 'u_sa',
      name: 'Super Admin',
      username: 'superadmin',
      password: 'super123',
      role: 'super_admin',
      teamId: null,
      phone: '081200000000',
      active: true,
      createdAt: ts(62),
    },
    {
      id: 'u_client',
      name: 'Client SPC',
      username: 'client',
      password: 'client123',
      role: 'client',
      teamId: null,
      phone: '081200000009',
      active: true,
      createdAt: ts(61),
    },
    {
      id: 'u_admin',
      name: 'Ops Manager',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      teamId: null,
      phone: '081200000001',
      active: true,
      createdAt: ts(60),
    },
    {
      id: 'u_leadj',
      name: 'Arif Nugroho',
      username: 'lead.jaksel',
      password: 'lead123',
      role: 'team_lead',
      teamId: 't_jaksel',
      phone: '081200000002',
      active: true,
      createdAt: ts(58),
    },
    {
      id: 'u_leads',
      name: 'Maya Putri',
      username: 'lead.surabaya',
      password: 'lead123',
      role: 'team_lead',
      teamId: 't_sby',
      phone: '081200000003',
      active: true,
      createdAt: ts(58),
    },
    {
      id: 'u_budi',
      name: 'Budi Santoso',
      username: 'agent.budi',
      password: 'agent123',
      role: 'field_agent',
      teamId: 't_jaksel',
      phone: '081300000001',
      active: true,
      createdAt: ts(50),
    },
    {
      id: 'u_siti',
      name: 'Siti Rahma',
      username: 'agent.siti',
      password: 'agent123',
      role: 'field_agent',
      teamId: 't_jaksel',
      phone: '081300000002',
      active: true,
      createdAt: ts(50),
    },
    {
      id: 'u_anto',
      name: 'Anto Wijaya',
      username: 'agent.anto',
      password: 'agent123',
      role: 'field_agent',
      teamId: 't_sby',
      phone: '081300000003',
      active: true,
      createdAt: ts(45),
    },
  ];

  type MRow = [
    string, // id
    string, // nama
    string, // alamat
    number, // dLat dari base tim
    number, // dLng
    't_jaksel' | 't_sby',
    'cold_start' | 'registered' | 'activated',
    boolean, // coldStartDone
    string | null, // assignedTo
    number, // dibuat berapa hari lalu
    string, // pemilik
    string, // telepon
  ];
  const rows: MRow[] = [
    ['m1', 'Warung Nasi Bu Sri', 'Jl. Melawai IX No.12, Kebayoran Baru', 0.004, 0.003, 't_jaksel', 'activated', true, 'u_budi', 35, 'Sri Wahyuni', '081234500001'],
    ['m2', 'Kopi Kala Blok M', 'Jl. Bulungan No.29, Kebayoran Baru', -0.003, 0.005, 't_jaksel', 'activated', true, 'u_budi', 30, 'Dewi Lestari', '081234500002'],
    ['m3', 'Ayam Geprek Sambel Nampol', 'Jl. Cipete Raya No.8', -0.009, -0.004, 't_jaksel', 'registered', false, 'u_siti', 20, 'Rudi Hartono', '081234500003'],
    ['m4', 'Sate Klatheng Pak Tris', 'Jl. Dharmawangsa No.42', 0.008, 0.010, 't_jaksel', 'cold_start', false, 'u_siti', 12, 'Trisno', '081234500004'],
    ['m5', 'Bakso Pak Kris Tebet', 'Jl. Tebet Raya No.55', -0.018, 0.014, 't_jaksel', 'cold_start', false, 'u_budi', 8, 'Kristianto', '081234500005'],
    ['m6', 'Martabak Pecenongan 88', 'Jl. Wolter Monginsidi No.88', 0.011, 0.007, 't_jaksel', 'cold_start', false, null, 5, 'Yanto', '081234500006'],
    ['m7', 'Dapur Sunda Bu Euis', 'Jl. Kemang Timur No.7', -0.028, 0.021, 't_jaksel', 'cold_start', false, null, 2, 'Euis Komariah', '081234500007'],
    ['m8', 'Nasi Goreng Jancuk', 'Jl. Raya Darmo No.96, Surabaya', 0.005, -0.004, 't_sby', 'activated', true, 'u_anto', 33, 'Slamet Riyadi', '081234500008'],
    ['m9', 'Rujak Cirem Bu Endang', 'Jl. Walikota Mustajab No.15', -0.006, 0.006, 't_sby', 'registered', false, 'u_anto', 18, 'Endang S.', '081234500009'],
    ['m10', 'Mie Setan Level Neraka', 'Jl. Sulawesi No.25, Surabaya', 0.004, 0.008, 't_sby', 'cold_start', false, 'u_anto', 10, 'Hendra', '081234500010'],
    ['m11', 'Lontong Balap Pak Gendut', 'Jl. Prof. Dr. Moestopo No.3', -0.010, -0.009, 't_sby', 'cold_start', false, null, 3, 'Gendut', '081234500011'],
    ['m12', 'Es Kopi Susu Teteh', 'Jl. Sumatera No.41, Surabaya', 0.013, 0.012, 't_sby', 'cold_start', false, null, 1, 'Teteh Nurmala', '081234500012'],
  ];

  const baseOf: Record<string, { lat: number; lng: number }> = {
    t_jaksel: { lat: -6.2607, lng: 106.7816 },
    t_sby: { lat: -7.2756, lng: 112.7521 },
  };
  const tierOf: Record<string, 'tier1' | 'tier2'> = {
    t_jaksel: 'tier1',
    t_sby: 'tier2',
  };

  const merchants: Merchant[] = rows.map(
    ([id, name, address, dLat, dLng, teamId, status, csDone, assignedTo, ageDays, owner, phone]) => ({
      id,
      name,
      address,
      phone,
      ownerName: owner,
      category: 'F&B',
      cityTier: tierOf[teamId],
      lat: baseOf[teamId].lat + dLat,
      lng: baseOf[teamId].lng + dLng,
      status,
      coldStartDone: csDone,
      assignedTo,
      teamId,
      source: 'imported' as const,
      createdAt: ts(ageDays, 10, 15),
    }),
  );

  type VRow = [
    string, // merchant
    string, // agent
    number, // daysAgo
    number, // hour check-in
    number, // durasi menit
    VisitResult,
    boolean,
  ];
  const vrows: VRow[] = [
    ['m1', 'u_budi', 32, 9, 45, 'cold_start_complete', true],
    ['m2', 'u_budi', 28, 10, 38, 'redemption', true],
    ['m8', 'u_anto', 31, 9, 52, 'cold_start_complete', true],
    ['m3', 'u_siti', 19, 11, 40, 'registered', true],
    ['m9', 'u_anto', 17, 13, 35, 'registered', true],
    ['m4', 'u_siti', 11, 9, 47, 'product_uploaded', true],
    ['m10', 'u_anto', 9, 10, 44, 'follow_up_wa', true],
    ['m5', 'u_budi', 7, 14, 30, 'pitch', true],
    ['m6', 'u_budi', 1, 9, 26, 'follow_up_wa', false],
    ['m10', 'u_anto', 0, 8, 55, 'redemption', true],
  ];

  const visits: Visit[] = vrows.map(([merchantId, agentId, dAgo, hour, durMin, result, geoValid], i) => {
    const m = merchants.find((x) => x.id === merchantId)!;
    const ci = ts(dAgo, hour, 5);
    return {
      id: `v${i + 1}`,
      merchantId,
      agentId,
      checkInAt: ci,
      checkOutAt: ci + durMin * 60000,
      lat: (m.lat ?? 0) + (geoValid ? 0 : 0.004),
      lng: (m.lng ?? 0) + (geoValid ? 0 : 0.004),
      merchantDistanceM: geoValid ? 25 + ((i * 37) % 180) : 480,
      geoValid,
      ownerName: m.ownerName ?? '',
      contactPhone: m.phone,
      notes: '',
      result,
      photos: [],
      docs: [],
    };
  });

  /** rute sintetis kecil mengelilingi titik awal */
  function genRoute(lat: number, lng: number, startT: number, minutes: number) {
    const pts = [];
    const n = Math.max(4, Math.floor(minutes / 6));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 1.5;
      pts.push({
        lat: lat + 0.0035 * Math.sin(a),
        lng: lng + 0.0035 * Math.cos(a),
        t: startT + Math.round((minutes / n) * i) * 60000,
      });
    }
    return pts;
  }

  type ARow = [string, number, number, number, number]; // agent, daysAgo, jam masuk, menit kerja, fenceOk
  const arows: ARow[] = [
    ['u_budi', 6, 8, 500, 1],
    ['u_siti', 6, 8, 480, 1],
    ['u_anto', 6, 8, 495, 1],
    ['u_budi', 5, 8, 520, 1],
    ['u_siti', 5, 9, 430, 1],
    ['u_anto', 4, 8, 510, 0],
    ['u_budi', 3, 8, 505, 1],
    ['u_siti', 3, 8, 470, 1],
    ['u_anto', 3, 8, 488, 1],
    ['u_budi', 2, 8, 512, 1],
    ['u_siti', 2, 8, 465, 1],
    ['u_anto', 2, 9, 420, 1],
    ['u_budi', 1, 8, 498, 1],
    ['u_siti', 1, 8, 452, 1],
    ['u_anto', 1, 8, 501, 1],
    ['u_budi', 0, 8, 240, 1],
    ['u_siti', 0, 8, 225, 1],
    ['u_anto', 0, 8, 232, 1],
  ];

  const attendances: Attendance[] = arows.map(([userId, dAgo, hour, mins, ok], i) => {
    const u = users.find((x) => x.id === userId)!;
    const team = teams.find((t) => t.id === u.teamId)!;
    const startT = ts(dAgo, hour, 0);
    return {
      id: `a${i + 1}`,
      userId,
      clockInAt: startT,
      clockInLat: team.lat,
      clockInLng: team.lng,
      clockOutAt: startT + mins * 60000,
      clockOutLat: team.lat,
      clockOutLng: team.lng,
      route: genRoute(team.lat, team.lng, startT, mins),
      geoFenceOk: !!ok,
    };
  });

  return { teams, users, merchants, visits, attendances };
}
