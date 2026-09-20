# SPC Field Force — Design System v2 ("Field Ledger")

This supersedes the v1 "Trust Blue" system documented here previously (commit `7d54290`). v1 was a competent, correctly-structured redesign — role-based dashboard, dark rail nav, KPI/exceptions/funnel vocabulary — but used a generic blue-SaaS palette. v2 keeps every structural decision from v1 (see `UX_ARCHITECTURE.md`) and replaces only the visual identity layer: tokens in `src/theme.ts`, primitives in `src/components/ui.tsx`.

Token architecture is still primitive → semantic → component, implemented as TypeScript objects (RN StyleSheet, not CSS variables — Expo/React Native, not a web/Tailwind stack).

## Design direction

**"Field Ledger"** — the metaphor is a well-kept field logbook / audit ledger: warm paper-toned neutrals, ink-navy chrome, a brass/gold brand accent. Deliberately not blue or purple (the two colors every generic SaaS template reaches for), and deliberately not an all-dark "command console" aesthetic — field agents work outdoors in bright sunlight, not in a dark IDE, so the working surfaces stay light and high-contrast.

Two other directions were considered and rejected: an all-dark terminal aesthetic (reads as a developer tool, fights outdoor legibility) and a soft consumer/pastel aesthetic (the "generic AI SaaS" trap, undersells the compliance/audit-trail seriousness of geo-fenced field operations).

## Colors (`src/theme.ts` → `C`)

| Token | Value | Use |
|---|---|---|
| `bg` | `#FAF8F3` | Warm paper app canvas (was cool slate `#F8FAFC`) |
| `card` | `#FFFFFF` | Surface (unchanged) |
| `railBg` | `#0A0E17` | Ink chrome — desktop rail, tablet compact rail, all stack/tab headers (was `#0F172A`, and headers used to be solid blue) |
| `primary` | `#C9962B` | Brand gold — **fill only** (buttons, active nav state, badges). Paired with `onPrimary` (ink) text/icons: ~6.2:1 contrast, comfortably AA. |
| `primaryText` | `#8A6A1A` | Darker bronze — use whenever gold needs to be a **text color** on a light surface (links, outline-button labels). Raw `primary` as text on white is only ~2.7:1 and fails AA; this variant is ~5:1. |
| `primaryDark` | `#A6791E` | Focus rings, outline-button borders, map polylines — anywhere gold-the-fill is too low-contrast as a boundary/stroke color (~2.7:1) but a graphical element still needs ≥3:1. |
| `onPrimary` | `#211F1A` | Ink text/icon color for anything painted on the gold fill. |
| `text` / `muted` / `faint` / `border` | warm-shifted greys | Same roles as v1, just re-hued to sit with the warm palette. |
| `ok` / `warn` / `info` / `accent` (danger) | `#15803D` / `#C2410C` / `#0369A1` / `#B91C1C` | Status semantics stay conventional (green/orange-red/blue/red) — only the *brand* color moved, not status meaning. `warn` was nudged more orange-red specifically to stay visually distinct from the new gold `primary`. |

**Rule of thumb baked into the palette:** `primary` never appears as a text or border color directly — always `primaryText` or `primaryDark` for that. Every `ui.tsx` primitive already follows this; if you add a new one, follow it too.

## Typography (`F` / `T`)

Two font families now, not one:
- **Plus Jakarta Sans** (`F.reg/semi/bold/xbold`) — all UI text, headings, body. Unchanged from v1.
- **IBM Plex Mono** (`F.mono/monoReg/monoBold`, new dependency `@expo-google-fonts/ibm-plex-mono`) — reserved *only* for data numerals: `T.metric` (KPI card big numbers), `T.timer` (live clock-in/visit timers), `FunnelChart`/`MiniBar` values. This is the system's one deliberate "signature" typographic move — it reads as a precision instrument rather than a marketing dashboard, and most competitors skip it entirely.

`T.display` (sans, `F.xbold`) is unchanged and stays reserved for hero/brand headlines (Login screen, splash) — it is a **different token** from `T.timer` (mono) even though both were previously the same style; don't reuse `T.display` for a live numeral again, or you'll pull in the wrong font.

`T.caption` and `T.metric` now bake in a default `color` (they didn't in v1, which meant callers had to remember to merge one in — an inconsistency the old audit flagged as a token gap).

## Spacing / Radius / Elevation

`SP` spacing scale unchanged. `R` (radius) tightened: `card 16→12`, `input 12→10`, `btn 12→10` — slightly more "engineered," less "consumer app bubble." `ELEV` shadow scale unchanged in shape, shadow color re-hued from cool `#0F172A` to warm `#211F1A` to match the palette.

## Component changes (`src/components/ui.tsx`)

New primitives, added specifically to consolidate duplicated logic found scattered across screens during the v2 pass:
- **`GeoValidBadge`** — the `ok ? green-checkmark : red-warning` pattern was reimplemented 3 different ways (`DashboardScreen`'s geo-fence badge, `VisitFlowScreen`'s geo-valid badge, `MerchantDetailScreen`'s plain, non-badge text). Now one component, used in all three plus `AttendanceScreen`/`AttendanceDetailScreen`.
- **`StickyFooter`** — the bottom action bar (`position:absolute`, card background, top border) was hand-copied identically in `MerchantDetailScreen` (CHECK IN) and `VisitFlowScreen` (CHECK OUT). Now one component.
- **`Divider`** — `ReportsScreen` was hand-rolling a 1px `View` for its fee-breakdown separator; formalized.
- **`IconButton`** — thin `Ionicons` wrapper with a consistent hit target; not yet adopted everywhere, available for new call sites.

Existing primitives (`Card`, `Btn`, `Chip`, `Badge`, `StatusBadge`, `KPICard`, `FunnelChart`, `MiniBar`, `ListRow`, etc.) kept their APIs — only their internal styling changed to the new tokens, plus the contrast fixes below. `KPICard` gained a 2.5px status-colored top border as a low-cost "at-a-glance" signal on top of its existing icon+color+label status row.

Removed: the `SEMANTIC` alias layer and `S`/`inputStyle` StyleSheet exports in `theme.ts` — both were dead code (zero imports anywhere in `src/`, confirmed by grep before deletion).

## Accessibility fixes made during the v2 pass

Switching the brand color from blue to gold surfaced several places that assumed "primary color = safe as text on white," which gold specifically isn't (~2.7:1, fails AA). Found via systematic `grep` for every `color: C.primary`/`backgroundColor: C.primary` in `src/`, not by hunting screen-by-screen:
- `dialog.tsx`'s non-destructive button had hardcoded white label text — now `onPrimary` (ink) on the gold fill.
- `ProfileScreen`'s role badge and avatar-initial text, `UsersScreen`'s "Atur Akses" link, `MerchantsScreen`'s assigned-agent row label — all were passing raw `primary` as a text color; switched to `primaryText`.
- `VisitsScreen`'s "Selesai" row label was passing `C.border` (a divider color, ~1.3:1) as its own text color — a pre-existing bug unrelated to the palette swap, found while auditing the same class of issue; fixed to `C.muted`.

## What was deliberately left alone

No new UI/animation dependencies beyond the one font package. No dark mode (still not requested). The role→tab IA, the KPI/exceptions/funnel dashboard structure, and all business logic in `useStore.ts`/`utils/kpi.ts` are untouched — see `UX_ARCHITECTURE.md`.
