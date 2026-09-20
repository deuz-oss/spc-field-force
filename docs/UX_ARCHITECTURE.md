# UX Architecture

The information architecture, role→navigation mapping, and dashboard composition below were established in v1 (`7d54290`) and validated as structurally sound during the v2 planning pass — v2 changed the visual system (`DESIGN_SYSTEM.md`) and responsive nav tiers, not the IA. This doc is updated only where the v2 pass changed something structural (the tablet nav tier) or where a detail below is now visually stale (colors, rail widths).

## Role → navigation

Each role sees a distinct tab set reflecting what they're actually responsible for — not one generic tab bar with permission-gated screens:

| Role | Tabs |
|---|---|
| Field Agent / Team Lead | Dashboard, Merchants, Attendance, Profile |
| Ops Manager / Super Admin | Dashboard, Merchants, Users, Reports, Live Map, Profile |

`App.tsx` derives the tab set from `me.role` at mount — no client-side route guarding needed beyond that, since each role only ever sees its own screen stack.

## Responsive nav — 3 tiers

v1 shipped a binary split (bottom tabs below 900dp, full rail at ≥900dp), which meant the 700–899dp tablet range got the exact same cramped bottom-tab treatment as a 360px phone despite having plenty of width to spare. `useBreakpoint()` already exposed `isTablet`/`isDesktop`/`isWideDesktop`, but `App.tsx` only ever consumed `isDesktop`. v2 fixes this with a real 3-tier nav:

| Width | Tier | Shape |
|---|---|---|
| < 700dp | Phone | Bottom tab bar, icon + label, ink background |
| 700–899dp | Compact tablet rail (**new in v2**) | 76px left rail, icon-only, no labels, no user-identity header |
| ≥ 900dp | Full desktop rail | 232px left rail, icon + label, user identity header, gold left-accent active state |

All three tiers share the same ink (`C.railBg`) background and gold (`C.primary`) active-state accent — only density/labeling changes with width, not the visual language.

## Dashboard composition

Two structurally different dashboards, not one dashboard with conditional widgets:

- **Field Agent / Team Lead** — `ClockCard` (live clock-in/out with geo-fence badge and running timer) at top, since "am I clocked in, and is today's session valid" is the single most important fact for this role in the moment; assigned-merchant list below it, sortable by proximity/priority.
- **Ops Manager / Super Admin** — KPI-card row (headline metrics), an exceptions list (geo-fence violations, stalled merchants, overdue visits — the things that need a human decision), and a funnel chart (cold-start → registered → activated) below. No clock-in card — these roles don't clock in themselves.

This split is why `DashboardScreen.tsx` contains two largely-independent component trees (`FieldAgentDashboard`, `ManagementDashboard`) rather than one parameterized component — the information needs are different enough that forcing a shared shape would have made both worse.

## Detail-screen pattern

Merchant, Visit, and Attendance detail screens share a consistent shape: a summary `Card` at top, a map (`LeafletMap`) where geodata is relevant, a scrollable history/detail list below, and — for the two screens with an in-progress user action (merchant check-in, visit check-out) — a `StickyFooter` action bar pinned to the bottom of the screen rather than requiring a scroll to reach the primary CTA.

## What v2 did not change

Zustand store shape, Supabase schema/RLS, KPI calculation logic (`utils/kpi.ts`), and every IA decision above — all untouched. See `DESIGN_SYSTEM.md` for what did change.
