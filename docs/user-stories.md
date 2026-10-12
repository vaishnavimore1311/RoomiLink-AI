# RoomiLink AI — User Stories Document

> **Comprehensive Agile User Stories with Acceptance Criteria & MoSCoW Prioritization**  
> *End-to-End User Journeys Across Discovery, Roommate Matching, Shared Living Operations, AI Intelligence, and Governance*

---

## 1. User Story Framework & Priority Legend

Each story follows the standard Agile user story structure:
> **As a** `[user role]`,  
> **I want** `[action / capability]`,  
> **So that** `[tangible business or personal benefit]`.

### Priority Classification
* **P0 (Must Have):** Critical MVP functionality without which the system cannot function.
* **P1 (Should Have):** Essential shared-living operational and proactive AI capabilities.
* **P2 (Nice to Have):** Advanced polish, deep simulation enhancements, and future conveniences.

---

## 2. Epics & User Stories Index

* **Epic 1:** Registration, Authentication & Profile Management (US-101 to US-105)
* **Epic 2:** Room & Property Discovery (US-201 to US-204)
* **Epic 3:** Roommate Compatibility & Matching (US-301 to US-304)
* **Epic 4:** Trust, Safety & Verification (US-401 to US-404)
* **Epic 5:** Communication & Notifications (US-501 to US-503)
* **Epic 6:** Household Management & Coordination (US-601 to US-604)
* **Epic 7:** Rent, Bills & Expense Splitting (US-701 to US-704)
* **Epic 8:** Chore Assignment & Contribution Tracking (US-801 to US-804)
* **Epic 9:** Digital Living Agreement Generation (US-901 to US-903)
* **Epic 10:** AI Conflict Prediction & Ongoing Household Intelligence (US-1001 to US-1004)
* **Epic 11:** Replacement Roommate Matching (US-1101 to US-1102)
* **Epic 12:** Platform Administration & Moderation (US-1201 to US-1203)

---

## 3. Epic 1: Registration, Authentication & Profile Management

### US-101: Account Registration
* **User Story:** As a prospective tenant or lister, I want to create a new account using my email and a secure password, so that I can access personalized housing and roommate services.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an unauthenticated visitor on the registration page,  
  * **When** they submit a valid email address and a password meeting security criteria (at least 8 characters, one number, one special character),  
  * **Then** the system securely hashes the password with bcrypt/PBKDF2, persists the user record in MySQL, generates an initial JWT session, and redirects to profile onboarding.
  * **When** the submitted email is already registered,  
  * **Then** the system presents an inline error: *"An account with this email already exists."*

### US-102: Secure Login & Token Refresh
* **User Story:** As a registered user, I want to log into my account and maintain an authenticated session, so that I don't have to re-enter credentials repeatedly while navigating the platform.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a registered user on the login screen,  
  * **When** valid email and password are submitted,  
  * **Then** the backend issues a short-lived Access Token (stored in memory/secure storage) and an HTTP-only Refresh Token cookie.
  * **Given** an expired access token during an API call,  
  * **When** the frontend interceptor calls `/api/v1/auth/refresh`,  
  * **Then** a new access token is seamlessly issued without user interruption.

### US-103: Comprehensive Lifestyle Profile Setup
* **User Story:** As a room seeker, I want to define my lifestyle preferences across sleep, cleanliness, guests, noise, diet, work routine, and pets, so that prospective roommates can understand my everyday habits.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an authenticated user on the onboarding page,  
  * **When** they fill out the 8 lifestyle dimensions (e.g., Sleep: Night Owl, Cleanliness: 4/5, Smoking: Non-smoker, Guests: Weekend only, Work: Hybrid),  
  * **Then** the data is validated and saved to the `RoommatePreference` database entity.
  * **Given** an existing profile,  
  * **When** the user updates their preferences in settings,  
  * **Then** future compatibility calculations reflect the updated preferences immediately.

### US-104: AI Consent Management & Data Sovereignty
* **User Story:** As a privacy-conscious user, I want to control whether the platform's AI models are allowed to analyze my lifestyle data, so that my personal information is protected.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a user in the privacy settings screen,  
  * **When** they view the *"AI Analysis Consent"* toggle,  
  * **Then** they see an explicit explanation stating what data is shared with the LLM API and for what purpose.
  * **When** the toggle is set to OFF,  
  * **Then** the backend disables `ai_consent_enabled` on the `User` entity, and all subsequent AI features use algorithmic heuristics and omit external LLM calls.

