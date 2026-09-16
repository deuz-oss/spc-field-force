# SPC Field Force — UX Architecture

## Navigation model

The existing role→tab-set mapping in `App.tsx` was already correct (see `UI_UX_AUDIT.md` §"Role-based IA decision") and was **kept**:

| Role | Tabs |
|---|---|
| Super Admin | Dashboard, Merchant, Laporan, Pengguna, Profil |
| Ops Manager / Team Lead / Client | Dashboard, Merchant, Laporan, Profil |
| Field Agent | Dashboard, Merchant, Kunjungan, Absensi, Profil |

What changed is the **shell rendering it**, in `App.tsx`:

- **Mobile (<900dp width):** bottom tab bar, unchanged position/behavior from the original app — muscle memory preserved.
- **Tablet/Web (≥900dp width):** a persistent 232px dark left rail replaces the bottom bar, showing the same routes plus a user-identity header (name + role). The active screen's content area gets `marginLeft: 232` via `sceneStyle` so nothing overlaps.
- **Header:** previously the app rendered a Stack header ("Main") *and* a Tab header (screen title) stacked on top of each other. The Stack screen now sets `headerShown: false`, leaving one header, which also now carries a role badge on the right (`ROLE_LABEL[role]`) so context is visible on every screen, not just Profile.

This is implemented as a custom `tabBar` render prop (`ResponsiveTabBar` in `App.tsx`) rather than a second navigator, so there is exactly one source of truth for the active route.

## Per-role workflow (dashboard composition)

`DashboardScreen.tsx` now branches into two real layouts sharing the same store data:

```
role === 'field_agent'
  → FieldAgentDashboard
      ClockCard (attendance hero)
      2 personal KPI cards (visits, valid-visit%)
      "Merchant Prioritas" — assigned merchants, cold-start first, tap → MerchantDetail
      Personal funnel

everyone else
  → management layout
      5-card KPI strip (Agen Aktif, Geo-fence, Kunjungan, Valid Visit, Merchant Activated)
      "Perlu Perhatian" exceptions list (only agents currently below target — hidden if none)
      Team funnel (FunnelChart)
      Merchant status snapshot
      Performance KPI — per-agent rows, tap to expand compliance detail + individual funnel
```

The Field Agent view deliberately omits: team funnel, org-wide merchant snapshot, cross-agent performance table — none of it is actionable for someone whose job is "visit merchants today," per brief §5/§7.

## Screen-level flows unaffected

Merchant assignment, CSV import, user/team management, visit check-in/out, attendance clock-in/out, CSV/report export, and the Option 3 fee estimator all use the **same store actions and validation** as before (`useStore.ts` was not modified). Only presentation and information hierarchy changed. See `UI_UX_AUDIT.md` for the per-screen rationale and `VISUAL_QA.md` for before/after evidence.
