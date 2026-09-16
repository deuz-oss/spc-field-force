# Visual QA — Before / After

Method: ran `expo start --web` on port 8081, logged in via each demo account, and captured the actual rendered app in Chrome before and after the redesign (not just code inspection). Screens covered: Login, Dashboard (Field Agent + Super Admin), Merchant list, Merchant detail, Visit flow, Reports, Users, Profile (Field Agent + Super Admin).

## Login
- **Before:** full-bleed blue mobile card stretched to full desktop width; all 5 demo credentials listed as plain buttons below the fold.
- **After:** two-pane layout on wide screens (brand/trust copy left, form right); demo accounts collapsed behind a "Lingkungan Demo" disclosure so the primary sign-in flow is uncluttered.
- **Verified interaction:** disclosure toggle opens/closes and demo buttons still autofill correctly.

## Dashboard — Field Agent
- **Before:** identical structure to management (team funnel, org merchant snapshot, all-agents performance list) filtered down to one agent — mostly empty/irrelevant sections.
- **After:** Clock card, 2 personal KPI cards with target/status, "Merchant Prioritas" (assigned merchants, cold-start first, tap-through to detail), personal funnel only. No team-wide data.

## Dashboard — Super Admin / management
- **Before:** stacked 2-column `StatCard`s with bare numbers, funnel as a wrapped row of colored badges, no target/variance shown next to any number, agent status conveyed by badge color+text only.
- **After:** 5-card KPI strip (`KPICard`) each with target, status icon+label+color, computed live from the same store data; a "Perlu Perhatian" exceptions block that only appears when agents are actually below target; funnel rendered as proportional horizontal bars (`FunnelChart`); per-agent rows now show a `StatusBadge` (icon + color + text).
- **Functional bug found and fixed while reviewing this screen's map dependency:** `LeafletMap` used `react-native-webview`, which has no Web implementation — every map on Web rendered literally as *"React Native WebView does not support this platform"*. Fixed by rendering a native `<iframe srcDoc>` on `Platform.OS === 'web'` and keeping `WebView` for native. Verified: merchant pin and attendance route maps now render correctly in the browser.

## Merchant list
- **Before:** single-column card list even at desktop width (~1280px viewport observed), agent/team assignment shown as small 11px text at the bottom.
- **After:** 2-column responsive grid on desktop (`isDesktop` from `useBreakpoint`), `ListRow` with a left color bar keyed to assignment status, row count shown above the list.

## Merchant detail
- **Before:** map broken (see above); CHECK IN button same visual weight as manager tools below it.
- **After:** map fixed; for Field Agent, CHECK IN / continue-visit is now a sticky full-width bottom bar that stays visible while scrolling through merchant info, history, etc.

## Visit flow
- **Before:** a stale seed visit (checked in 23 Aug, never checked out) rendered a **572:34:33** hour counter — nonsensical and gave no path to resolve it. CHECK OUT and "Simpan Draf" buttons had equal visual weight. Checkout had no confirmation when geo was valid (only when invalid).
- **After:** sessions open >12h show a "Sesi lama — perlu ditinjau" status badge instead of a giant clock; CHECK OUT is a sticky green bottom bar, visually dominant over the now-secondary "Simpan Draf" outline button; checkout always asks for confirmation (previously only on invalid geo) since it permanently locks the record.

## Attendance
- **Before:** if a session was active, the Attendance tab only showed a passive text banner telling the user to go manage it from Dashboard — a dead end.
- **After:** a live session card (timer + geo-fence status + CHECK OUT) mirrors the Dashboard clock card directly on the Attendance tab.

## Reports
- **Before:** all export buttons solid/primary, same weight as the fee-estimation card; no indication of how much data an export contains before downloading.
- **After:** export buttons are outline/secondary; each shows a row-count line for the currently selected period before the user commits to downloading.

## Profile
- **Before:** every role saw "Kunjungan / Jam Kerja / Jarak / Merchant Saya" — for Super Admin/Client/Ops Manager these always read 0, implying a broken account.
- **After:** only `field_agent`/`team_lead` see the personal-activity KPI block; other roles see a "Ringkasan Akses" card (team/user/merchant counts in their scope) instead.

## App shell (all screens)
- **Before:** double header — a Stack header ("Main") stacked directly above the Tab header, wasting ~120px vertically on every screen.
- **After:** single header, now carrying a role badge; desktop/tablet (≥900px) additionally get a persistent left rail with user identity, replacing the bottom tab bar only at that width — mobile bottom tabs are untouched.

## Mobile verification (Android emulator, real device pixels)

The Chrome window in the initial QA pass could not be resized below ~1280px (`resize_window` reported success but `window.innerWidth` never changed), so the small-mobile breakpoint was first verified by code review only. This was closed out with an actual Android emulator (`emulator-5554`, Android 14) already running on the dev machine, loaded via Expo Go over the same Metro dev server:

- **Login:** correct single-column mobile layout, brand hero, collapsed demo disclosure — matches the design intent for narrow widths.
- **Dashboard (Field Agent):** bottom tab bar (not the desktop rail) renders as expected; personal KPI cards, Merchant Prioritas list all correct.
- **Merchant Detail:** map renders correctly (native `WebView` path, unaffected by the web `<iframe>` fix); sticky CHECK IN bar and visit history both correct.
- **Bug found and fixed via this device pass:** the header's role badge (`ROLE_LABEL[role]`, e.g. "Field Agent (merangkap Incubation Agent)") had no line-wrap guard, so on a real ~360–411dp-wide phone it wrapped to two lines and made the header uneven — invisible on the wide desktop window used for the rest of this QA pass. Fixed in `App.tsx` with `numberOfLines={1}`, `ellipsizeMode="tail"`, and a `maxWidth: 170` cap on the badge container.

Tablet width (700–900dp) remains unverified by screenshot (only mobile <400dp and desktop ≥1280dp were checked); low risk since that range only affects `gridCols`/`contentMaxWidth`, not a structural layout switch.