### US-105: Profile Avatar & Identity Upload
* **User Story:** As a user, I want to upload a profile picture and write a personal bio, so that potential roommates can see who I am and connect with confidence.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a user on the profile edit view,  
  * **When** they upload a JPG or PNG image under 5MB,  
  * **Then** the backend validates the file type, strips EXIF metadata, saves the file with a hashed filename, and updates `Profile.avatar_url`.

---

## 4. Epic 2: Room & Property Discovery

### US-201: Listing Creation by Property Listers
* **User Story:** As a property lister, I want to create property and room listings with detailed descriptions, pricing, photos, and house rules, so that I can attract suitable prospective tenants.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an authenticated user with the Property Lister role,  
  * **When** they submit property address, room type (private/shared), monthly rent, security deposit, availability date, and amenities,  
  * **Then** a new record is created in the `Property` and `Room` tables with status `available`.
  * **When** the lister uploads up to 8 room photographs,  
  * **Then** image previews display instantly, and files are securely stored and associated with the room.

### US-202: Multi-Criteria Room Search & Filtering
* **User Story:** As a room seeker, I want to filter room listings by location, budget, room type, and specific amenities, so that I can quickly narrow down accommodations that match my exact needs.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a seeker on the *"Find Rooms"* page,  
  * **When** they apply filters (e.g., City: Austin, Max Rent: $900, Private Room, Pet Friendly: Yes),  
  * **Then** the query returns all matching active rooms within 2 seconds.
  * **Given** no listings match the selected filters,  
  * **Then** the page displays a helpful empty state: *"No rooms found matching your criteria. Try widening your budget or filter options."*

### US-203: Property Detail Inspection & Commute Context
* **User Story:** As a room seeker, I want to view detailed property pages including verified status, room dimensions, house rules, and amenities, so that I can make an informed decision before contacting the host.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a seeker clicking on a room search card,  
  * **When** the property details page loads,  
  * **Then** it presents an interactive image gallery, rent and deposit breakdown, host verification badge, list of amenities, and written house rules.

### US-204: Saving Favorite Listings
* **User Story:** As a room seeker, I want to bookmark listings to a saved favorites list, so that I can compare rooms later without searching again.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a seeker viewing room cards,  
  * **When** they click the bookmark heart icon,  
  * **Then** the listing is added to their `Favorite` entity, and the icon state updates to active.
  * **Given** the user visits their saved favorites page,  
  * **Then** all bookmarked rooms are displayed with active pricing and availability status.

---

## 5. Epic 3: Roommate Compatibility & Matching

### US-301: Algorithmic Compatibility Score Calculation
* **User Story:** As a room seeker, I want to view a compatibility percentage score for each potential roommate, so that I can quickly identify the most suitable co-living partners.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** two registered users with completed lifestyle profiles,  
  * **When** a user browses the *"Find Roommates"* page,  
  * **Then** the system calculates a multi-attribute baseline score (0% to 100%) weighting sleep schedules, cleanliness, guest habits, noise tolerance, and work routines.
  * **When** a critical incompatibility exists (e.g., user is allergic to cats and candidate has a cat),  
  * **Then** the candidate is flagged with an incompatibility alert.

### US-302: Explainable Match Breakdown
* **User Story:** As a room seeker, I want to see plain-English explanations of why someone is a good or risky match, so that I don't have to blindly trust an opaque numerical score.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a seeker viewing a candidate's compatibility details,  
  * **When** they open the *"Match Analysis"* modal,  
  * **Then** the interface clearly separates **Strengths** (e.g., *"Both wake up before 7:30 AM; both prefer quiet study evenings"*) from **Potential Friction Points** (e.g., *"Candidate has guests over 3x/week while you prefer quiet weekends"*).

