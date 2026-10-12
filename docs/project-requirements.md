# RoomiLink AI — Project Requirements Document (PRD)

> **Beyond Finding a Room, Building Compatible Shared Living**  
> *An intelligent full-stack platform for room search, roommate compatibility matching, and ongoing household lifecycle management.*

---

## 1. Project Overview & Problem Statement

### 1.1 Executive Summary
**RoomiLink AI** is an intelligent, full-stack platform engineered to bridge the critical disconnect in modern shared living. While existing platforms treat co-living as a one-time transactional search that ends once a lease is signed, RoomiLink AI treats shared living as an **ongoing, dynamic interpersonal relationship**. It assists students, young working professionals, and urban relocators not only in discovering verified accommodations and compatible roommates, but also in proactively maintaining household harmony, fair resource allocation, and conflict-free coexistence throughout the co-living lifecycle.

### 1.2 Problem Statement
Finding and sustaining shared living arrangements in modern urban environments presents deep structural challenges:
1. **Superficial Matching & Lifestyle Mismatches:** Existing listing portals match occupants purely on static budget and geographic constraints, disregarding sleep schedules, cleanliness standards, social habits, noise tolerance, and remote work routines.
2. **Behavioral Drift Over Time:** Roommates who appear perfectly compatible during an initial 10-minute viewing frequently experience lifestyle drift after 2 to 6 months (e.g., academic exam stress, new romantic partners, shifting work shifts), creating unanticipated household tension.
3. **The Ripple Effect of Individual Decisions:** In shared apartments, one person’s decision (e.g., adopting a pet, hosting frequent overnight guests, taking a night shift job) impacts the sleep, financial burden, and privacy of all co-habitants.
4. **Unspoken Issues & Silent Resentment:** Roommates routinely avoid direct confrontation over minor recurring grievances (unwashed dishes, delayed utility repayments, noisy late-night calls). These unaddressed micro-frictions compound until they erupt into major interpersonal conflicts or lease terminations.
5. **Invisible Household Labor Imbalance:** Household maintenance involves both visible tasks (taking out trash, cleaning floors) and invisible mental/administrative labor (restocking shared supplies, paying utility bills on time, coordinating landlord communications). When this work is distributed unequally without visibility, resentment inevitably accumulates.
6. **Rental Fraud & Unverified Listings:** Rental scams, fake images, misleading amenities, and unvetted strangers create high safety and financial risks for students and relocators in unfamiliar cities.
7. **Disruptive Roommate Replacements:** When an occupant moves out mid-lease, finding a replacement is typically rushed and chaotic, frequently introducing someone incompatible with the remaining household members.

### 1.3 Proposed Solution & Core Vision
RoomiLink AI addresses these challenges through a unified **Search + Match + Verify + Live Together + AI Household Intelligence** paradigm. By combining a modern web experience with explainable AI agents, the platform delivers:
* **Holistic Search & Compatibility:** Multidimensional matching encompassing budgets, locations, commute routines, and lifestyle habits.
* **Trust & Verification Layer:** Identity verification badges, community trust metrics, and automated flagging of suspicious listings.
* **Operational Shared Living Hub:** Centralized digital tools for split rent, itemized shared utilities, rotating chore schedules, inventory tracking, and living agreements.
* **Continuous AI Household Intelligence:** Non-invasive, consent-driven AI features that model household dynamics, detect behavioral drift, quantify invisible labor, simulate decision impacts, and draft conflict-mitigating agreements.

---

## 2. Project Objectives

1. **Intelligent Lifestyle-Driven Matching:** Deliver roommate compatibility rankings based on holistic lifestyle compatibility matrices, commute times, and budget constraints, backed by clear, human-readable explanations.
2. **Proactive Trust & Safety Assurance:** Enforce listing integrity via multi-point verification flags (email, phone, student/government ID) and automated reporting mechanisms for suspicious activities.
3. **Comprehensive Household Operations:** Streamline day-to-day shared living by providing unified interfaces for rent allocation, bill splitting, chore rotation, shared household inventory, and move-out tracking.
4. **Early Conflict & Drift Detection:** Detect behavioral divergence and recurring unspoken micro-frictions before they escalate into disruptive domestic disputes.
5. **Predictive Household Simulation:** Provide simulated impact assessments for proposed lifestyle changes (e.g., pets, work schedule alterations, frequent visitors) before commitments are made.
6. **Household-Aware Replacement Matching:** Match incoming replacement roommates against the collective profile of the entire surviving household rather than isolated individual profiles.
7. **Transparent, Explainable, Consent-First AI:** Ensure every AI recommendation presents explicit rationale in plain English, runs strictly upon explicit user consent, and allows full user data sovereignty.

