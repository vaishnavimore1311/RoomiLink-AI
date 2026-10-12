# RoomiLink AI — Repository Folder Structure

> **Modular Full-Stack Project Structure for Next.js (Frontend) and Python Flask (Backend)**  
> *Clear Separation of Concerns, Maintainable Code Architecture, and Documented Component Responsibilities*

---

## 1. Complete Directory Tree

The following directory tree outlines the organization of the **RoomiLink AI** repository. It cleanly decouples the client-side Next.js application from the Python Flask backend REST API, while centralizing documentation and configuration at the project root.

```text
RoomiLink-AI/
├── frontend/
│   ├── app/                                # Next.js 14+ App Router (pages & layouts)
│   │   ├── layout.tsx                      # Root application layout with navigation & providers
│   │   ├── page.tsx                        # Public landing page (Hero, features, CTA)
│   │   ├── login/                          # Login view
│   │   │   └── page.tsx
│   │   ├── register/                       # Registration view
│   │   │   └── page.tsx
│   │   ├── onboarding/                     # Profile & lifestyle preferences onboarding wizard
│   │   │   └── page.tsx
│   │   ├── dashboard/                      # Authenticated user personal dashboard
│   │   │   └── page.tsx
│   │   ├── rooms/                          # Property & room discovery
│   │   │   ├── page.tsx                    # Search, filters, grid & list view
│   │   │   ├── [id]/                       # Room / property detail page
│   │   │   │   └── page.tsx
│   │   │   └── new/                        # Lister property creation form
│   │   │       └── page.tsx
│   │   ├── roommates/                      # Roommate compatibility matching
│   │   │   ├── page.tsx                    # Browse candidates, filter by habit & compatibility
│   │   │   └── [id]/                       # Roommate profile & explainable score breakdown
│   │   │       └── page.tsx
│   │   ├── messages/                       # Direct messaging & conversation threads
│   │   │   ├── page.tsx                    # Message inbox & thread view
│   │   │   └── [id]/page.tsx
│   │   ├── household/                      # Shared living management workspace
│   │   │   ├── page.tsx                    # Shared home overview & member roster
│   │   │   ├── expenses/                   # Shared expenses, split bill calculation & settlements
│   │   │   │   └── page.tsx
│   │   │   ├── chores/                     # Rotational chore board & contribution meter
│   │   │   │   └── page.tsx
│   │   │   ├── inventory/                  # Communal supplies checklist & stock alerts
│   │   │   │   └── page.tsx
│   │   │   ├── agreement/                  # Digital living agreement draft & sign-off
│   │   │   │   └── page.tsx
│   │   │   └── insights/                   # AI behavior drift, impact engine & harmony alerts
│   │   │       └── page.tsx
│   │   └── admin/                          # Administrative moderation dashboard
│   │       ├── page.tsx                    # Overview & moderation statistics
│   │       ├── verifications/              # User & lister ID document review queue
│   │       │   └── page.tsx
│   │       └── reports/                    # Flagged listings & abuse moderation
│   │           └── page.tsx
│   ├── components/                         # Modular, reusable React UI components
│   │   ├── ui/                             # Base design system primitives (buttons, modals, inputs)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Slider.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── layout/                         # Structural layout components
│   │   │   ├── Navbar.tsx                  # Top navigation with user dropdown & unread badges
│   │   │   ├── Footer.tsx                  # Standard platform footer
│   │   │   └── HouseholdSidebar.tsx        # Persistent sidebar navigation for household tools
│   │   ├── rooms/                          # Domain components for property discovery
│   │   │   ├── RoomCard.tsx
│   │   │   ├── RoomFilters.tsx
│   │   │   └── ImageGallery.tsx
│   │   ├── roommates/                      # Domain components for matching
│   │   │   ├── RoommateCard.tsx
│   │   │   ├── CompatibilityScoreBadge.tsx
│   │   │   └── MatchExplanationModal.tsx
│   │   ├── household/                      # Domain components for co-living operations
│   │   │   ├── ExpenseItem.tsx
│   │   │   ├── AddExpenseModal.tsx
│   │   │   ├── DebtSummaryCard.tsx
│   │   │   ├── ChoreItem.tsx
│   │   │   ├── ContributionBarChart.tsx
│   │   │   └── AgreementClauseViewer.tsx
│   │   └── ai/                             # Specialized UI components for AI interactions
│   │       ├── ConflictPredictionCard.tsx
│   │       ├── ChangeImpactSimulator.tsx
│   │       ├── DriftAlertBanner.tsx
│   │       └── AISpinner.tsx
│   ├── lib/                                # Core utilities, constants & helper functions
│   │   ├── api.ts                          # Central Axios / Fetch HTTP client with interceptors
│   │   ├── constants.ts                    # Global application constants & route mappings
│   │   └── utils.ts                        # Formatting helpers (currency, date, text helpers)
│   ├── services/                           # Client-side API service abstraction layer
│   │   ├── authService.ts                  # Authentication & user profile API calls
│   │   ├── roomService.ts                  # Rooms & property query API calls
│   │   ├── matchingService.ts              # Compatibility & recommendation API calls
│   │   ├── chatService.ts                  # Direct messaging API calls
│   │   ├── householdService.ts             # Household, expense & chore API calls
│   │   └── aiService.ts                    # AI generation, simulation & drift API calls
│   ├── hooks/                              # Custom React hooks for shared state & lifecycle
│   │   ├── useAuth.ts                      # Current user context, permissions & logout
│   │   ├── useHousehold.ts                 # Active household state, members & debts
│   │   ├── useDebounce.ts                  # Search input debouncer
│   │   └── useNotifications.ts             # In-app notifications & polling listener
│   ├── types/                              # TypeScript interface & type definitions
│   │   ├── auth.ts                         # User, Profile, AuthTokens, Role types
│   │   ├── room.ts                         # Property, Room, Amenity types
│   │   ├── matching.ts                     # RoommatePreference, MatchResult, Score types
│   │   ├── household.ts                    # Household, Member, Expense, Chore, Bill types
│   │   └── ai.ts                           # ConflictPrediction, ImpactResult, DriftAlert types
│   ├── public/                             # Static public web assets
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── images/                         # Illustrations, fallback avatars & empty states
│   ├── package.json                        # Frontend NPM dependencies & execution scripts
│   ├── tsconfig.json                       # TypeScript compiler configuration
│   └── .env.example                        # Template for client-side environment variables
├── backend/
│   ├── app/                                # Core Flask application package
│   │   ├── __init__.py                     # Application factory (`create_app`), extensions init
│   │   ├── routes/                         # REST API route controllers (Flask Blueprints)
│   │   │   ├── __init__.py
│   │   │   ├── auth_routes.py              # `/api/v1/auth`: login, register, profile, consent
│   │   │   ├── room_routes.py              # `/api/v1/rooms`: listings, filters, favorites, uploads
│   │   │   ├── matching_routes.py          # `/api/v1/matching`: candidates, scores, simulations
│   │   │   ├── chat_routes.py              # `/api/v1/chat`: conversations, messages, read states
│   │   │   ├── household_routes.py         # `/api/v1/household`: expenses, bills, chores, roster
│   │   │   ├── ai_routes.py                # `/api/v1/ai`: conflict predictor, agreement, drift
│   │   │   └── admin_routes.py             # `/api/v1/admin`: verifications, reports, audit logs
│   │   ├── models/                         # SQLAlchemy declarative database entity models
│   │   │   ├── __init__.py
│   │   │   ├── user_models.py              # User, Profile, RoommatePreference, Verification
│   │   │   ├── property_models.py          # Property, Room, Favorite, Message, Match
│   │   │   ├── household_models.py         # Household, Member, Expense, Bill, Payment, Chore
│   │   │   └── ai_models.py                # Conflict, Contribution, LifestyleChange, Agreement
│   │   ├── services/                       # Business logic domain services (Python classes)
│   │   │   ├── __init__.py
│   │   │   ├── matching_service.py         # Multi-attribute lifestyle compatibility algorithm
│   │   │   ├── expense_service.py          # Expense split math, debt simplification algorithms
│   │   │   ├── chore_service.py            # Rotational scheduler & invisible labor calculator
│   │   │   └── notification_service.py     # System alert dispatching & status tracking
│   │   ├── ai/                             # Dedicated AI orchestration & LLM integration layer
│   │   │   ├── __init__.py
│   │   │   ├── llm_client.py               # Robust client wrapper with timeouts, retries & JSON mode
│   │   │   ├── prompts.py                  # Structured system & user prompt templates
│   │   │   ├── conflict_predictor.py       # Pre-move-in friction analysis pipeline
│   │   │   ├── agreement_generator.py      # Living agreement synthesis & clause generator
│   │   │   ├── drift_detector.py           # 60-90 day empirical routine shift detector
│   │   │   ├── impact_engine.py            # Systemic simulation of proposed lifestyle changes
│   │   │   ├── unspoken_detector.py        # Micro-friction pattern analysis engine
│   │   │   └── fallbacks.py                # Deterministic rule-based heuristic fallback algorithms
│   │   └── utils/                          # Common backend utility helpers
│   │       ├── __init__.py
│   │       ├── security.py                 # Password hashing, JWT decorators, RBAC checks
│   │       ├── validators.py               # Request schema sanitization & input validation
│   │       └── uploads.py                  # Secure image upload handler, MIME validation
│   ├── tests/                              # Comprehensive backend test suite (Pytest)
│   │   ├── conftest.py                     # Test fixtures (test client, in-memory DB, auth tokens)
│   │   ├── test_auth.py                    # Unit & integration tests for authentication & roles
│   │   ├── test_matching.py                # Tests for compatibility algorithms & weights
│   │   ├── test_household.py               # Tests for expense splitting & chore rotations
│   │   └── test_ai_services.py             # Tests for prompt assembly, JSON parsing & fallback
│   ├── config.py                           # Application configurations (Development, Testing, Prod)
│   ├── run.py                              # Backend application execution entry point
│   ├── requirements.txt                    # Python dependencies & libraries
│   └── .env.example                        # Template for backend environment variables
├── docs/                                   # Centralized project documentation
│   ├── project-requirements.md             # Functional & non-functional requirements document
│   ├── architecture.md                     # System architecture, schemas, and diagrams
│   ├── user-stories.md                     # Agile user stories with acceptance criteria
│   ├── folder-structure.md                 # Project directory layout and design rationale (this file)
│   └── design.md                           # UI/UX design specifications, tokens, and page flows
├── .gitignore                              # Git exclusion rules (node_modules, venv, secrets, logs)
└── README.md                               # Primary project introduction and quick-start guide
```