### US-303: Roommate Discovery Filters
* **User Story:** As a seeker, I want to filter potential roommates by college/company, budget range, and preferred move-in date, so that I only see candidates who fit my logistical reality.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a seeker on the Roommates directory,  
  * **When** they apply filters for target university, budget ceiling, and move-in timeline,  
  * **Then** candidates are filtered accurately and sorted by descending compatibility score.

### US-304: Interactive Living Simulation Scenario
* **User Story:** As a prospective roommate, I want to complete 3 interactive decision-making scenarios, so that my genuine behavioral habits can refine my matching score beyond static survey answers.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a user participating in the *"Living Simulation"* tool,  
  * **When** presented with domestic scenarios (e.g., unwashed kitchen pans, surprise guests, late bill reminder),  
  * **Then** their selected responses are analyzed to establish an empirical behavioral archetype (e.g., *"Collaborative Problem Solver"*, *"Direct Communicator"*).
  * **Then** their pairwise compatibility scores update to incorporate decision patterns.

---

## 6. Epic 4: Trust, Safety & Verification

### US-401: Document Verification Submission
* **User Story:** As a user, I want to submit my student ID, employment proof, or government ID for verification, so that I can earn a trust badge on my profile.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an authenticated user on the trust verification page,  
  * **When** they upload a photo of their ID document and submit it,  
  * **Then** a record is created in the `Verification` table with status `pending`, and an admin review task is dispatched.

### US-402: Verification Trust Badge Display
* **User Story:** As a seeker, I want to clearly see which users and property listings are verified, so that I can avoid rental scams and unvetted individuals.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a verified user or property lister,  
  * **When** their card or profile is rendered in search or chat,  
  * **Then** an emerald *"Verified Member"* badge with a checkmark is prominently displayed.
  * **When** an unverified user is viewed,  
  * **Then** no verified badge appears, and an advisory *"Identity Not Verified"* tag is shown.

### US-403: Reporting Suspicious Listings or Users
* **User Story:** As a user, I want to report a suspicious listing or abusive user with a description and category, so that platform administrators can take swift corrective action.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** any property details page or user profile,  
  * **When** the user clicks *"Report"*, selects a reason (e.g., *"Price too good to be true / Scam"*, *"Harassment"*, *"Inaccurate photos"*), and inputs comments,  
  * **Then** a report ticket is registered in the moderation queue and the user receives a confirmation modal.

### US-404: User Blocking
* **User Story:** As a user, I want to block another user, so that they can no longer view my profile or send me direct messages.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a user viewing an active conversation with another user,  
  * **When** they click *"Block User"* and confirm the modal,  
  * **Then** a block relationship is recorded; existing chat messages are hidden, and future message dispatch between both parties is prevented with HTTP 403.

---

## 7. Epic 5: Communication & Notifications

### US-501: Direct Chat Between Potential Roommates
* **User Story:** As a seeker, I want to exchange direct messages with potential roommates or landlords, so that we can discuss room viewings and living expectations safely on the platform.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** two verified or registered users,  
  * **When** one clicks *"Message"* on a candidate profile or room listing,  
  * **Then** a conversation thread is initiated.
  * **When** a text message is sent,  
  * **Then** it is stored in the `Message` table and appears in the recipient's thread within 1 second.

### US-502: Message Inbox & Unread Badges
* **User Story:** As a user, I want an inbox view displaying all my ongoing conversations with unread indicators, so that I never miss an important enquiry.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a user navigating to the Messages page,  
  * **When** the inbox loads,  
  * **Then** conversations are sorted by latest activity with avatars, last message snippet, and an unread badge count.

### US-503: In-App Household & System Notifications
* **User Story:** As a household member, I want to receive in-app notifications for overdue bills, assigned chores, and AI harmony alerts, so that I stay informed on household obligations.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** an action occurring in the household (e.g., new expense added, chore assigned, AI drift alert generated),  
  * **When** the recipient visits the platform,  
  * **Then** a notification icon in the top header displays the unread counter and opens a drop-down activity feed with direct deep links.

---

## 8. Epic 6: Household Management & Coordination

### US-601: Household Creation & Unique Invite Code
* **User Story:** As a tenant moving into a shared home, I want to create a new Household workspace and generate an invite code, so that my roommates can join our shared digital home.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an authenticated user who is not currently in an active household,  
  * **When** they click *"Create Household"*, enter the home address, household nickname, and rent allocation percentages,  
  * **Then** a new `Household` record is created with the creator assigned as `Household Admin`, and an 8-character unique alphanumeric invite code is generated.

