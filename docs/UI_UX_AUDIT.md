# SPC Field Force — UI/UX Audit

Scope: Expo/React Native app (Android/iOS/Web), 5 roles (Super Admin, Ops Manager/`admin`, Team Lead, Field Agent, Client). This audit was produced by reading every screen in `src/screens`, the store (`src/store/useStore.ts`), the KPI engine (`src/utils/kpi.ts`), and by running the app in-browser at each role to observe actual rendered behavior (not just code).

## Cross-cutting problems (affect every screen)

1. **One layout for three platforms.** Every screen is a fixed-width mobile column (`padding:16, gap:12`, single-column `ScrollView`). On web/desktop this stretches to full width with no max-width, no grid, no multi-column composition — large screens show the same stacked cards just spread thin. Violates brief §15/§16.
2. **One dashboard for five roles.** `DashboardScreen.tsx` renders the same structure (Clock card → stat grid → geo-fence card → merchant snapshot → funnel → performance list) for Super Admin, Ops Manager, Team Lead and Field Agent, only filtering the *data* by scope. A Field Agent and a Super Admin see the same "Merchant Baru CS 0 · Reg 0 · Act 0" card, the same funnel badges — appropriate for management, noise for an agent trying to see "what do I do next". Violates brief §5.
3. **Double header bar.** `App.tsx` renders a Stack header ("Main") stacked directly on top of the Tab header ("Dashboard"/"Merchant"/...) — two solid blue bars with duplicated/near-duplicate text before any content. Costs ~120px of vertical space on every screen, worse on short phones.
4. **No KPI system, only numbers.** `StatCard`/`MiniBar` show a bare value or a value vs. a hardcoded percentage bar. There is no consistent way to see *target, variance, trend* together (brief §8). The one place targets exist (`TARGETS` in `utils/kpi.ts`) they're buried in a paragraph of body text ("Target RFP: kerja 8 jam/hari · on-site ≥6 jam/hari · geo-fence ≥99%…") instead of being attached to each metric.
5. **Color is the only status signal in places.** `Badge` relies on color + text label (OK — text is present), but some list borders (`AttendanceScreen` item border, `VisitsScreen` item border) use *only* a border-color change (`C.warn` vs `C.border`) to mean "in progress", with no icon/label duplicating that signal for a colorblind user glancing at a dense list.
6. **`LeafletMap` is broken on Web** (functional bug found while inspecting Merchant Detail, not just cosmetic): `react-native-webview` has no web implementation, so every map — merchant pin, attendance route — renders literally as the text *"React Native WebView does not support this platform."* Since Web is an explicit target platform (`npm run web` exists, PWA-style deployment implied), this silently breaks route visualization and merchant geo-pin display for Ops Manager, Team Lead, Client and Super Admin whenever they review a visit or attendance record on desktop.
7. **Generic visual language.** Flat white cards, one radius (16px), one shadow, one accent blue on every surface — functional but reads as a template, not a distinct "enterprise field-ops" product. No typographic personality (single weight ladder: 400/600/700/800 of one font), no data visualization anywhere despite KPI-heavy content.

## Per-screen audit

### Login (`LoginScreen.tsx`)
- **Problem:** Solid full-bleed blue with a floating white card is fine, but the "demo accounts" block dumps all 5 role credentials as plain outline buttons below the fold — reads as a dev tool, not a client-demoable product. No indication this is a demo/offline environment vs. production.
- **User goal:** Get into the right role fast (internal ops staff) *or* evaluate the product (during a client demo).
- **Primary action:** "Masuk" (sign in).
- **Hierarchy:** brand → credentials → (collapsed) demo shortcuts.
- **Risk:** None safety-critical; but demo credentials in a plain list undermines "commercial-grade" perception per brief §21.
- **Redesign:** Keep single-column mobile layout; on wide viewports move to a two-pane layout (brand/value copy left, form right). Collapse demo accounts behind a labeled "Demo Environment" disclosure so the primary flow is just username/password.

