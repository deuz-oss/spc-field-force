# UI/UX Audit — v2 ("Field Ledger") status

This audit was originally written against the pre-`7d54290` CRUD-styled app and used to drive the v1 "Trust Blue" redesign. This revision closes it out against what actually shipped in v2 — every item below is either **Fixed**, **Superseded** (the underlying decision changed in v2, so the original complaint no longer applies), or **Open** (still true, intentionally out of scope for this pass — see `Remaining recommendations` in the final report).

## Navigation & shell

- ~~No role-aware navigation; all roles saw the same tab set~~ — **Fixed in v1**, unchanged in v2 (role→tab mapping preserved, see `UX_ARCHITECTURE.md`).
- ~~No desktop layout; bottom tabs stretched full-width on wide screens~~ — **Fixed in v1** (232px labeled rail at ≥900dp).
- **Tablet range (700–899dp) got the same bottom-tab treatment as a phone, wasting available width** — flagged in v1's audit but never actually fixed (v1 shipped `isTablet` in `useBreakpoint()` but `App.tsx` never consumed it). **Fixed in v2**: new 76px icon-only compact rail for this range, distinct from both the phone bottom-tabs and the full desktop rail.
- ~~Rail active-state used a flat blue alpha-blend background, low visual distinction~~ — **Fixed in v2**: active item now gets a 3px gold left-accent bar + subtle tint, a clearer and more premium signal than the v1 treatment.
- ~~Login screen brand pane still showed leftover internal copy "Quotation Option 3"~~ — flagged in v1's audit, **never actually fixed in v1** (confirmed still present in code before this pass). **Fixed in v2.**
- ~~Header/chrome color was flat blue, disconnected from the dark rail~~ — **Fixed in v2**: all stack/tab headers now use `C.railBg` (ink), visually unified with the rail instead of a separate brand color.

## Design system / tokens

- ~~No formal token file; colors/spacing hardcoded per screen~~ — **Fixed in v1** (`src/theme.ts`), unchanged structure in v2.
- ~~Generic blue-SaaS palette, indistinguishable from countless dashboard templates~~ — **the reason v2 exists.** Replaced with the warm-paper/ink/gold "Field Ledger" identity — see `DESIGN_SYSTEM.md`.
- ~~`T.caption`/`T.metric` tokens didn't bake in a default color, forcing every call site to remember to merge one~~ — **Fixed in v2.**
- ~~No distinct typographic treatment for data/numerals vs. body text — KPI values, timers, and table figures used the same sans font as everything else~~ — **Fixed in v2**: new `IBM Plex Mono` tabular-numeral treatment (`T.metric`, `T.timer`, `FunnelChart`/`MiniBar` values).
- ~~Dead exports in `theme.ts` (`SEMANTIC`, `S`, `inputStyle`) with zero call sites~~ — **Fixed in v2** (deleted, confirmed zero imports before removal).

## Component-level inconsistencies

- ~~Geo-fence/geo-valid "ok vs. exception" indicator reimplemented 3 different ways across `DashboardScreen`, `VisitFlowScreen`, and `MerchantDetailScreen` (the last as plain, non-badge text)~~ — **Fixed in v2**: consolidated into one `GeoValidBadge` component, used consistently across `DashboardScreen`, `VisitFlowScreen`, `MerchantDetailScreen`, `AttendanceScreen`, `AttendanceDetailScreen`. Also upgrades `MerchantDetailScreen`'s visit-history rows from plain text to an actual icon+color+label badge.
- ~~Sticky bottom action-bar footer hand-copied identically in `MerchantDetailScreen` and `VisitFlowScreen`~~ — **Fixed in v2**: extracted to `StickyFooter`.
- ~~`DashboardScreen` had a local `SortChip` reimplementation of the shared `Chip` component, including a hardcoded `'#fff'` text-color bug~~ — **Fixed in v2**: deleted, replaced with 3 direct `Chip` usages.
- ~~`VisitFlowScreen`'s live timer hardcoded its own `{fontSize:28, fontWeight:'900'}` style instead of reusing the shared display/timer token the way `DashboardScreen`'s `ClockCard` did~~ — **Fixed in v2**: both now use the shared `T.timer` token.
- ~~`ReportsScreen` had 3 copy-pasted near-identical export-card blocks~~ — **Fixed in v2**: consolidated into one local `ExportCard` component.
- ~~`ReportsScreen` hand-rolled a 1px divider `View`~~ — **Fixed in v2**: formalized as `Divider` in `ui.tsx`.
- ~~`FieldAgentDashboard`'s `ScrollView` was missing the `maxWidth`/`alignSelf:'center'` desktop-centering that the management dashboard had, so it stretched full-width inconsistently on wide screens~~ — **Fixed in v2** (a real layout bug, not just cosmetic).
- ~~Dead imports: `Linking` in `VisitFlowScreen`, `Input`/`Field` in `MerchantDetailScreen`, `Alert` in `ReportsScreen`, `StatusBadge` in `AttendanceScreen` (post-`GeoValidBadge` migration)~~ — **Fixed in v2**, confirmed via grep.

## Accessibility

- ~~No documented contrast validation for any color pairing~~ — **Fixed in v2**: every token pairing that changed was manually contrast-checked (relative luminance / WCAG ratio) before shipping, documented in `DESIGN_SYSTEM.md`'s accessibility section.
- **New risk introduced and then fixed by v2 itself**: switching the brand color to gold broke every place that assumed "primary color is safe as text on white" (true for the old blue, false for gold at ~2.7:1). Found via systematic grep sweeps rather than screen-by-screen reading, and fixed in: `Chip`, `Btn` (outline variant), `StatCard`/`MiniBar` defaults, `SectionHeader`/`ErrorState` links, `dialog.tsx`'s confirm button, `App.tsx`'s icon-on-badge spots, `LoginScreen`'s brand icon, `ProfileScreen`'s role badge + avatar initial, `UsersScreen`'s "Atur Akses" link, `MerchantsScreen`'s assigned-agent label. Final sweep confirmed zero remaining raw-gold-as-text/icon-on-fill instances.
- ~~`VisitsScreen`'s "Selesai" status label used `C.border` (a divider color) as its own text color, ~1.3:1 contrast~~ — pre-existing bug, unrelated to either palette; **found and fixed during the v2 pass.**
- **Open**: a broader sweep of `fontWeight:'600'/'700'` overrides applied to text that already has a custom `fontFamily` set (RN silently ignores `fontWeight` in that case, since the custom Google Fonts have no same-family weight variants) was fixed everywhere touched directly in this pass (`DashboardScreen`, `ReportsScreen`) but **not swept mechanically across every untouched screen** — e.g. `UsersScreen.tsx` still has a couple of instances. Deliberately deferred; see final report's remaining-recommendations section.

## Scope note

Business logic, the Zustand store, Supabase schema/RLS, and KPI calculation logic (`utils/kpi.ts`) were never in scope for either the v1 or v2 pass and remain untouched.