---

## 3. Project Scope

The RoomiLink AI platform spans the complete shared-living lifecycle across four primary phases:

| Stage | Functional Scope | Primary User Value |
| :--- | :--- | :--- |
| **1. Find** | Account registration, profile setup, lifestyle preferences, room & property listings, geolocation/filter search, favorites. | Discover vetted, budget-aligned, commute-friendly accommodation. |
| **2. Connect** | Roommate compatibility scoring, explainable match breakdown, verification badges, direct messaging, user reporting/blocking. | Identify and communicate with safe, lifestyle-compatible prospective roommates. |
| **3. Live Together** | Household creation, member onboarding, rent splitting, expense ledger, recurring bill tracking, chore scheduler, shared inventory, digital living agreements, move-out workflow. | Eliminate operational friction, financial ambiguity, and chore arguments in the home. |
| **4. AI Intelligence Layer** | Living Simulation, Future Conflict Predictor, Living Agreement Generator, Behavior Drift Detector, Change Impact Engine, Unspoken Problem Detector, Contribution Calculator, Household Replacement Matching. | Provide ongoing, data-backed household harmony and proactive problem resolution. |

### 3.1 In-Scope Features (Phase 1 MVP)
* Full user authentication, role management, and lifestyle profile configuration.
* Property and room listing creation with photo uploads, amenities, rules, and pricing.
* Multi-factor search with filtering by rent, deposit, room type, location, and amenities.
* Algorithmic roommate compatibility scoring with explainable strengths and risk dimensions.
* Secure in-app messaging system and notification alerts.
* Trust and safety suite: document/identity verification workflow and suspicious listing report pipeline.
* Household management portal: shared rent records, expense splitting, chore assignment, inventory checklist, and digital agreement repository.
* Eight specialized AI household intelligence capabilities powered by an LLM API.
* Dedicated administrative moderation dashboard.

### 3.2 Out-of-Scope Features (Deferred to Future Iterations)
* Native mobile applications (iOS/Android) — the initial release is an optimized, responsive Next.js web application.
* Real-world financial payment gateway integration (e.g., Stripe, PayPal, UPI) — v1 records, splits, calculates balances, and tracks manual settlement confirmations without handling banking transactions.
* Legally binding formal lease contract execution and government legal tenancy filings.
* Biometric authentication and automated police criminal background checks.
* Integrated real-time video calling and IoT smart-home hardware integrations.
* Multi-language internationalization (initial release is English-only).

---

## 4. Target Users & Stakeholder Roles

### 4.1 Target Audience
* **University & College Students:** Seeking budget-friendly rooms near campus with study-compatible peers, transparent utility splits, and fair chore arrangements.
* **Young Working Professionals:** Seeking commute-optimized accommodations with quiet working environments, aligned sleep patterns, and verified roommates.
* **New-to-City Relocators:** Requiring trustworthy, safe housing options with verified hosts and compatible roommates in unfamiliar cities.
* **Property Listers & Landlords:** Individual owners or subletters aiming to attract reliable, vetted tenants and manage listings effectively.

### 4.2 User Roles & Permissions Matrix

```
+---------------------------------------------------------------------------------+
|                                 Role Hierarchy                                  |
|                                                                                 |
|  [Guest / Visitor]                                                              |
|          │                                                                      |
|          ▼                                                                      |
|  [Seeker (Registered User)] ───────► [Property Lister]                          |
|          │                                                                      |
|          ▼                                                                      |
|  [Household Member] ───────────────► [Household Admin]                          |
|                                                                                 |
|  [System Administrator] (Global Governance & Moderation)                        |
+---------------------------------------------------------------------------------+
```