### Dashboard (`DashboardScreen.tsx`)
- **Problem:** See cross-cutting #2. Additionally the KPI compliance bars (`MiniBar`) are hidden behind a tap-to-expand per agent, but for a Team Lead with 2 agents that's the *only* view of team health — should be visible without extra taps for small teams. Merchant/Attendance/Visit numbers are three separate un-related stat cards with no link to the funnel below them.
- **User goal (mgmt):** "How is my team doing right now, and who needs attention?" **User goal (agent):** "What do I need to do today?"
- **Primary action:** Mgmt: drill into an underperforming agent. Agent: Clock in / go to next merchant.
- **Hierarchy:** Mgmt needs KPI-strip → exceptions → funnel → team list, in that order (currently: clock card first, buried). Agent needs Clock status + next merchant, nothing else above the fold.
- **Risk:** An agent could mistake team-wide funnel numbers for their own performance (both rendered identically).
- **Redesign:** Split into two real layouts sharing data hooks: `ManagementDashboard` (KPI strip with target/variance/trend, exceptions list, funnel chart, team performance table) and `FieldAgentDashboard` (attendance status hero, assigned-merchant-today list, personal funnel, compact history). See `docs/UX_ARCHITECTURE.md`.

### Merchant list (`MerchantsScreen.tsx`)
- **Problem:** Functionally solid (search + status chips + unassigned filter) but list rows bury the most decision-relevant fact — *is this merchant mine, and what's next* — behind small 11px muted text at the bottom of the card.
- **User goal:** Find "my next merchant to visit" or "unassigned merchants to triage" quickly.
- **Primary action:** Open merchant → Check-in (agent) / Assign (manager).
- **Hierarchy:** name+status must dominate (already does); agent+tier+date are secondary (currently competing at similar weight).
- **Risk:** On web, the list stays a single narrow column even at 1600px — huge wasted space, no way to scan more than ~5 merchants without scrolling.
- **Redesign:** `ListRow` component with clearer two-line secondary hierarchy; responsive multi-column card grid (web ≥900px) or a compact table (web ≥1200px) while keeping the card list on mobile.

### Merchant detail (`MerchantDetailScreen.tsx`)
- **Problem:** Matches brief's target hierarchy reasonably well already (identity → map → CTA → management → history), but the CHECK IN button is visually identical in weight to the "Ubah Status"/"Assign" cards below it — no visual dominance. The map is broken on web (cross-cutting #6).
- **User goal (agent):** Check in as fast as possible. **User goal (manager):** Assign/reassign, verify progress.
- **Primary action:** CHECK IN (agent) — must be unmissable, sticky if needed.
- **Risk:** Manager-only "Assign" chips list every active agent as a flat list with no search — unusable once an org has 30+ agents.
- **Redesign:** Elevate CHECK IN to a full-width, high-contrast sticky action for agents; keep manager tools below in a clearly secondary card; fix map.

### Merchant form / Import (`MerchantFormScreen.tsx`, `ImportScreen.tsx`)
- **Problem:** Standard forms, no major hierarchy issues. Import screen's CSV format hint is good but the "assign to agent" step (an important decision) is visually identical in weight to the "unduh template" convenience action.
- **Redesign:** Light touch only — inherit the refreshed `Field`/`Input`/`Btn` primitives; no structural change needed (preserves logic per brief §22/§23).

### Visit flow (`VisitFlowScreen.tsx`)
- **Problem:** Good bones already (timer, geo badge, progressive sections). Two issues: (1) a stale open visit (seed data 23 Aug) renders a **572-hour** timer with no affordance to force-checkout or flag as stale — realistic field failure mode (phone died mid-visit) with no recovery path. (2) CHECK OUT and "Simpan Draf" buttons have equal visual weight — checkout (the completing, important action) should dominate.
- **User goal:** Capture required info with one hand, standing up, then check out without losing data.
- **Primary action:** CHECK OUT.
- **Risk:** Accidental checkout from an unrelated visit is prevented by role/ownership checks (good) — but there's no confirmation step for checkout itself when geo is valid (only when geo is invalid). A misclick ends the visit permanently.
- **Redesign:** Sticky bottom action bar for CHECK OUT while scrolling; explicit "required" marker already exists via `*` — keep; add a lightweight confirm on checkout even when geo-valid; visually flag sessions open >12h as "Perlu ditinjau" instead of an absurd hour counter.

