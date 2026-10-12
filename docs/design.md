# RoomiLink AI — UI/UX Design Specification

> **Comprehensive Design System, Component Guidelines, Screen Wireframes & UX Workflows**  
> *Modern, Calming, Trustworthy, and Beginner-Friendly Design for Co-Living Harmony*

---

## 1. Design Vision & Philosophy

### 1.1 Aesthetic Direction
Living with other people is deeply personal, financially sensitive, and emotionally charged. The visual identity of **RoomiLink AI** is crafted to feel:
* **Calming & Reassuring:** Neutral, soft slate backgrounds with friendly, high-contrast typography eliminate visual stress.
* **Trustworthy & Secure:** Sophisticated indigo and teal accents convey reliability and safety, vital for room listings and financial ledgers.
* **Modern & Clean:** Ample whitespace, subtle rounded corners (8px–12px), clean card elevation shadows, and zero visual clutter.
* **Explainable & Transparent:** Data and AI insights are communicated through visual progress rings, color-coded badges, and clear, human-readable callouts.

### 1.2 Core UX Principles
1. **Clarity Over Complexity:** Users should never wonder what an AI score means or who owes money to whom. Every metric is paired with plain-language context.
2. **Actionable in Three Clicks:** Core workflows (logging a shared expense, checking off a chore, viewing a match reason) are accessible within 3 clicks from any dashboard.
3. **Graceful State Feedback:** Every screen explicitly supports loading skeletons, friendly empty states, non-blocking error toasts, and rewarding success states.
4. **Universal Accessibility:** Compliant with WCAG 2.1 Level AA standards across desktop, tablet, and mobile devices.

---

## 2. Design System & Tokens

### 2.1 Color Palette
The color system utilizes a tailored HSL palette delivering high contrast, visual warmth, and accessible text readability.

```text
[Primary Indigo]      #4F46E5  (Brand, Primary CTAs, Active States)
[Secondary Teal]      #0D9488  (Trust, Verified Badges, Household Ops)
[Warm Amber]          #F59E0B  (Warnings, Due Soon, Moderate Friction)
[Success Emerald]     #10B981  (Payments Settled, Chores Completed, High Match)
[Danger Rose]         #EF4444  (Overdue Bills, High Friction, Incompatibility)
[Surface Light]       #F8FAFC  (Page Background)
[Surface Card]        #FFFFFF  (Elevated Cards & Modals)
[Text Primary]        #0F172A  (Headers & Primary Copy, 14.2:1 contrast)
[Text Muted]          #64748B  (Subtitles, Captions, Timestamps)
[Border Subtle]       #E2E8F0  (Card Borders & Dividers)
```

| Token Name | Hex Code | Purpose & Usage | Contrast Ratio on Light |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#4F46E5` | Primary brand buttons, active tab indicators, links | 7.1:1 (AA / AAA) |
| `--color-primary-hover`| `#4338CA` | Hover state for primary buttons | 8.6:1 (AAA) |
| `--color-secondary` | `#0D9488` | Trust badges, verification highlights, success CTAs | 4.8:1 (AA) |
| `--color-accent` | `#F59E0B` | Attention tags, medium compatibility warnings | 4.6:1 (AA) |
| `--color-success` | `#10B981` | Completed chores, verified status, debt settled | 4.5:1 (AA) |
| `--color-danger` | `#EF4444` | High conflict alert, overdue payments, delete actions | 4.6:1 (AA) |
| `--bg-base` | `#F8FAFC` | Primary application canvas background | N/A |
| `--bg-surface` | `#FFFFFF` | Elevated cards, sidebars, modals | N/A |
| `--text-main` | `#0F172A` | Primary headlines, card titles, critical text | 14.2:1 (AAA) |
| `--text-muted` | `#64748B` | Secondary descriptions, timestamps, metadata | 5.3:1 (AA) |
| `--border-color` | `#E2E8F0` | Structural card borders, dividers, table rows | N/A |

### 2.2 Typography Hierarchy
The typography system uses **Inter** (or system sans-serif fallback) for crisp, legible UI elements, paired with **Outfit** for engaging headings.

