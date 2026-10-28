## Summary of Changes

This Pull Request implements the Bright Enterprise Theme and layout fixes across the Admin Center:
- **Closes #90**: `feat(admin-theme): Implement Bright Enterprise Theme across Admin Center layout and dashboards`
- **Closes #91**: `fix(admin-layout): Eliminate dual vertical scrollbar and horizontal table overflow in Admin layout`

---

### 1. Bright Enterprise Theme Overhaul (Issue #90)
- **`frontend/app/admin/layout.tsx`**:
  - Replaced the dark theme with crisp enterprise styling: Canvas is `bg-slate-50`, sidebar is clean `bg-white border-r border-slate-200/80`, active navigation pills use `bg-indigo-600 text-white shadow-sm`, and high-contrast typography (`text-slate-900`, `text-slate-600`).
  - Brightened the Administrator Access Guard modal with clean white styling and pastel security badges.
- **`frontend/app/admin/page.tsx`**:
  - Converted KPI metric cards (Total Community, Pune City Inventory, Active Paid Subs, MRR) to white cards with subtle borders (`border-slate-200/80`) and bold status highlights.
  - Redesigned the Pune City Inventory overview banner with a soft gradient (`from-indigo-50/80 via-white to-purple-50/60`), localized Pune neighborhood benchmark chips, and action buttons.
  - Converted quick operation cards (Room Management, Subscriptions, User Governance) to white cards with soft shadows.
- **`frontend/app/admin/rooms/page.tsx`**:
  - Restyled filter bars, search inputs, and Pune city toggles with bright enterprise styling.
  - Table upgraded with `bg-slate-50` headers, slate borders, and high-contrast pastel badges for featured and availability states.
- **`frontend/app/admin/users/page.tsx`**:
  - User Directory table restyled with bright enterprise theme, clear role badges (`admin`, `lister`, `seeker`), and in-cell role select controls.
- **`frontend/app/admin/subscriptions/page.tsx`**:
  - Subscriptions ledger, metric cards, and complimentary VIP override form updated to white enterprise cards with clear form inputs.
- **`frontend/app/admin/rooms/new/page.tsx`**:
  - Room publication form restyled with bright inputs, clean section dividers, and light theme photo uploader (`theme="light"`).

### 2. Dual Scrollbar & Overflow Elimination (Issue #91)
- In `frontend/app/admin/layout.tsx`: Outer container set to `h-screen w-screen overflow-hidden` and main canvas set to `flex-1 h-full overflow-y-auto min-w-0`, preventing nested window scrollbars.
- In all Admin table views: Wrapped tables in `<div className="w-full overflow-x-auto">` to contain wide tables cleanly within containers without horizontal viewport expansion.
- Verified TypeScript compilation clean (`npx tsc --noEmit` exited 0).