| Role | Permissions & Responsibilities |
| :--- | :--- |
| **Guest / Visitor** | Browse public landing page, view public listings (limited detail), view platform guides; cannot chat, favorite, or access household tools. |
| **Seeker** | Register/login, manage personal profile & lifestyle preferences, search & filter rooms/roommates, view explainable match scores, favorite listings, initiate chats, submit verification documents, report listings. |
| **Property Lister** | Create, update, and manage property and room listings; upload photos; set rules/pricing; receive and reply to tenant enquiries. |
| **Household Member** | Join household via invite code; log shared expenses and bills; record payment settlements; mark chores as completed; log voluntary micro-grievances; view AI household insights; vote on living agreement revisions. |
| **Household Admin** | Create household; invite or remove members; configure rent split ratios; manage shared inventory; trigger digital agreement drafts; initiate move-out and replacement roommate workflows. |
| **System Administrator** | Access back-office admin dashboard; approve or reject verification requests; review flagged/reported listings and users; suspend accounts; monitor system health and AI logs. |

---

## 5. Functional Requirements

### 5.1 Module 1: User & Authentication
* **FR-1.1:** The system shall allow users to register using unique email and password credentials with secure hashing.
* **FR-1.2:** The system shall support secure session management via JSON Web Tokens (JWT) with HTTP-only cookies and role-based access control.
* **FR-1.3:** The system shall provide comprehensive user profile management (name, age, gender, occupation/student status, bio, city, avatar).
* **FR-1.4:** The system shall capture structured lifestyle preferences across critical dimensions:
  * Sleep Schedule (Early bird, Night owl, Flexible)
  * Cleanliness & Tidiness (Scale 1–5; frequency of cleaning)
  * Smoking & Drinking Habits (Non-smoker, Outside only, Social, Frequent)
  * Social & Guest Policies (Rare guests, Weekend guests, Frequent overnight guests)
  * Noise Tolerance & Quiet Hours (Strict quiet, Moderate, High tolerance)
  * Dietary Habits (Vegetarian, Vegan, Non-veg, Halal, Kosher)
  * Work / Study Routines (Remote WFH, Hybrid, On-site, Night shifts)
  * Pet Ownership & Allergies (Has pets, Pet-friendly, Allergic, No pets allowed)
* **FR-1.5:** The system shall allow users to toggle explicit consent flags for AI-powered profile and household analysis.

### 5.2 Module 2: Property & Room Listings
* **FR-2.1:** Property listers shall be able to create, edit, and deactivate property listings with title, description, complete address, neighborhood, total rooms, and property type (apartment, house, condo).
* **FR-2.2:** Listers shall be able to add individual room details: monthly rent, security deposit, room dimensions/type (private, shared, ensuite), availability date, and specific house rules.
* **FR-2.3:** Listers shall be able to upload multiple images for properties and rooms with client-side preview and server-side file validation.
* **FR-2.4:** Seekers shall be able to search listings using multi-parameter filters: city, budget range, room type, availability date, furnished status, pet policy, and specific amenities (Wi-Fi, AC, laundry, parking).
* **FR-2.5:** Seekers shall be able to bookmark properties to their personal Favorites list.

### 5.3 Module 3: Roommate Matching & Compatibility
* **FR-3.1:** The system shall calculate a mathematical baseline compatibility score (0–100%) between prospective roommates using multidimensional lifestyle vector comparisons.
* **FR-3.2:** The matching engine shall weight compatibility based on critical non-negotiable filters (e.g., smoking, pet allergies) and negotiable preference dimensions.
* **FR-3.3:** The system shall display an explainable breakdown for every compatibility score, highlighting specific **Strength Factors** (e.g., matching sleep schedules, shared study routines) and **Potential Friction Points** (e.g., differing guest frequency).
* **FR-3.4:** Seekers shall be able to browse and filter roommate candidates by university, workplace, budget, target move-in date, and compatibility threshold.

