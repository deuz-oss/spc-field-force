# SPC Field Force — Design System

Token architecture follows the primitive → semantic → component pattern (per the `design-system` skill), implemented as TypeScript objects in `src/theme.ts` (RN StyleSheet, not CSS variables — this is Expo/React Native, not a web/Tailwind stack) plus a responsive helper in `src/utils/responsive.ts`.

## Colors (`src/theme.ts` → `C`)

Unchanged base palette (Trust Blue `#2563EB` + slate neutrals + semantic AA-contrast accents) — extended with:

| Token | Value | Use |
|---|---|---|
| `railBg` | `#0F172A` | Desktop/tablet side-rail navigation background |
| `borderStrong` | `#CBD5E1` | Stronger divider where `border` is too subtle |
| `focus` | `#2563EB` | Reserved for focus rings (web keyboard nav) |
| `surfaceElevated` | `#FFFFFF` | Alias for elevated cards (currently same as `card`, kept distinct for future dark-mode) |

`SEMANTIC` is a generic alias layer (`background`, `surface`, `textPrimary`, `textSecondary`, `brand`, `success`, `warning`, `danger`, `info`, …) mapping onto the same `C` values, matching the brief's naming vocabulary without renaming every call site in the existing codebase (would have been a reckless mass-rename with no functional benefit).

## Typography (`T`)

Extended from 5 to 9 steps: `display → h1 → h2 → h3 → body → small → caption → label → metric`.

- `display` (30/36, ExtraBold, -0.3 tracking) — login hero, live timers.
- `metric` (26/32, ExtraBold, tabular-nums) — the big number inside `KPICard`.
- `caption` (10.5/14, SemiBold, uppercase, +0.6 tracking) — KPI eyebrow labels.

## Spacing / Radius / Elevation

Spacing scale (`SP`) and radius scale (`R`) unchanged — already disciplined (3 radius values, 5 spacing steps). Added `ELEV` (0/1/2) so shadow usage is a conscious choice per surface instead of every `Card` reusing the same inline shadow object.

## Responsive (`src/utils/responsive.ts`)

`useBreakpoint()` (wraps `useWindowDimensions`) exposes:

```
isTablet       // width >= 700
isDesktop      // width >= 900  — triggers the side-rail shell
isWideDesktop  // width >= 1280 — wider content max-width
gridCols       // 2–4, used by list/grid screens
contentMaxWidth
```

Screens use `isDesktop` to switch layout (Login two-pane, Merchant list 1↔2 columns, Dashboard/content `maxWidth` centering) rather than stretching a mobile column edge-to-edge.

## New component primitives (`src/components/ui.tsx`)

| Component | Purpose |
|---|---|
| `KPICard` | Metric + target + status (icon **and** color **and** label — never color alone) + optional trend arrow. Replaces bare `StatCard` for anything with a target. |
| `StatusBadge` | `Badge` + icon. Used everywhere a status previously relied on color alone (agent KPI rows, attendance rows, visit geo badges). |
| `FunnelChart` | Horizontal proportional bars for the onboarding funnel — replaces the flat wall of `Badge` chips. |
| `ListRow` | Generic list item: title/subtitle/meta/trailing + optional left color bar (`emphasis`) so status is visible without opening the row. Used by Merchant, Visit, Attendance, and Dashboard agent lists. |
| `SectionHeader` | Title + subtitle + optional right-aligned text action, replacing ad-hoc `<H>`/`<Muted>` pairs. |
| `SkeletonBlock` / `LoadingCard` | Static (non-animated) loading placeholders. |
| `ErrorState` | Icon + message + optional retry link. |

`Card`, `Btn`, `Chip`, `Badge`, `Input`, `Field`, `Muted`, `StatCard`, `Empty`, `MiniBar` are unchanged — they were already reasonable primitives; the redesign composes on top of them rather than replacing them.

## What was deliberately left alone

- No new dependencies were added (no charting library, no CSS-in-JS system) — `FunnelChart`/`KPICard` are plain `View`/`Text` compositions, consistent with brief §23 ("prefer existing architecture").
- Dark mode tokens were not built out (no dark mode was requested); `DarkTheme` import in `App.tsx` remains unused as in the original code.