---

## 2. Directory Rationale & Component Responsibilities

### 2.1 Root Level Files
* **`.gitignore`:** Ensures sensitive API keys, local database files (`*.sqlite`, `*.db`), virtual environments (`.venv/`, `venv/`), Node dependencies (`node_modules/`, `.next/`), and build artifacts are strictly excluded from version control.
* **`README.md`:** The entry point for developers and evaluators, providing an overview, technical stack, setup steps for Windows, environment instructions, and architecture summaries.
* **`docs/`:** Houses the complete architectural, functional, design, and user story blueprints in structured markdown files, avoiding clutter in the source code directories.

---

### 2.2 Frontend Architecture (`frontend/`)

The frontend is built using Next.js 14+ with App Router, providing a responsive client experience that communicates cleanly with the Flask backend.

#### `frontend/app/` (Pages & Layouts)
* **`layout.tsx`:** The root template wrapping all pages, injecting global navigation, footer, metadata, and theme styling.
* **`page.tsx`:** The public landing page showcasing the RoomiLink AI mission, key differentiators, feature previews, and call-to-action buttons.
* **`login/` & `register/`:** User authentication screens with client-side form validation.
* **`onboarding/`:** Step-by-step wizard guiding new users through completing their lifestyle preference vectors (sleep, hygiene, noise, pets, budget).
* **`dashboard/`:** The personalized hub displaying active roommate matches, assigned chores for the day, outstanding balance summaries, and notification badges.
* **`rooms/`:** Discovery catalog allowing users to search, filter, and inspect room listings, as well as create listings (`rooms/new`).
* **`roommates/`:** Match exploration directory displaying candidate compatibility cards, explainable match breakdown modals, and simulation triggers.
* **`messages/`:** Direct messaging interface with a responsive two-column conversation list and message stream.
* **`household/`:** The co-living management suite with dedicated sub-views for expenses, chores, inventory, living agreements, and AI insights.
* **`admin/`:** Restricted portal for platform administrators to verify ID documents and review reported content.