### 5.4 Module 4: Trust & Safety
* **FR-4.1:** Users shall be able to upload identification documents (student ID, employment verification, or government ID) to request a verified badge.
* **FR-4.2:** The system shall assign trust badges upon admin approval and display verification status on user profiles and listings.
* **FR-4.3:** Users shall be able to report suspicious listings, deceptive pricing, or abusive users with evidence descriptions.
* **FR-4.4:** Users shall be able to block other users, immediately preventing mutual chat and hiding profile visibility.
* **FR-4.5:** The system shall flag listings with abnormal price-to-location ratios or duplicate images for admin inspection.

### 5.5 Module 5: Communication
* **FR-5.1:** Authenticated users shall be able to send real-time or near-real-time text messages to prospective roommates and property listers.
* **FR-5.2:** The communication module shall support conversation listing, unread message badges, and delivery timestamps.
* **FR-5.3:** The system shall provide in-app notification alerts for incoming messages, match suggestions, chore assignments, bill deadlines, and AI household insights.

### 5.6 Module 6: Household Management & Operations
* **FR-6.1:** A user shall be able to establish a new Household entity and invite members using a unique 8-character invitation code.
* **FR-6.2:** Household members shall be able to record shared expenses (title, category, total amount, payer, split participants, receipt notes).
* **FR-6.3:** The system shall automatically compute who owes whom, maintaining a running debt-minimization ledger.
* **FR-6.4:** Members shall be able to log manual payment settlements (e.g., "Paid $45 via bank transfer"), updating outstanding balances accordingly.
* **FR-6.5:** Household admins shall be able to configure recurring monthly bills (rent, Wi-Fi, electricity, water) with assigned due dates.
* **FR-6.6:** The system shall support a collaborative Chore Management board featuring recurring schedules, rotational assignments, due dates, and completion check-offs.
* **FR-6.7:** The system shall provide a Shared Household Inventory checklist for communal supplies (toilet paper, cleaning soap, cooking oil) with low-stock alerts.
* **FR-6.8:** The system shall support an official Move-Out workflow, archiving financial balances, releasing chore responsibilities, and initiating replacement search.

---

## 6. Core AI Features & Intelligence Layer

RoomiLink AI features eight specialized AI capabilities powered by an LLM API through an orchestrated service layer. Every AI output is accompanied by explainable justifications and strictly requires user consent.

```
+---------------------------------------------------------------------------------+
|                       RoomiLink AI Intelligence Suite                           |
|                                                                                 |
|  [Pre-Move-In Phase]                                                            |
|  ├── 1. Living Simulation           ──► Decision scenario profiling             |
|  ├── 2. Future Conflict Predictor   ──► Pre-move-in friction forecasting        |
|  └── 3. Agreement Generator         ──► Custom conflict-preventing house rules  |
|                                                                                 |
|  [Active Co-Living Phase]                                                       |
|  ├── 4. Behavior Drift Detector     ──► 2-6 month lifestyle change detection    |
|  ├── 5. Change Impact Engine        ──► Simulation of proposed lifestyle shifts |
|  ├── 6. Unspoken Problem Detector   ──► Detection of recurring micro-frictions  |
|  └── 7. Contribution Calculator     ──► Visible & invisible labor balancing     |
|                                                                                 |
|  [Transition Phase]                                                             |
|  └── 8. Replacement Matching        ──► Whole-household compatibility matching  |
+---------------------------------------------------------------------------------+
```

### 6.1 Feature 1: Living Simulation
* **Real-Life Problem:** Static profile survey answers capture idealized self-perceptions rather than actual behavior under domestic stress.
* **What It Does:** Presents interactive decision scenarios to prospective roommates (e.g., *"Your roommate left dirty dishes in the sink for 3 days before their final exam. How do you respond?"*). Analyzes decision patterns to build an authentic behavioral profile that refines compatibility matching beyond superficial survey responses.
* **Inputs:** Scenario choices, behavioral reaction selections, past conflict resolution history.
* **Outputs:** Behavioral archetype summary, stress-response index, refined compatibility adjustment score.