### US-602: Joining an Existing Household via Code
* **User Story:** As a roommate, I want to enter an invitation code to join my roommates' household, so that I can access our shared expenses, chores, and agreements.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an invited user with an invite code,  
  * **When** they submit the code on the *"Join Household"* screen,  
  * **Then** the backend links their `user_id` to the `HouseholdMember` table, updates their status to `active`, and redirects them to the Household Dashboard.

### US-603: Shared Household Inventory Tracker
* **User Story:** As a household member, I want to maintain a checklist of communal household supplies with status indicators, so that we know when essentials need replenishing.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a household member viewing the *"Shared Inventory"* tab,  
  * **When** they change an item's status (e.g., Paper Towels: *"In Stock"* -> *"Low"*),  
  * **Then** the item highlights amber on all roommates' boards, and an option appears to log a purchase request.

### US-604: Move-Out Notice & Departure Workflow
* **User Story:** As a household member planning to leave, I want to initiate a formal move-out request, so that my roommates are notified, my pending debts are settled, and a replacement search can begin.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** an active household member,  
  * **When** they submit a move-out date and 30-day notice,  
  * **Then** a `MoveOut` entity is created, their chore rotation stops as of the departure date, and the household admin is prompted to launch Replacement Roommate Matching.

---

## 9. Epic 7: Rent, Bills & Expense Splitting

### US-701: Shared Expense Recording
* **User Story:** As a household member who paid for groceries or utilities, I want to log the expense and select who participates in the split, so that our shared ledger stays accurate.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a member on the Expenses page,  
  * **When** they input the title (e.g., *"Costco Household Supplies"*), amount ($60.00), category, payer, and choose equal split across 3 members,  
  * **Then** the system creates 1 `Expense` record and 2 `Payment` obligations of $20.00 each for the other roommates.

### US-702: Real-Time "Who Owes Whom" Debt Ledger
* **User Story:** As a household member, I want to view a simplified debt summary showing exactly who owes whom, so that we minimize confusing cross-payments.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a household with multiple logged expenses,  
  * **When** any member views the Expense Dashboard,  
  * **Then** the system runs debt simplification and displays concise balances (e.g., *"Sarah owes Alex $25.00"*, *"You are owed $50.00 in total"*).

### US-703: Manual Payment Settlement Confirmation
* **User Story:** As a member who repaid a roommate offline, I want to record a debt settlement, so that our outstanding balances are reduced to zero.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a member with an outstanding payment obligation,  
  * **When** they click *"Mark as Settled"*, enter payment notes (e.g., *"Paid via Venmo/Cash"*), and submit,  
  * **Then** the debt obligation is marked `settled`, and the overall balance sheet recalculates immediately.

### US-704: Recurring Household Bills & Rent Schedules
* **User Story:** As a household admin, I want to configure monthly recurring bills (rent, Wi-Fi, water) with assigned due dates, so that roommates receive advance reminders before deadlines.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a household admin on the Bills page,  
  * **When** they define a recurring bill (e.g., *"High-Speed Internet: $75, Due on the 1st of every month"*),  
  * **Then** the system automatically generates monthly payment tasks for all roommates 5 days before each due date.

---

## 10. Epic 8: Chore Assignment & Contribution Tracking

### US-801: Chore Board & Rotational Assignments
* **User Story:** As a household member, I want a visual chore schedule showing assigned tasks, frequency, and due dates, so that chores are divided transparently.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an active household,  
  * **When** viewing the Chores tab,  
  * **Then** tasks (e.g., Kitchen Cleaning, Trash & Recycling, Bathroom Deep Clean) are displayed in a weekly grid with assigned member avatars and due dates.
  * **When** a chore cycle ends,  
  * **Then** the rotational scheduler automatically shifts each assignment to the next member in the roster.

### US-802: Chore Completion Check-Off
* **User Story:** As a household member, I want to mark my assigned chore as completed with a single click, so that my roommates know it was finished on time.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an assigned chore due today,  
  * **When** the assigned member clicks the completion checkbox,  
  * **Then** `Chore.is_completed` becomes `true`, `completed_at` is timestamped, and effort points are credited to their contribution score.