#### `frontend/components/` (Reusable React Components)
* **`ui/`:** Base design system primitives (Button, Modal, Input, Badge, Slider, Skeleton) adhering to strict accessibility guidelines.
* **`layout/`:** Global navigational elements (Navbar, Footer, HouseholdSidebar) ensuring consistent page hierarchies.
* **Domain Components (`rooms/`, `roommates/`, `household/`, `ai/`):** Self-contained, domain-specific UI components encapsulating visual presentation and user interactions.

#### `frontend/services/` & `frontend/lib/`
* **`services/`:** Client-side API abstraction layer. UI components never make direct `fetch()` calls; instead, they invoke typed functions (e.g., `householdService.getExpenses()`).
* **`lib/api.ts`:** Central Axios/Fetch client configured with base URL, timeout settings, and automatic JWT bearer token header injection.

---

### 2.3 Backend Architecture (`backend/`)

The backend is built with Python Flask using modular blueprints, a dedicated service layer, and a structured AI integration package.

#### `backend/app/routes/` (Flask Blueprints)
Routes remain deliberately thin, serving only to parse incoming JSON request parameters, validate credentials via JWT decorators, call the appropriate domain service, and return standard JSON response envelopes.
* **`auth_routes.py`:** Handles `/api/v1/auth` endpoints (registration, login, refresh, user profile, AI consent toggles).
* **`room_routes.py`:** Handles `/api/v1/rooms` endpoints (property and room CRUD, photo uploads, search queries).
* **`matching_routes.py`:** Handles `/api/v1/matching` endpoints (compatibility scoring, match filtering, scenario simulation).
* **`chat_routes.py`:** Handles `/api/v1/chat` endpoints (conversation lists, message retrieval, message posting).
* **`household_routes.py`:** Handles `/api/v1/household` endpoints (member roster, expense splits, payment settlements, chores, inventory, move-outs).
* **`ai_routes.py`:** Handles `/api/v1/ai` endpoints (conflict predictions, living agreement generation, drift detection, impact simulation).
* **`admin_routes.py`:** Handles `/api/v1/admin` endpoints (document verification, content moderation, user suspensions).