| Level | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display 1** | Outfit / Inter | 36px (2.25rem) | 700 Bold | 1.2 | Landing page hero headlines |
| **Heading 1** | Outfit / Inter | 28px (1.75rem) | 700 Bold | 1.3 | Major page headers (Dashboard, Find Rooms) |
| **Heading 2** | Outfit / Inter | 22px (1.375rem) | 600 Semi-bold | 1.35 | Section headers, modal titles |
| **Heading 3** | Inter | 18px (1.125rem) | 600 Semi-bold | 1.4 | Card headers, table section titles |
| **Body Large** | Inter | 16px (1.0rem) | 400 Regular | 1.5 | Primary body copy, article text, form inputs |
| **Body Small** | Inter | 14px (0.875rem) | 400 / 500 Medium | 1.45 | Secondary text, table data, list descriptions |
| **Caption / Badge** | Inter | 12px (0.75rem) | 600 Semi-bold | 1.4 | Badges, tags, timestamps, helper text |

### 2.3 Spacing & Grid System
The layout adheres strictly to an **8-point spatial grid** (`4px`, `8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
* **Container Width:** Max 1280px, centered with dynamic auto margins.
* **Grid Breakpoints:**
  * Mobile: `< 640px` (Single column, full width cards, bottom sheet drawers)
  * Tablet: `640px – 1023px` (Two columns, collapsable sidebar navigation)
  * Desktop: `≥ 1024px` (Three or four columns, persistent sidebar, multi-panel layouts)

### 2.4 Elevation & Shadows
* **Elevation 1 (Card Default):** `0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)`
* **Elevation 2 (Card Hover / Dropdown):** `0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)`
* **Elevation 3 (Modal / Floating Drawer):** `0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.04)`

---

## 3. Reusable UI Component Specifications

### 3.1 Buttons
* **Primary Button:** `#4F46E5` background, `#FFFFFF` text, 8px border-radius, 10px 20px padding. Hover: `#4338CA`, active: scale 0.98. Focus: 2px ring with 2px offset.
* **Secondary Button:** `#FFFFFF` background, `#0F172A` text, 1px solid `#E2E8F0`. Hover: `#F8FAFC`.
* **Danger Button:** `#EF4444` background, `#FFFFFF` text. Used for critical confirmations (e.g., Leave Household, Delete Listing).
* **Ghost / Icon Button:** Transparent background, `#64748B` icon. Hover: `#F1F5F9`.

### 3.2 Form Inputs & Sliders
* **Text Input:** 1px solid `#CBD5E1`, 8px radius, 12px 16px padding. Active focus ring in brand indigo. Includes clear error helper text below.
* **Lifestyle Slider:** Dual or single thumb range slider for budget and lifestyle habit scales (1 to 5) with discrete tick marks and value labels.
* **Radio Toggle Cards:** Selectable card options (e.g., Sleep Schedule: Early Bird / Flexible / Night Owl) with active borders and checkmark indicators.

### 3.3 Badges & Indicators
* **Verified Badge:** Emerald pill (`#ECFDF5` background, `#065F46` text) with verified check icon.
* **Compatibility Badge:** Color-coded dynamic pill:
  * 85%–100%: Emerald (`#10B981`) — *"Excellent Match"*
  * 70%–84%: Teal (`#0D9488`) — *"Good Match"*
  * 50%–69%: Amber (`#F59E0B`) — *"Moderate Compatibility"*
  * < 50%: Rose (`#EF4444`) — *"Potential Friction"*
* **Overdue Badge:** Rose pill (`#FEF2F2` background, `#991B1B` text) with warning icon.

---

## 4. Navigation Architecture & Global Layout

### 4.1 Global Desktop Header
```text
+---------------------------------------------------------------------------------------------------------+
| [Logo: RoomiLink AI]   Find Rooms   Find Roommates   Household Hub   About    [Search Bar]  (🔔) [User ▼] |
+---------------------------------------------------------------------------------------------------------+
```
* **Persistent Navbar:** Clean 64px height bar containing logo, primary routing links, search field, unread notification bell, and user avatar profile dropdown.
* **Sub-Navigation for Household:** When within a household workspace, a dedicated secondary sidebar or sticky sub-tab bar displays:
  `[Overview]  [Expenses & Bills]  [Chores & Labor]  [Shared Inventory]  [Living Agreement]  [AI Insights]`

