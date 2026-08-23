export type Role = 'super_admin' | 'admin' | 'team_lead' | 'field_agent' | 'client';

export type CityTier = 'tier1' | 'tier2' | 'tier3';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  teamId: string | null;
  phone?: string;
  active: boolean;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  city: string;
  cityTier: CityTier;
  lat: number;
  lng: number;
  radiusKm: number;
}

export type MerchantStatus = 'cold_start' | 'registered' | 'activated';

export interface Merchant {
  id: string;
  name: string;
  address: string;
  phone: string;
  ownerName?: string;
  category?: string;
  cityTier: CityTier;
  lat: number | null;
  lng: number | null;
  status: MerchantStatus;
  coldStartDone: boolean;
  assignedTo: string | null;
  teamId: string | null;
  source: 'imported' | 'manual';
  createdAt: number;
}

export type VisitResult =
  | 'pitch'
  | 'follow_up_wa'
  | 'registered'
  | 'qualification_passed'
  | 'product_uploaded'
  | 'redemption'
  | 'cold_start_complete';

export interface VisitDoc {
  name: string;
  uri: string;
}

export interface Visit {
  id: string;
  merchantId: string;
  agentId: string;
  checkInAt: number;
  checkOutAt: number | null;
  lat: number;
  lng: number;
  merchantDistanceM: number | null;
  geoValid: boolean;
  ownerName: string;
  contactPhone: string;
  notes: string;
  result: VisitResult;
  photos: string[];
  docs: VisitDoc[];
}

export interface RoutePoint {
  lat: number;
  lng: number;
  t: number;
}

export interface Attendance {
  id: string;
  userId: string;
  clockInAt: number;
  clockInLat: number;
  clockInLng: number;
  clockOutAt: number | null;
  clockOutLat?: number;
  clockOutLng?: number;
  route: RoutePoint[];
  geoFenceOk: boolean;
}