#### `backend/app/models/` (SQLAlchemy Entities)
Declares the database schema across 24 relational tables organized into cohesive modules (`user_models.py`, `property_models.py`, `household_models.py`, `ai_models.py`). Each model enforces strict foreign keys, indexing on queried fields (such as city, rent, user_id), and automated timestamps.

#### `backend/app/services/` (Domain Business Logic)
Encapsulates all calculations, database updates, and non-AI algorithms:
* **`matching_service.py`:** Computes multi-attribute lifestyle distance matrices across sleep, cleanliness, guests, and noise.
* **`expense_service.py`:** Executes equal and custom expense splits and resolves multi-party debt graphs.
* **`chore_service.py`:** Handles weekly task rotations and computes visible and invisible household effort metrics.
* **`notification_service.py`:** Dispatches in-app notifications and manages unread counters.

#### `backend/app/ai/` (AI Orchestration & LLM Integration)
Centralizes all LLM interactions, prompt templates, and fallback safety nets:
* **`llm_client.py`:** Wrapper communicating with external LLM APIs (OpenAI / Gemini / Anthropic) enforcing an explicit **10-second timeout**, exponential retries, and JSON output mode.
* **`prompts.py`:** Deterministic, tested prompt templates containing explicit schema instructions and few-shot examples.
* **`conflict_predictor.py`:** Analyzes candidate profile differences to forecast pre-move-in friction areas.
* **`agreement_generator.py`:** Synthesizes household preferences and friction risks into a clause-by-clause living agreement.
* **`drift_detector.py`:** Compares baseline agreement expectations against 60–90 day empirical logs to identify behavioral drift.
* **`impact_engine.py`:** Simulates the ripple effect of proposed lifestyle changes on noise, shared space, and routines.
* **`unspoken_detector.py`:** Discovers recurring micro-friction trends from voluntary user logs.
* **`fallbacks.py`:** Contains deterministic, rule-based algorithmic fallbacks ensuring the platform continues operating smoothly even if external AI APIs encounter rate limits or timeouts.

#### `backend/app/utils/`
* **`security.py`:** Contains password hashing functions and role-based access control decorators (`@jwt_required`, `@role_required`).
* **`validators.py`:** Validates incoming JSON payloads and prevents malformed requests.
* **`uploads.py`:** Verifies image extensions, enforces size caps (<5MB), and sanitizes filenames.

#### `backend/tests/` (Pytest Suite)
Comprehensive automated test suite covering authentication, matching logic, expense splits, chore rotations, and AI service fallback handling.

---

## 3. Separation of Concerns & Clean Code Guarantees

1. **No Mixed UI and Backend Logic:** The frontend and backend run as independent applications communicating solely via documented RESTful APIs.
2. **Thin Controllers, Thick Services:** Route handlers in `backend/app/routes/` do not execute business calculations or raw database queries directly; they delegate all logic to `backend/app/services/`.
3. **Resilient AI Layer:** The AI layer (`backend/app/ai/`) is decoupled from core database entities through service interfaces. If an external AI provider goes offline, the fallback engine engages automatically without disrupting core platform features.
4. **Zero Duplicate Documentation:** All specifications, architecture designs, user stories, and requirements are centralized in `docs/` and referenced cleanly from the root `README.md`.