### 4.2 Mobile Responsive Navigation
* **Top Header:** Logo, notification icon, and hamburger menu icon.
* **Mobile Bottom Bar (Fixed 60px):** 4 primary navigation items:
  1. Rooms (Search Icon)
  2. Roommates (Users Icon)
  3. Household (Home Icon)
  4. Messages (Chat Icon)

---

## 5. Detailed Screen Layouts & Wireframes

### 5.1 Registration & Lifestyle Onboarding Wizard
```text
+-----------------------------------------------------------------------------------------+
|                                    RoomiLink AI                                         |
|                           Step 2 of 3: Your Everyday Habits                             |
|                                                                                         |
|   Sleep Routine                   Cleanliness Standard              Guest Frequency    |
|   ( ) Early Bird (Before 10 PM)   [1] [2] [3] [*4*] [5]             ( ) Rarely / None   |
|   (*) Flexible (11 PM - 12 AM)    Daily quick tidy up, deep         (*) Weekends only   |
|   ( ) Night Owl (After 1 AM)      clean bathrooms weekly.           ( ) Frequent guests |
|                                                                                         |
|   Noise Tolerance                 Pet Policy                        Work Routine        |
|   (*) Moderate (Quiet after 11)   ( ) No pets / Allergic            ( ) On-site daily   |
|   ( ) Very quiet study space      (*) Pet friendly                  (*) Hybrid / Remote |
|                                                                                         |
|   [x] Enable AI Analysis for Explainable Compatibility Matching & Household Harmony     |
|                                                                                         |
|   [ Back ]                                                   [ Save & Continue -> ]     |
+-----------------------------------------------------------------------------------------+
```
* **UX Highlights:** Clean multi-step wizard, interactive radio cards, discrete slider bars, and a clear, prominent AI consent checkbox with an expandable privacy explanation.

---

### 5.2 Main Personal Dashboard
```text
+-----------------------------------------------------------------------------------------+
| Good morning, Vaishnavi!                                             [ Create Household ] |
| Current Home: 402 Oak Street (3 Roommates)                           [ Invite Code: 8X7K] |
+-----------------------------------------------------------------------------------------+
|  [ Your Balance ]              [ Chores This Week ]             [ Household Harmony ]    |
|  You are owed: $45.00          Kitchen Deep Clean: Due Wed      Status: Healthy (92%)   |
|  Next Rent: $650 (Due Nov 1)   Trash & Recycling: Completed     No active friction alerts|
+-----------------------------------------------------------------------------------------+
|  Top Compatible Roommate Matches                   Recent Activity Feed                  |
|  +---------------------------------------------+   +-----------------------------------+|
|  | [Avatar] Jason Chen - 91% Compatibility     |   | Sarah added "Groceries: $54.00"   ||
|  | Early riser * Quiet study habits * Budget ok|   | Alex completed "Clean Bathroom"   ||
|  | [View Match Breakdown]  [Send Message]      |   | Rent reminder scheduled for Nov 1 ||
|  +---------------------------------------------+   +-----------------------------------+|
+-----------------------------------------------------------------------------------------+
```

---

### 5.3 "Find Rooms" Discovery Page
* **Layout Structure:** Two-column responsive view (Filters Drawer on Left: 280px; Property Cards Grid on Right: 3 columns).
* **Filter Controls:** City search bar, Min/Max rent sliders, Room type checkboxes (Private, Shared, Ensuite), Furnished toggle, Pet Policy toggle, Availability calendar picker.
* **Room Card Structure:**
  * High-resolution photo carousel with price overlay badge (`$850/mo`).
  * Neighborhood & distance to campus/business district.
  * Room specifications (`Private Room * 1 Shared Bath * Furnished`).
  * Lister trust badge (`Verified Host`).
  * Action buttons: Favorite (heart icon) and *"View Details"*.

