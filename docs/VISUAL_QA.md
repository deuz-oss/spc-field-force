# Visual QA — v2 ("Field Ledger") pass

This replaces the v1 QA log. Scope was set explicitly in the v2 plan: a rigorous pass (both web and native, multiple roles, multiple viewport tiers) on the highest-traffic screens, plus a lighter pass (typecheck + at least one screenshot) on the rest — called out here rather than silently claiming exhaustive coverage.

## Method

- **Web**: `mcp__claude-in-chrome__*` against the Expo web build served by Metro at `localhost:8081`. Standard viewport plus a `javascript_tool`-injected fixed-size `<iframe>` to approximate a ~390px mobile width (see limitation below).
- **Native**: `adb` screenshots on a physical Android device (`RRCX302HB6K`) via `C:\Users\user\SFA-emu\android-sdk\platform-tools\adb.exe`, relaunching the app (`am force-stop` + `monkey`) and waiting for the Metro JS bundle to finish rebuilding before capturing.
- **Static**: `npx tsc --noEmit` after every single file edit throughout the whole pass — stayed clean the entire time.

## Rigorous pass (web + native, multiple roles)

| Screen | Roles checked | Result |
|---|---|---|
| Login | — | "Quotation Option 3" copy removed confirmed; ink brand pane with gold badge/icon renders correctly; demo-account buttons no longer leak plaintext password; gold primary button has correct ink text |
| Dashboard (management) | Ops Manager | Gold "Urut Kunjungan" active sort chip; KPI cards show new colored top-border signal; funnel chart values render in mono |
| Dashboard (field agent) | Field Agent (Budi) | Gold CLOCK IN button correct ink text; `ClockCard` timer renders in mono; geo-fence badge renders as `GeoValidBadge` |
| Merchant detail | Field Agent | "Geo valid" now a real green icon+label badge (was plain text pre-v2); `StickyFooter` CHECK IN bar renders correctly |
| Reports | Super Admin | Consolidated `ExportCard` renders identically across all 3 export types; fee-estimate total renders in bronze bold with `Divider` |
| Profile | Super Admin | Avatar initial renders in ink-on-gold (post-fix); role badge renders in bronze text |
| App shell / nav | all | Ink header + ink rail unified chrome confirmed on both web and native; desktop rail active state shows gold left-accent bar; native bottom-tab bar shows gold active label |

Native-device checks specifically targeted the two riskiest changes in this pass — a new font asset (IBM Plex Mono) and a new responsive nav tier — since a font/layout regression is exactly the kind of thing that can look fine on web and break silently on-device. Both confirmed correct on the physical device.

## Lighter pass (typecheck + at least one screenshot)

Merchants list, Visit flow, Visits list, Attendance list/detail, Live Map, Users — each typechecked clean and screenshotted at least once; not cross-checked across every role × every viewport combination.

## Known limitation: iframe mobile-viewport simulation

Injecting a fixed-size `<iframe>` to approximate a 390px mobile viewport correctly reproduced scrollable-content layout (no horizontal overflow, correct KPI card column count) but did **not** show the bottom tab bar within the iframe's visible bounds, even after adjusting iframe height. This was confirmed to be a test-harness artifact — the iframe's own document doesn't inherit the same `100vh`-constrained root layout a real browser tab gets — not a real app bug, by cross-checking the same screen on the physical Android device, where the bottom tab bar rendered correctly with the gold active state.

**Takeaway for future QA on this app**: the iframe technique is fine for checking overflow/column-count/spacing at a given width, but is not authoritative for anything involving fixed/sticky-positioned elements pinned to a viewport edge (tab bars, `StickyFooter`). Use a real device or an actual resized browser window for those.

## Validation

`npx tsc --noEmit` — clean after every phase and on the final full-repo check. No new native modules were added in this pass (IBM Plex Mono is a pure JS/asset font package, loaded via the existing `expo-font` `useFonts` call), so no EAS rebuild was required to test it — confirmed by loading it on the physical device with only a Metro reload.

## Not covered in this pass

iOS was not tested on-device or in a simulator (no iOS device available in this environment) — web + Android were the two targets verified live. See the final report's remaining-recommendations section.