### US-803: Contribution Calculator (Visible & Invisible Labor)
* **User Story:** As a household member, I want a fair-share contribution report that credits both chores and invisible coordination tasks (restocking supplies, managing bills), so that household effort is appreciated fairly.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** the Contribution tab on the dashboard,  
  * **When** members view the Fair-Share Meter,  
  * **Then** it aggregates direct chores, inventory restocking, and expense coordination into a percentage workload score per member.
  * **When** a member has completed >60% of total household tasks,  
  * **Then** the system highlights the imbalance gently with a suggestion to rotate upcoming tasks.

### US-804: Logging Unplanned Domestic Errands
* **User Story:** As a household member who conducted a major shared errand (e.g., waiting 3 hours for the plumber), I want to log this effort, so that it is accounted for in our contribution score.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a member on the Chores view,  
  * **When** they click *"Log Unplanned Errand"*, input a description and estimated duration,  
  * **Then** an effort record is added to the `Contribution` table and factored into the weekly balance.

---

## 11. Epic 9: Digital Living Agreement Generation

### US-901: AI-Generated Personalized Living Agreement
* **User Story:** As household members moving in together, we want the AI to draft a customized living agreement based on our known lifestyle habits and potential friction points, so that house rules are established upfront.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** a household where all members have completed profiles and provided AI consent,  
  * **When** the admin triggers *"Generate Living Agreement"*,  
  * **Then** the AI Service passes the members' profiles, predicted friction points, and constraints to the LLM API, returning a structured agreement covering:
    1. Quiet hours and work-from-home etiquette
    2. Guest and romantic partner overnight limits
    3. Cleaning frequency and sink cleanliness standards
    4. Shared vs. private pantry and refrigerator rules
    5. Notice periods for moving out
  * **Then** the agreement is saved as `Agreement` (Version 1.0) and presented for member review.

### US-902: Agreement Customization & Editing
* **User Story:** As a household member, I want to edit clauses or suggest revisions to the drafted living agreement, so that the rules fit our mutual consensus.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a drafted agreement,  
  * **When** any member edits a specific clause (e.g., changes quiet hours from 10 PM to 11 PM) and saves,  
  * **Then** the agreement status updates to *"Pending Re-Approval"*, with a visual diff showing the modified text.

### US-903: Digital Agreement Signing & Consensus
* **User Story:** As a household member, I want to digitally sign our living agreement, so that all flatmates formally commit to the agreed-upon standards.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a finalized living agreement,  
  * **When** all active members toggle *"I Agree to These Standards"*,  
  * **Then** `Agreement.is_active` becomes `true`, and an agreement badge appears on the Household Dashboard with a download link.

---

## 12. Epic 10: AI Conflict Prediction & Ongoing Household Intelligence

### US-1001: Future Conflict Predictor (Pre-Move-In)
* **User Story:** As two prospective roommates considering co-living, we want an AI prediction highlighting where we might experience friction, so that we can discuss boundaries before committing to a lease.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** two users evaluating each other,  
  * **When** either user clicks *"Predict Future Conflicts"*,  
  * **Then** the system queries both preference profiles and invokes the AI Conflict Service.
  * **Then** the UI returns the top 3 conflict risk areas (e.g., *"High risk: Sleep schedule mismatch — Sarah is an early sleeper (10 PM) while Jason works late nights until 2 AM"*), along with 3 tailored conversational prompts to discuss prior to signing.

### US-1002: Behavior Drift Detector (Post-Move-In)
* **User Story:** As household members who have lived together for several months, we want the system to detect if our actual routines have diverged from our initial agreement, so that we can realign before resentment develops.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a household active for at least 60 days,  
  * **When** the monthly AI Drift analysis executes,  
  * **Then** it compares baseline agreement parameters against empirical 60-day logs (late chore completions, unconfirmed expenses, shift changes).
  * **When** significant drift is identified (e.g., cleaning delays increased by 40%),  
  * **Then** the system posts a private, diplomatic household insight: *"Household Routine Check-In: Chore completion schedules have shifted recently. Consider reviewing the chore schedule during your next house meeting."*