---

### 5.4 "Find Roommates" & Compatibility Breakdown Page
* **Roommate Grid:** Cards featuring profile photo, name, age, college/workplace, budget range, and prominent **Radial Compatibility Score Ring**.
* **Explainable Compatibility Score Modal:**
```text
+-----------------------------------------------------------------------------------------+
| Compatibility Analysis: Vaishnavi & Jason Chen                           [ Close (X) ]  |
|                                                                                         |
|                           ((  88% Match  ))                                             |
|                     High Compatibility Expected                                         |
|                                                                                         |
|  Key Strengths (+):                                                                     |
|  * Aligned Sleep Schedule: Both sleep between 11 PM and midnight.                       |
|  * Cleanliness Harmony: Both rated cleaning standard 4/5 (weekly scheduled deep clean). |
|  * Quiet Work Environment: Both work hybrid remote schedules and value quiet mornings. |
|                                                                                         |
|  Potential Friction Points (!):                                                         |
|  * Weekend Social Habits: Jason occasionally hosts dinner guests on Saturdays; you     |
|    prefer quiet weekends.                                                               |
|                                                                                         |
|  Recommended Pre-Move-In Question:                                                      |
|  "How would you prefer to coordinate weekend dinner guests and shared kitchen times?"  |
|                                                                                         |
|  [ Message Jason ]                                          [ Send Roommate Invite ]    |
+-----------------------------------------------------------------------------------------+
```

---

### 5.5 Property Details Page
* **Header Gallery:** 5-image mosaic with *"View all 12 photos"* modal trigger.
* **Key Specifications Bar:** Rent, Deposit, Move-in Date, Lease Duration, Room Dimensions.
* **Host Verification Box:** Host avatar, member since date, verified ID badge, response rate (98%), response time (< 1 hr).
* **Amenities Grid:** Clean icons for High-Speed Wi-Fi, In-Unit Washer/Dryer, Central AC, Dishwasher, Parking Spot.
* **House Rules & Expectations:** Explicit rules on quiet hours, smoking (outside only), and pets.

---

### 5.6 Household Dashboard & Operational Pages

#### Expenses & Bills View (`/household/expenses`)
* **Balance Ribbon:** Displays summary cards: *"Total Spent This Month"*, *"You Owe"*, *"You Are Owed"*.
* **Simplified Debt Matrix:** *"Who Owes Whom"* card with instant *"Settle Up"* buttons.
* **Add Expense Modal:** Fields for title, amount, payer dropdown, split mechanism (Equal, Exact Amounts, Percentages), receipt attachment, and category pills (Groceries, Utilities, Cleaning, Rent).
* **Expense Ledger Table:** Chronological record of transactions with date, title, payer, split count, and settlement status.

#### Chores & Labor Board (`/household/chores`)
* **Weekly Rotation Board:** Visual kanban cards for *To-Do*, *In-Progress*, and *Done*.
* **Fair-Share Contribution Meter:** Visual comparative horizontal bar chart showing effort points per roommate, highlighting both visible chores and invisible organizational labor.
* **Chore Completion Action:** Direct check-off button triggering satisfying micro-animation and soundless state update.

---

### 5.7 AI Insights & Living Agreement Pages

#### Living Agreement Viewer (`/household/agreement`)
* **Agreement Summary Banner:** Active Version (e.g., v1.1), last updated date, and sign-off status pills for each flatmate (`[✓ Vaishnavi] [✓ Sarah] [✓ Jason]`).
* **Clause-by-Clause Accordion Cards:**
  1. *Quiet Hours & Rest Standards* (11:00 PM – 7:30 AM on weekdays)
  2. *Overnight Guest Policy* (Max 2 nights consecutive, advance notice in chat)
  3. *Kitchen & Common Area Cleaning* (Dishes washed within 12 hours)
  4. *Shared Supplies & Financial Reimbursement* (Receipt logged within 48 hours)
  5. *Departure & Move-Out Protocol* (30-day notice with replacement cooperation)
* **Actions:** Propose Amendment button, Print/Export PDF button.