### 6.2 Feature 2: Future Conflict Predictor
* **Real-Life Problem:** Roommates often feel completely compatible during initial conversations, only to discover fundamental lifestyle friction after signing a lease.
* **What It Does:** Performs a pairwise multidimensional lifestyle analysis between two prospective roommates, identifying latent friction points (e.g., disparate sleep schedules combined with light sleeping, disparate hygiene standards in shared bathrooms).
* **Inputs:** Candidate profile A, candidate profile B, simulation results, work schedules.
* **Outputs:** Top 3 predicted conflict domains, risk severity ratings (Low/Medium/High), root-cause explanations, and recommended pre-move-in interview questions.

### 6.3 Feature 3: Living Agreement Generator
* **Real-Life Problem:** Most flatmates rely on vague, unwritten verbal agreements that quickly lead to misunderstandings and resentment.
* **What It Does:** Synthesizes identified conflict risks, user lifestyle habits, and house rules into an actionable, tailored, plain-English Digital Living Agreement with specific clauses for quiet hours, guest stays, chore rotations, shared food policies, and notice periods.
* **Inputs:** Predicted conflicts, household preferences, property lister constraints.
* **Outputs:** Structured, editable, clause-by-clause Living Agreement with digital acceptance toggles for all household members.

### 6.4 Feature 4: Behavior Drift Detector
* **Real-Life Problem:** A roommate who was quiet and tidy during month 1 begins working late night shifts, leaving dishes, or hosting guests continuously by month 4.
* **What It Does:** Periodically compares the baseline living agreement and initial preferences against empirical household logs over a 2–6 month window (delayed chore completions, expense timing, check-in updates).
* **Inputs:** Original living agreement baseline, recent 60–90 day chore logs, expense logs, user check-in feedback.
* **Outputs:** Behavioral drift alert, specific dimension delta (e.g., *Cleanliness adherence shifted by -35%*), and suggested diplomatic discussion prompts.

### 6.5 Feature 5: Household Change Impact Engine
* **Real-Life Problem:** One roommate decides to adopt a dog, start a night shift job, or host a partner 5 nights a week without understanding how it ripples across the household.
* **What It Does:** Simulates the systemic consequence of a proposed lifestyle change on every member of the household before it is enacted.
* **Inputs:** Proposed change parameters (type, timing, frequency), combined household profile, physical space constraints.
* **Outputs:** Per-member impact score, categorized impact matrix (noise impact, utility cost impact, bathroom scheduling impact), overall household friction risk, and mitigating compromise suggestions.

### 6.6 Feature 6: Unspoken Problem Detector
* **Real-Life Problem:** Roommates often avoid speaking up about recurring petty annoyances (e.g., loud TV at midnight, unemptied recycling bins) until built-up frustration triggers a blowup.
* **What It Does:** Allows members to confidentially log small, voluntary recurring observations. Analyzes date, category, and sentiment patterns over time to detect quiet micro-friction trends before escalation.
* **Inputs:** Anonymized/confidential micro-issue logs with timestamps, category tags, and optional brief notes.
* **Outputs:** Household pattern flags, recurring root cause identification, and gentle, non-accusatory group mediation prompts.

### 6.7 Feature 7: Contribution Calculator
* **Real-Life Problem:** Household friction frequently stems from invisible, unacknowledged mental and physical labor (buying cleaning supplies, coordinating maintenance, organizing the fridge).
* **What It Does:** Calculates a holistic, weighted effort score combining both visible tasks (completed chore points, direct financial expense payments) and invisible tasks (errands, supply tracking, coordination).
* **Inputs:** Chore completion points, logged errands, supply inventory restocking records, financial contributions.
* **Outputs:** Fair-Share Contribution Report showing relative workload balance, invisible labor recognition, and automated rebalancing recommendations.

### 6.8 Feature 8: Household Replacement Matching
* **Real-Life Problem:** When one roommate moves out mid-lease, a replacement is often chosen who matches one person but clashes with the rest of the flat.
* **What It Does:** Evaluates prospective replacement candidates against the **composite profile of the entire surviving household**, ensuring compatibility with existing rules, shared rhythms, and group culture.
* **Inputs:** Combined household profile, active living agreement, surviving member preferences, applicant candidate pool.
* **Outputs:** Ranked candidate list with whole-household compatibility scores, group harmony impact ratings, and candidate-by-candidate pros and cons.