### Visit history (`VisitsScreen.tsx`)
- **Problem:** Functional; status communicated by border color + badge (badge carries the text, acceptable). Minor: local unused `Muted` re-implementation duplicates the shared component instead of importing it.
- **Redesign:** Cosmetic alignment with new `ListRow`; fix the duplicate-component code smell while touching the file.

### Attendance + detail (`AttendanceScreen.tsx`, `AttendanceDetailScreen.tsx`)
- **Problem:** History list is fine; "current state" (clocked in/out) actually lives on the Dashboard's `ClockCard`, which is disconnected from the Attendance tab — a user tapping "Absensi" expecting to see their live session sees only a passive banner telling them to go back to Dashboard.
- **Redesign:** Per brief §11, treat Attendance as the home of live state too — surface a compact live-session header on the Attendance tab itself (read-only mirror of the dashboard clock card, same store state) so the tab isn't a dead end. Detail screen's map needs the same web fix as merchant detail.

### Reports (`ReportsScreen.tsx`)
- **Problem:** Three export cards + a billing estimate card, all equal visual weight — CSV export (frequent, low-stakes) and fee estimation (sensitive, commercial) shouldn't look the same. No preview of what's in the export before download (brief §12 asks for summary/preview).
- **Redesign:** Add a compact summary line (row count / date range) above each export button; keep exports as secondary/outline actions rather than solid primary buttons so they don't visually compete with real workflow CTAs elsewhere in the app; keep billing card as-is structurally (already visually separated by role-gating) but tone down to avoid implying it's a click-to-bill action.

### User management (`UsersScreen.tsx`)
- **Problem:** Solid CRUD list; "Reset Password" and "Atur Akses" are both plain text links at equal weight — reset-password is destructive-ish (invalidates current credential) and should be visually distinguished (already uses `C.accent` red — acceptable, keep).
- **Redesign:** Light touch — inherit refreshed primitives only.

### Profile (`ProfileScreen.tsx`)
- **Problem:** Shows "Kunjungan / Jam Kerja / Jarak / Merchant Saya" for *every* role, including Super Admin and Client who never do field work — these always read "0" and add no value, actively suggesting the account is inactive/broken.
- **Redesign:** Only render the personal-activity block for roles that do field work (`field_agent`, `team_lead`); Super Admin/Client/Ops Manager get an account/org info card instead.

## Role-based IA decision (brief §5/§6)

Kept the existing tab-count-per-role split (it's already role-aware, unlike the dashboard body) but re-labeled intent and adjusted composition:

| Role | Tabs (unchanged set, redesigned content) | Feel |
|---|---|---|
| Super Admin | Dashboard, Merchant, Laporan, Pengguna, Profil | Command center |
| Ops Manager / Team Lead | Dashboard, Merchant, Laporan, Profil | Operations console |
| Client | Dashboard, Merchant, Laporan, Profil (read-only affordances) | Monitoring portal |
| Field Agent | Dashboard, Merchant, Kunjungan, Absensi, Profil | Focused field assistant |

The navigation *set* was already correct; the redesign work is in making each screen's content match the role, not in reshuffling tabs (a bottom-tab rewrite would be disruptive for a working app with no evidence the current IA confuses users — brief §23 "don't rewrite recklessly").

On web/tablet widths (≥900px), the bottom tab bar is supplemented with a persistent left rail using the same items — bottom tabs stay for muscle-memory on mobile, rail avoids wasting the header's horizontal space on desktop.