#### AI Household Insights View (`/household/insights`)
* **Behavior Drift Alert Card:**
  * Icon: Amber radar icon.
  * Title: *"Routine Variance Observed (Past 60 Days)"*.
  * Description: *"Chore turnaround times have increased from 1 day to 3.5 days over the last 3 weeks. Kitchen cleanliness ratings have dipped slightly."*
  * Recommendation: *"Suggested Action: Realign responsibilities or adjust chore frequency during Sunday dinner."*
* **Change Impact Simulator Tool:**
  * Interactive input: Roommate selects a proposed change (e.g., *"Adopting a Golden Retriever puppy"* or *"Switching to 3rd-shift hospital night work"*).
  * AI Result Box: Displays predicted impact on sleep, noise, common space availability, and utility bills, with 3 custom mitigations.

---

### 5.8 Admin Dashboard
* **Metrics Cards:** Total Active Users, Verified Listings, Pending ID Verifications, Open Reports.
* **Verification Queue:** Table with user avatar, name, document thumbnail preview, submission date, and inline *Approve* / *Reject* buttons.
* **Reported Listings Queue:** Flagged item title, reporting user, category (scam, fake photos, harassment), and admin action buttons (*Dismiss*, *Take Down*, *Suspend User*).

---

## 6. UI State Management Guidelines

Every asynchronous view in the frontend strictly implements four distinct states:

```text
[1. Loading State]   ──► Shimmering Skeleton Cards (exact dimension matching)
[2. Empty State]     ──► Warm Illustration + Descriptive Reason + Clear Action CTA
[3. Error State]     ──► Inline Callout or Toast + Error Explanation + Retry Button
[4. Success State]   ──► Non-blocking Emerald Toast Notification or Modal Confirmation
```

### 6.1 Loading States
* **Skeleton Loaders:** Content containers display shimmering skeleton placeholders matching the exact geometry of final room cards, user avatars, and expense tables.
* **AI Analysis Spinner:** During LLM operations (typically 3–8 seconds), the interface displays a dedicated AI Thinking Card with an animated pulsed ring and calming message: *"Analyzing household dynamics and calculating compatibility..."*

### 6.2 Empty States
* **No Search Results:** *"No rooms found matching your current filters. Try removing the pet filter or expanding your budget range."* + `[ Reset All Filters ]` button.
* **No Expenses Logged:** Illustration of a clean ledger + *"No shared expenses yet. When someone buys groceries or pays Wi-Fi, add it here to keep things fair."* + `[ Add First Expense ]` button.
* **No Chores Assigned:** *"Your chore board is clear! Create your first weekly task rotation."* + `[ Setup Chores ]` button.

### 6.3 Error States
* **Network & API Failures:** Floating toast on top right: *"Unable to sync expenses with the server. Please check your connection and retry."*
* **AI Failure Fallback State:** Friendly amber alert: *"AI insight engine currently busy. Showing standard rule-based recommendations."*

### 6.4 Success States
* **Expense Added:** *"Grocery expense ($45.00) recorded and split equally among 3 members."*
* **Chore Completed:** Micro-confetti burst animation around the checkmark, followed by immediate progress ring update.

---

## 7. Accessibility & Usability (WCAG 2.1 AA Compliance)

1. **Contrast Ratios:** All text elements exceed the **4.5:1** contrast threshold against their respective backgrounds (primary headers achieve 14.2:1).
2. **Keyboard Navigability:** All interactive components (buttons, tabs, modals, sliders, dropdowns) are accessible via `Tab`, `Shift+Tab`, `Enter`, and `Escape` keys with visible focus rings (`2px solid #4F46E5`).
3. **Screen Reader Optimization:** Form fields feature explicit `<label>` tags and `aria-describedby` error references. Modals trap focus and specify `role="dialog"` and `aria-modal="true"`.
4. **Color Independence:** Statuses are never conveyed solely through color; icons and text labels accompany every color badge (e.g., green checkmark for settled, amber warning triangle for pending, red exclamation mark for overdue).
5. **Touch Targets:** All clickable mobile elements maintain a minimum hit area of **44x44 pixels** to prevent accidental mis-taps.