---

## 7. Requirement Prioritization (MoSCoW Matrix)

```
+-----------------------------------------------------------------------------------+
|                        Feature Prioritization Breakdown                           |
|                                                                                   |
|  [MUST HAVE - P0]         [SHOULD HAVE - P1]            [NICE TO HAVE - P2]       |
|  ├── User Auth & Profile  ├── Living Simulation         ├── Map Transit Search    |
|  ├── Room Search/Filters  ├── Behavior Drift Detector   ├── Live Video Tours      |
|  ├── Roommate Matching    ├── Change Impact Engine      ├── Payment Gateway (UPI) |
|  ├── Verification Flow    ├── Unspoken Problem Detector ├── Smart IoT Sync        |
|  ├── Direct Messaging     ├── Contribution Calculator   └── Native Mobile Apps    |
|  ├── Household Core       ├── Replacement Matching                                |
|  ├── Conflict Predictor   └── Notification System                                 |
|  └── Agreement Generator                                                          |
+-----------------------------------------------------------------------------------+
```

### 7.1 Must Have (P0 — Core MVP Deliverables)
* Secure user authentication (email/password, hashed storage, JWT tokens).
* User profiles with lifestyle preferences across 8 core dimensions.
* Room and property listing management with search and multi-criteria filters.
* Algorithmic roommate compatibility scoring with explainable rationale.
* ID/document verification submission and trust status display.
* Direct in-app messaging between users.
* Household workspace: member roster, rent split, shared expense ledger, chore assignment.
* Future Conflict Predictor (AI Feature 2).
* Living Agreement Generator (AI Feature 3).
* Basic administrative moderation panel.

### 7.2 Should Have (P1 — Full Living Journey Experience)
* Living Simulation interactive scenario tool (AI Feature 1).
* Behavior Drift Detector analyzing 2–6 month activity logs (AI Feature 4).
* Household Change Impact Engine for proposed lifestyle adjustments (AI Feature 5).
* Unspoken Problem Detector for private micro-issue trend analysis (AI Feature 6).
* Contribution Calculator for visible and invisible labor scoring (AI Feature 7).
* Household Replacement Matching for whole-household compatibility (AI Feature 8).
* In-app notification center for automated household alerts.
* Image upload management with file-type and file-size validation.

### 7.3 Nice to Have (P2 — Future Enhancements)
* Integrated payment gateway for automated rent and utility collection (e.g., Stripe, UPI).
* Interactive map search showing real-time public transit commute times.
* Native mobile applications built with React Native for iOS and Android.
* Automated optical character recognition (OCR) for identity documents and utility receipts.
* Real-time voice and video calls within chat threads.
* Smart home IoT integration (smart plugs, noise sensors, lock pins).

---

## 8. Non-Functional Requirements

### 8.1 Usability & Accessibility
* **NFR-1.1:** The user interface shall be responsive, offering fluid experiences across desktop (1920x1080 down to 1280x720) and mobile viewports (375px to 430px width).
* **NFR-1.2:** The web interface shall adhere to **WCAG 2.1 Level AA** accessibility standards, ensuring high-contrast color ratios (>4.5:1), keyboard navigability, semantic HTML tags, and accessible ARIA attributes.
* **NFR-1.3:** Navigation hierarchies shall be intuitive, allowing users to accomplish primary actions (search rooms, view match reasons, log an expense, complete a chore) in 3 clicks or fewer from their dashboard.

### 8.2 Security, Privacy & Data Protection
* **NFR-2.1:** Passwords shall be securely hashed using modern cryptographic algorithms (PBKDF2 or bcrypt) with random salts; plain-text passwords shall never be persisted or logged.
* **NFR-2.2:** API endpoints shall enforce strict Role-Based Access Control (RBAC). Private household records (expenses, agreements, micro-issues) shall only be visible to verified members of that specific household.
* **NFR-2.3:** User uploaded files (images, verification documents) shall undergo MIME-type validation, size limits (max 5MB), randomized file renaming, and secure storage isolation.
* **NFR-2.4:** All sensitive secrets, database connection strings, and LLM API keys shall be managed strictly via environment variables and excluded from version control.
* **NFR-2.5:** The platform shall enforce **explicit user consent** prior to passing any user or household data to external LLM APIs, providing easy opt-out toggles and complete data erasure capabilities.
* **NFR-2.6:** Protection against standard web vulnerabilities (CSRF, XSS, SQL Injection via ORM parameterization, CORS restrictions) shall be active across all routes.