### US-1003: Household Change Impact Engine
* **User Story:** As a household member considering a lifestyle change (e.g., adopting a dog, working night shifts, partner staying over 4 nights/week), I want to simulate how this will impact my flatmates, so that I can make considerate, proactive choices.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** an active household member in the *"Change Impact"* tool,  
  * **When** they select a proposed change and enter parameters (e.g., *"Adopting a medium-sized puppy"*),  
  * **Then** the AI Change Impact Engine simulates the impact across all household members, generating:
    1. Overall household friction rating (Low / Moderate / High)
    2. Breakdown by impacted domain (Noise, Shared Living Room Space, Cleaning Requirements, Cost)
    3. Three practical mitigation solutions (e.g., *"Designate pet-free zones in shared living areas; establish a shared pet mess agreement"*).

### US-1004: Unspoken Problem Detector (Micro-Issue Trend Analysis)
* **User Story:** As a household member bothered by a recurring minor annoyance, I want to log a confidential note without starting a confrontation, so that the AI can detect if it's becoming a pattern and suggest a neutral group conversation.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a household member experiencing micro-friction (e.g., sink left full of dishes for 2 consecutive days),  
  * **When** they log a confidential micro-issue entry with date and category,  
  * **Then** the entry is saved privately without alerting specific names.
  * **When** the system detects 3 or more related entries within a 14-day window across the household,  
  * **Then** the AI surface presents an anonymous, constructive discussion prompt on the shared dashboard.

---

## 13. Epic 11: Replacement Roommate Matching

### US-1101: Whole-Household Candidate Scoring
* **User Story:** As remaining household members searching for a replacement flatmate, we want candidate applicants scored against our entire household's combined profile, so that the new person fits our existing collective dynamic.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a departing member and an active replacement search,  
  * **When** applicants apply for the vacant room,  
  * **Then** the Replacement Matching Engine scores each candidate against the **composite household profile** rather than any individual member.
  * **Then** candidates are displayed on the admin board ranked by whole-house harmony score.

### US-1102: Candidate Impact Analysis & Fit Report
* **User Story:** As a household admin, I want to view a concise fit report for each replacement candidate, so that our flat can review prospective roommates together.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** a candidate application on the replacement dashboard,  
  * **When** the admin opens the fit report,  
  * **Then** the UI details how the applicant aligns with current house quiet hours, cleaning standards, and chore rotations, with clear recommendations.

---

## 14. Epic 12: Platform Administration & Governance

### US-1201: ID Verification Review Queue
* **User Story:** As a system administrator, I want to review submitted identity verification documents in a moderation queue, so that I can grant or decline verified badges accurately.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** an administrator logged into `/admin/verifications`,  
  * **When** they view pending document submissions,  
  * **Then** they can inspect the uploaded ID image, verify user details, and click *"Approve"* or *"Reject"* with reason notes.
  * **When** approved,  
  * **Then** the user's `is_verified` flag is set to `true`, and an automated notification is sent to the user.

### US-1202: Flagged Listing & Abuse Moderation
* **User Story:** As an administrator, I want to review reported listings and flagged accounts, so that fraudulent or abusive actors are promptly removed from the platform.
* **Priority:** `P0 (Must Have)`
* **Acceptance Criteria:**
  * **Given** user reports in the moderation queue,  
  * **When** an admin inspects a flagged listing,  
  * **Then** they can take direct actions: *"Dismiss Report"*, *"Deactivate Listing"*, or *"Suspend User Account"*.
  * **When** an account is suspended,  
  * **Then** their active sessions are revoked and future logins are blocked with HTTP 403.

### US-1203: System Telemetry & AI Performance Monitoring
* **User Story:** As an administrator, I want to monitor API latency, AI fallback trigger rates, and error logs, so that platform performance and external LLM costs remain healthy.
* **Priority:** `P1 (Should Have)`
* **Acceptance Criteria:**
  * **Given** an administrator on the system metrics page,  
  * **When** they view the telemetry panel,  
  * **Then** they can observe the total AI requests dispatched, average latency (target <10s), fallback trigger percentages, and recent error traces.