### 8.3 Performance & Scalability
* **NFR-3.1:** Standard page loads and dashboard navigation shall complete within **3 seconds** under normal broadband and 4G connections.
* **NFR-3.2:** Room and roommate search queries shall return filtered results within **2 seconds** via indexed database queries and pagination.
* **NFR-3.3:** AI analysis requests shall return formatted responses within **10 seconds**. During processing, UI loading indicators with informative skeleton states shall be displayed.
* **NFR-3.4:** The prototype architecture shall support at least **100 concurrent active users** without database degradation or unhandled request drops.

### 8.4 Reliability & Fallback Behavior
* **NFR-4.1:** AI service failures (rate limit breaches, API timeouts, invalid LLM JSON output) must never crash the application or prevent core functionality.
* **NFR-4.2:** In the event of an AI service outage, the backend shall gracefully fall back to algorithmic heuristics (e.g., mathematical vector distance, standard house agreement templates) while displaying a clear advisory message to the user.

### 8.5 Explainability
* **NFR-5.1:** Every AI-generated output (compatibility scores, conflict forecasts, drift warnings, impact simulations) must display clear, plain-English rationales, avoiding cryptic black-box scores.

---

## 9. Technology Stack

RoomiLink AI adopts a clean, decoupled full-stack architecture tailored for high responsiveness, maintainability, and modularity:

| Layer | Selected Technology | Architecture & Justification |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (React, TypeScript, CSS)** | Modern, modular client-side application with App Router, responsive design, fast component rendering, and seamless API integration. |
| **Backend** | **Python (Flask)** | Lightweight, highly modular REST API service using Flask Blueprints, service-oriented business logic, and clean separation of concerns. |
| **Database** | **MySQL 8.0 (SQLAlchemy ORM)** | Robust relational database ensuring ACID compliance, relational integrity across 24 entities, and rapid indexed search. (*SQLite supported for zero-config local prototyping*). |
| **AI / LLM** | **LLM API (OpenAI / Anthropic / Gemini Compatible)** | Hosted LLM API accessed via a dedicated Python service layer featuring prompt engineering, JSON schema validation, timeouts, retries, and rule-based fallback. |
| **Version Control** | **Git & GitHub** | Feature-branch development workflow, automated gitignore hygiene, and collaborative issue tracking. |

> **Note on Architecture Evolution:**  
> The early conceptual proposal in the documentation explored a Python-only server-rendered UI (Flask + Jinja2 without JavaScript). To meet modern user expectations for interactive dashboards, dynamic roommate matching sliders, real-time expense calculations, and asynchronous AI status indicators, the system architecture has been definitively standardized on a **Next.js frontend communicating via REST APIs with a Python Flask backend**.

---

## 10. Summary Matrix

| Metric / Dimension | Project Specification |
| :--- | :--- |
| **Project Name** | RoomiLink AI |
| **Core Value** | Beyond finding a room: building and sustaining compatible shared living. |
| **Target Audience** | Students, working professionals, relocators, property listers. |
| **Primary Frontend** | Next.js 14+ (TypeScript / React / CSS) |
| **Primary Backend** | Python 3.10+ (Flask RESTful API, Flask-SQLAlchemy, Flask-JWT-Extended) |
| **Primary Database** | MySQL 8.0 (24 structured relational tables) |
| **AI Integration** | LLM API with structured prompt engineering & deterministic JSON parsing |
| **Key AI Capabilities** | 8 distinct modules (Simulation, Conflicts, Agreements, Drift, Impact, Problems, Contributions, Replacements) |
| **Trust Mechanisms** | Multi-tier verification badges, fraud flags, user blocking, admin audit |
| **Operating System** | Cross-platform (developed on Windows 10/11, deployable on Linux/Cloud) |
